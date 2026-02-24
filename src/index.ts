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
type TInterface<T> = { __isContract: true; __type: T };
type Constructor<T = any> = new (...args: any[]) => T;

export const Use = <T>(): TInterface<T> =>
  ({ __isContract: true }) as unknown as TInterface<T>;

type TExtract<V> = {
  [K in keyof V]: V[K] extends TInterface<infer T>
    ? T
    : V[K] extends Constructor<infer T>
      ? T
      : V[K] extends JSONSchemaType<infer T>
        ? T
        : any;
};
type TCombinedEvent<TEvent, TValidators> = Omit<TEvent, keyof TValidators> &
  TExtract<TValidators>;

interface HandlerConfig<TEvent = any, TResult = any, TValidators = TSchemaMap> {
  event?: TInterface<TEvent>;
  result?: TInterface<TResult>;
  validators?: TValidators;
  transformers?: Record<string, (event: any) => any>;
  ajvConfig?: Options;
  customResponse?: (data: any) => TResult;
  errorHandler?: (error: any) => any;
}

export const middleware = <
  TEvent = APIGatewayProxyEvent,
  TResult = APIGatewayProxyResult,
  TValidators extends TSchemaMap = TSchemaMap,
>(
  handler: (
    event: TCombinedEvent<TEvent, TValidators>,
    context?: Context,
  ) => any,
  options: HandlerConfig<TEvent, TResult, TValidators>,
) => {
  const schemaActions: {
    n: string; // name
    t: (ev: any) => any; // transformer function
    v?: ValidateFunction; // validate function
  }[] = [];

  let ajv: Ajv | null = null;
  const validatorEntries = options.validators
    ? Object.entries(options.validators)
    : [];

  if (validatorEntries.length !== 0) {
    for (const [key, item] of validatorEntries) {
      const transformer = options.transformers?.[key] ?? ((ev: any) => ev[key]);

      const isContractObject =
        item && typeof item === "object" && "__isContract" in item;
      const isClassConstructor = typeof item === "function";
      const isContract = isContractObject || isClassConstructor;

      if (!isContract && !ajv) {
        ajv = new Ajv(options.ajvConfig);
        addFormats(ajv);
      }

      schemaActions.push({
        n: key,
        t: transformer,
        v: ajv && !isContract ? ajv.compile(item) : undefined,
      });
    }
  }

  const errorCb = options.errorHandler ?? errorHandler;
  const customResponse = options.customResponse ?? responseJSON<TResult>;

  return async (rawEvent: TEvent, context?: Context): Promise<TResult> => {
    try {
      const overrides: any = {};
      for (const action of schemaActions) {
        const data = action.t(rawEvent);
        if (action.v && !action.v(data)) {
          throw new AJVError(action.n, action.v.errors ?? []);
        }
        overrides[action.n] = data;
      }

      const newEvent: TCombinedEvent<TEvent, TValidators> = {
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
