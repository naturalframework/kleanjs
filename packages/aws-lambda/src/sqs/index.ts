import type { SQSEvent, SQSBatchResponse, Context, SQSRecord } from "aws-lambda";
import { middleware as coreMiddleware, Use, AJVSimpleError, AJVFullError, EventError } from "@kleanjs/core";
import type { TCombinedEvent, HandlerConfig, TSchemaMap } from "@kleanjs/core";
import { getBody } from "./utils";

const createProcessor = <TEvent, TResult, TContext, TValidators extends TSchemaMap>(
  handler: (record: TCombinedEvent<TEvent, TValidators>, context?: TContext) => any,
  options: HandlerConfig<TEvent, TResult, TContext, TValidators>
) => coreMiddleware(handler, {
  event: Use<SQSRecord>(),
  context: Use<Context>(),
  ...options,
  transformers: { body: getBody, ...options.transformers },
  errorHandler: (err) => { throw err; }
} as HandlerConfig<TEvent, TResult, TContext, TValidators>);

export const middlewareParallel = <
  TEvent = SQSRecord,
  TContext = Context,
  TValidators extends TSchemaMap = TSchemaMap
>(
  handler: (record: TCombinedEvent<TEvent, TValidators>, context?: TContext) => any,
  options: HandlerConfig<TEvent, any, TContext, TValidators> = {}
) => {
  const processRecord = createProcessor(handler, options);

  return async (event: SQSEvent, context?: TContext): Promise<SQSBatchResponse> => {
    const results = await Promise.allSettled(
      event.Records.map((r) => processRecord(r as unknown as TEvent, context as unknown as TContext))
    );

    const itemFailures = results
      .map((res, i) => res.status === "rejected" ? { itemIdentifier: event.Records[i].messageId } : null)
      .filter((v): v is { itemIdentifier: string } => v !== null);

    return { batchItemFailures: itemFailures };
  };
};

export const middlewareSeries = <
  TEvent = SQSRecord,
  TContext = Context,
  TValidators extends TSchemaMap = TSchemaMap
>(
  handler: (record: TCombinedEvent<TEvent, TValidators>, context?: TContext) => any,
  options: HandlerConfig<TEvent, any, TContext, TValidators> = {}
) => {
  const processRecord = createProcessor(handler, options);

  return async (event: SQSEvent, context?: TContext): Promise<SQSBatchResponse> => {
    const itemFailures: { itemIdentifier: string }[] = [];
    for (const record of event.Records) {
      try {
        await processRecord(record as unknown as TEvent, context as unknown as TContext);
      } catch {
        itemFailures.push({ itemIdentifier: record.messageId });
      }
    }
    return { batchItemFailures: itemFailures };
  };
};

export { Use, AJVSimpleError, AJVFullError, EventError };
