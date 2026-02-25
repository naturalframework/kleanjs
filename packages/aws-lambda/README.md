# @kleanjs/aws-lambda

High-performance adapters for AWS Lambda. This package provides specialized wrappers for API Gateway and SQS, integrating seamlessly with the `@kleanjs/core` middleware engine.

## Key Features

* **Service-Specific Wrappers**: Specialized middlewares for API Gateway (REST/HTTP) and SQS (Parallel or Serial).
* **Automatic Response Formatting**: Built-in handlers to transform business objects into AWS-compliant responses.
* **Partial Batch Support**: Native handling of SQS `batchItemFailures` to optimize queue processing and costs.
* **Type Injection**: Pre-configured infrastructure types (Events, Context, Results) for a zero-boilerplate experience.

## Installation

```bash
npm install @kleanjs/aws-lambda @kleanjs/core ajv ajv-formats
```

---

## API Gateway Reference

The `apiGatewayMiddleware` is pre-configured to handle HTTP requests. It automatically injects `APIGatewayProxyEvent` and `APIGatewayProxyResult` types.

### Configuration Extensions
While it inherits from `HandlerConfig`, it provides sensible defaults:
- **Default Result**: `APIGatewayProxyResult`.
- **Default Response**: `responseJSON()` (Content-Type: application/json).
- **Default Error Handler**: Automatically maps `EventError` properties to the response body and status code.

### Example
```typescript
import { apiGatewayMiddleware, responseJSON, Use } from "@kleanjs/aws-lambda";

export const handler = apiGatewayMiddleware(
  async (event) => {
    return { id: event.body.id, status: "active" };
  },
  {
    validators: {
      body: Use<{ id: string }>()
    },
    customResponse: responseJSON({ statusCode: 201 })
  }
);
```

---

## SQS Reference

SQS processing is divided into two execution modes. Both modes isolate the logic to a single `SQSRecord`, abstracting the `Records` array iteration.

### 1. Parallel Processing (`sqsMiddlewareParallel`)
Processes all records in the batch simultaneously using `Promise.allSettled`. This is ideal for high-throughput tasks.

### 2. Serial Processing (`sqsMiddlewareSeries`)
Processes records one by one. Use this when the processing order is critical or to prevent race conditions.

### Batch Error Handling
If a record throws an `EventError` or fails validation, the middleware catches it and adds its `messageId` to the `batchItemFailures` array. AWS will then retry only the failed messages.

### Example
```typescript
import { sqsMiddlewareParallel, Use } from "@kleanjs/aws-lambda";

export const handler = sqsMiddlewareParallel(
  async (record) => {
    // 'record' is a single SQSRecord with typed body
    await processOrder(record.body.orderId);
  },
  {
    validators: {
      body: Use<{ orderId: string }>()
    }
  }
);
```

---

## Technical Interfaces

### `SQSOptions`
```typescript
export type SQSOptions<TValidators extends TSchemaMap, TContext = Context> = 
  Omit<HandlerConfig<any, any, TContext, TValidators>, "customResponse" | "event" | "result" | "context">;
```

---

## Error Mapping Logic

The adapters catch any `EventError` (including `AJVSimpleError` or `AJVFullError`) and transform them as follows:

### API Gateway Mapping
- **Status Code**: Taken from `error.statusCode`.
- **Body**: Standardized JSON with `type`, `message`, and `details`.

### SQS Mapping
Any error thrown within the record handler marks that specific message as failed. The adapter returns the `batchItemFailures` object required by AWS.

## License
GPLv3
