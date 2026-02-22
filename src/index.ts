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
import { ErrorAJV } from "./utils/errorAJV";

export {
  ErrorAJV,
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
type TValidators<V> = {
  [K in keyof V]: V[K] extends JSONSchemaType<infer T> ? T : any;
};
type TCombinedEvent<TEvent, TValidator> = Omit<TEvent, keyof TValidator> &
  TValidators<TValidator>;

type TInterface<T> = { __type: T };
export const Use = <T>(): TInterface<T> => ({}) as any;

interface HandlerConfig<TEvent = any, TResult = any, TValidators = TSchemaMap> {
  event?: TInterface<TEvent>;
  result?: TInterface<TResult>;
  validators?: TValidators;
  ajvConfig?: Options;
  customResponse?: (data: any) => TResult;
  errorHandler?: (error: any) => any;
}

export const errorHandler = (error: ErrorAJV): APIGatewayProxyResult => {
  const isValidationError = error instanceof ErrorAJV;
  console.error(error);

  const response = {
    error: {
      ...(isValidationError
        ? {
            type: "ValidationException",
            message: "Invalid request parameters",
            details: error.details?.map((err) => {
              return {
                location: error.location,
                field: err.instancePath.replace(/^\//, "") || "root",
                rule: err.keyword,
                message: err.message,
              };
            }),
          }
        : { type: "InternalServerException", message: "Unknow Error" }),
    },
  };

  const statusCode = error.statusCode ?? 500;

  return {
    statusCode,
    body: JSON.stringify(response),
    headers: {
      "Content-Type": HEADER_TYPE_JSON,
    },
  };
};

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
  const validators: {
    n: string; // name
    v: ValidateFunction; // validate function
    p: boolean; // isParse
  }[] = [];
  const ajv = new Ajv(options.ajvConfig);
  addFormats(ajv);

  if (options.validators) {
    for (const [key, schema] of Object.entries(options.validators)) {
      const v = ajv.compile(schema);
      validators.push({ n: key, p: key === "body", v });
    }
  }

  const errorCb = options.errorHandler ?? errorHandler;
  const customResponse = options.customResponse ?? responseJSON<TResult>;

  return async (rawEvent: TEvent, context?: Context): Promise<TResult> => {
    try {
      const overrides: any = {};
      for (const { n: name, v: validate, p: isParse } of validators) {
        if (isParse) {
          const body = getBody(rawEvent as APIGatewayProxyEvent);
          overrides[name] = body;
        } else {
          overrides[name] = (rawEvent as Record<string, any>)[name];
        }

        const valid = validate(overrides[name]);
        if (!valid) {
          throw new ErrorAJV(name, validate.errors);
        }
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
