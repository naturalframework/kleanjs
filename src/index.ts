import { Ajv, type Options, type JSONSchemaType, ValidateFunction } from "ajv";
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

interface DefaultBody {
  [key: string]: any;
}
interface DefaultQuery {
  [key: string]: any;
}
interface DefaultPath {
  [key: string]: any;
}

type PropsApiEvent = "body" | "queryStringParameters" | "pathParameters";

type Validators<TBody, TQuery, TPath> = {
  body?: JSONSchemaType<TBody>;
  query?: JSONSchemaType<TQuery>;
  path?: JSONSchemaType<TPath>;
};

type ValidatedEvent<TEvent, TBody, TQuery, TPath> = Omit<
  TEvent,
  PropsApiEvent
> & {
  body: TBody;
  queryStringParameters: TQuery;
  pathParameters: TPath;
};

const ERROR_DEFAULT = (error: any): APIGatewayProxyResult => {
  console.error(error);
  return {
    statusCode: 500,
    body: "Internal Server Error",
  };
};

export const middleware = <
  TBody = DefaultBody,
  TQuery = DefaultQuery,
  TPath = DefaultPath,
>(
  handler: (
    event: ValidatedEvent<APIGatewayProxyEvent, TBody, TQuery, TPath>,
    context?: Context,
  ) => any,
  options: {
    validators?: Validators<TBody, TQuery, TPath>;
    ajvConfig?: Options;
    response?: {
      type?: "json" | "text" | "file" | "redirect";
      status?: number;
      contentType?: string;
      errorHandler?: (error: any) => APIGatewayProxyResult;
    };
  } = {},
) => {
  const validators: {
    name: PropsApiEvent;
    validation: ValidateFunction;
  }[] = [];
  const ajv = new Ajv(options.ajvConfig);
  addFormats(ajv);

  if (options.validators?.body) {
    const validation = ajv.compile(options.validators.body);
    validators.push({ name: "body", validation });
  }

  if (options.validators?.path) {
    const validation = ajv.compile(options.validators.path);
    validators.push({ name: "pathParameters", validation });
  }

  if (options.validators?.query) {
    const validation = ajv.compile(options.validators.query);
    validators.push({ name: "queryStringParameters", validation });
  }

  const responseTemplate: APIGatewayProxyResult = {
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

  return async (
    event: APIGatewayProxyEvent,
    context?: Context,
  ): Promise<APIGatewayProxyResult> => {
    try {
      const body = getBody(event);
      for (const { name, validation } of validators) {
        validation(event[name]);
      }

      const newEvent: ValidatedEvent<
        APIGatewayProxyEvent,
        TBody,
        TQuery,
        TPath
      > = {
        ...event,
        body: body as TBody,
        queryStringParameters: event.queryStringParameters as TQuery,
        pathParameters: event.pathParameters as TPath,
      };
      const data = await handler(newEvent, context);
      const responseBody = transformResponse(data);

      return { ...responseTemplate, body: responseBody };
    } catch (error) {
      return errorHandler(error);
    }
  };
};
