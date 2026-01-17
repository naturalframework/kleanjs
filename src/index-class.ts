import { type Options, type JSONSchemaType, Ajv, ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import type {
  APIGatewayProxyEvent,
  Context,
  APIGatewayProxyResult,
} from "aws-lambda";

import {
  getBody,
  RESPONSE_TYPE_JSON,
  RESPONSE_TYPE_OCTET,
  RESPONSE_TYPE_PLAIN,
  transformJSON,
  transformMediaFile,
  transformText,
} from "./utils/apigateway";

type TSchemaMap = Record<string, any>;
type TMapValidators<V> = {
  [K in keyof V]: V[K] extends JSONSchemaType<infer T> ? T : any;
};
type TCombinedEvent<TEvent, TValidator> = Omit<TEvent, keyof TValidator> &
  TMapValidators<TValidator>;

const ERROR_DEFAULT = (error: any): APIGatewayProxyResult => {
  console.error(error);
  return {
    statusCode: 500,
    body: "Internal Server Error",
  };
};

interface HandlerConfig<TValidators> {
  validators?: TValidators;
  ajvConfig?: Options;
  response?: {
    type?: "json" | "text" | "file" | "redirect";
    status?: number;
    contentType?: string;
    errorHandler?: (error: any) => any;
  };
}

interface KleanHandler {
  <TEvent, TResult, V extends TSchemaMap>(
    config: HandlerConfig<V>,
    handler: (event: TCombinedEvent<TEvent, V>, context?: Context) => any,
  ): (event: TEvent, context: Context) => Promise<TResult>;
}

export class KleanJS<
  TEvent = APIGatewayProxyEvent,
  TResult = APIGatewayProxyResult,
> {
  handler<TValidators extends TSchemaMap>(
    handler: (
      event: TCombinedEvent<TEvent, TValidators>,
      context?: Context,
    ) => any,
    options: HandlerConfig<TValidators>,
  ) {
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

    const responseTemplate: any = {
      statusCode: options.response?.status ?? 200,
      headers: {},
      body: "",
    };

    const responseType = options.response?.type ?? "text";
    let contentType = "";
    let transformResponse: (body: any) => string;

    if (responseType === "json") {
      contentType = RESPONSE_TYPE_JSON;
      transformResponse = transformJSON;
    }

    if (responseType === "text") {
      contentType = RESPONSE_TYPE_PLAIN;
      transformResponse = transformText;
    }

    if (responseType === "file") {
      contentType = RESPONSE_TYPE_OCTET;
      transformResponse = transformMediaFile;
      responseTemplate.isBase64Encoded = true;
    }

    responseTemplate.headers!["Content-Type"] =
      options.response?.contentType ?? contentType;

    const errorHandler = options.response?.errorHandler ?? ERROR_DEFAULT;

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
          validate(overrides[name]);
        }

        const newEvent: TCombinedEvent<TEvent, TValidators> = {
          ...rawEvent,
          ...overrides,
        };
        const data = await handler(newEvent, context);
        const responseBody = transformResponse(data);

        return { ...responseTemplate, body: responseBody };
      } catch (error) {
        return errorHandler(error);
      }
    };
  }
}
