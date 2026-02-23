import { type Options, type JSONSchemaType, Ajv, ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import type {
  APIGatewayProxyEvent,
  Context,
  APIGatewayProxyResult,
} from "aws-lambda";

import {
  getBody,
  HEADER_TYPE_JSON,
  HEADER_TYPE_HTML,
  HEADER_TYPE_OCTET,
  HEADER_TYPE_PLAIN,
  responseJSON,
  responseHTML,
  responseMediaFile,
  responseRedirect,
} from "./utils/apigateway";
import { AJVError, errorHandler, EventError } from "./errors";

export {
  getBody,
  AJVError,
  EventError,
  errorHandler,
  responseJSON,
  responseHTML,
  responseMediaFile,
  responseRedirect,
  HEADER_TYPE_JSON,
  HEADER_TYPE_HTML,
  HEADER_TYPE_OCTET,
  HEADER_TYPE_PLAIN,
};

type TSchemaMap = Record<string, any>;

type TInterface<T> = { __type: T };
export const Use = <T>(): TInterface<T> => ({}) as any;

type TExtractContract<C> = {
  [K in keyof C]: C[K] extends TInterface<infer T> ? T : any;
};

type TExtractValidator<V> = {
  [K in keyof V]: V[K] extends JSONSchemaType<infer T> ? T : any;
};

type TCombinedEvent<TEvent, TContracts, TValidators> = Omit<
  TEvent,
  keyof TValidators | keyof TContracts
> &
  TExtractContract<TContracts> &
  TExtractValidator<TValidators>;

interface HandlerConfig<
  TEvent = any,
  TResult = any,
  TContracts = TSchemaMap,
  TValidators = TSchemaMap,
> {
  event?: TInterface<TEvent>;
  result?: TInterface<TResult>;
  contracts?: TContracts;
  validators?: TValidators;
  transformers?: Record<string, (event: any) => any>;
  ajvConfig?: Options;
  customResponse?: (data: any) => TResult;
  errorHandler?: (error: any) => any;
}

export const middleware = <
  TEvent = APIGatewayProxyEvent,
  TResult = APIGatewayProxyResult,
  TContracts extends Record<string, TInterface<any>> = any,
  TValidators extends TSchemaMap = any,
>(
  handler: (
    event: TCombinedEvent<TEvent, TContracts, TValidators>,
    context?: Context,
  ) => any,
  options: HandlerConfig<TEvent, TResult, TContracts, TValidators>,
) => {
  // COLD START
  const schemaActions: {
    n: string; // name
    t: (ev: any) => any; // transformer function
    v?: ValidateFunction; // validate function
  }[] = [];

  const validatorEntries = options.validators
    ? Object.keys(options.validators)
    : [];
  const contractKeys = options.contracts ? Object.keys(options.contracts) : [];
  const allKeys = new Set([...contractKeys, ...validatorEntries]);

  let ajv: Ajv | null = null;
  if (validatorEntries.length > 0) {
    ajv = new Ajv(options.ajvConfig);
    addFormats(ajv);
  }

  for (const key of allKeys) {
    const schema = options.validators?.[key];
    const transformer = options.transformers?.[key] ?? ((ev: any) => ev[key]);

    schemaActions.push({
      n: key,
      t: transformer,
      v: ajv && schema ? ajv.compile(schema) : undefined,
    });
  }

  const errorCb = options.errorHandler ?? errorHandler;
  const customResponse = options.customResponse ?? responseJSON<TResult>;

  return async (rawEvent: TEvent, context?: Context): Promise<TResult> => {
    // RUNTIME
    try {
      const overrides: any = {};

      for (const action of schemaActions) {
        const data = action.t(rawEvent);
        if (action.v && !action.v(data)) {
          throw new AJVError(action.n, action.v.errors ?? []);
        }
        overrides[action.n] = data;
      }

      const newEvent: TCombinedEvent<TEvent, TContracts, TValidators> = {
        ...rawEvent,
        ...overrides,
      };
      const data = await handler(newEvent, context);
      return customResponse(data);
    } catch (error: any) {
      return errorCb(error);
    }
  };
};
