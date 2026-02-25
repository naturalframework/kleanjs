import type { APIGatewayProxyEvent, Context, APIGatewayProxyResult } from "aws-lambda";
import { middleware as coreMiddleware, Use, AJVSimpleError, AJVFullError, EventError } from "@kleanjs/core";
import type { TCombinedEvent, HandlerConfig, TSchemaMap } from "@kleanjs/core";
import { getBody, responseJSON } from "./utils";

export const middleware = <
  TEvent = APIGatewayProxyEvent,
  TResult = APIGatewayProxyResult,
  TContext = Context,
  TValidators extends TSchemaMap = TSchemaMap
>(
  handler: (event: TCombinedEvent<TEvent, TValidators>, context?: TContext) => any,
  options: HandlerConfig<TEvent, TResult, TContext, TValidators> = {}
) => {
  const customTransformers = { body: getBody, ...options.transformers }
  return coreMiddleware(handler, {
    event: Use<APIGatewayProxyEvent>(),
    result: Use<APIGatewayProxyResult>(),
    context: Use<Context>(),
    ...options,
    transformers: customTransformers,
    customResponse: options.customResponse ?? responseJSON(),
  } as HandlerConfig<TEvent, TResult, TContext, TValidators>);
};

export * from "./utils";
export { Use, AJVSimpleError, AJVFullError, EventError };
