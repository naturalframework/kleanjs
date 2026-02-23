# ✨ kleanjs — Type-safe middleware for AWS Lambda with JSON Schema

**Validate and type your Lambda events effortlessly** using AJV and TypeScript.  
Parse, validate, and infer types for `body`, `queryStringParameters`, `pathParameters` and more — with **minimal runtime overhead** and **full type safety**.

> ✅ **Optimized for performance**: AJV compiles schemas once per cold start, and validation adds only **microseconds of latency**.

---

## 🚀 Features

- ✅ **Automatic TypeScript inference** from AJV `JSONSchemaType<T>`
- ✅ Validate `body`, `queryStringParameters`, `pathParameters` and others independently (any combination)
- ✅ Uses **AJV under the hood** (fastest JSON Schema validator)
- ✅ **No dependencies** beyond AJV — pure, minimal, and tree-shakeable
- ✅ Compatible with **native AWS Lambda handlers**

---

## 📦 Peer Dependencies

This package has no direct dependencies. It relies on two peer dependencies that you must install explicitly:
- ajv
- ajv-formats

---

## 📦 Installation

```bash
npm install @kleanjs/core ajv ajv-formats
```

---

## Example

```typescript
import { JSONSchemaType } from "ajv";
import { middleware, Use, errorHandler, responseJSON } from "@kleanjs/core";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

interface UserInput {
  name: string;
  email: string;
  age?: number;
}

const schemaBody: JSONSchemaType<UserInput> = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
    email: { type: "string", format: "email" },
    age: { type: "integer", minimum: 0, nullable: true },
  },
  required: ["name", "email"],
  additionalProperties: false,
};

export const handler = middleware(
  (event) => {
    return {
      userName: event.body.name,
      userEmail: event.body.email,
    };
  },
  {
    // ajvConfig: Options (import type { Options } from 'ajv')
    event: Use<APIGatewayProxyEvent>(), // Default: Use<APIGatewayProxyEvent>()
    result: Use<APIGatewayProxyResult>(), // Default: Use<APIGatewayProxyResult>()
    errorHandler, // Default: errorHandler
    customResponse: responseJSON, // Default: responseJSON
    validators: {
      body: schemaBody,
    },
  },
);
```

---

## API Reference

### middleware(handler, options)

The core wrapper function that intercepts the Lambda execution, validates the incoming event based on the provided schemas, and formats the response.

Arguments:
1. handler: Your business logic function. The `event` parameter is deeply typed based on the schemas provided in the `validators` object.
2. options: An object matching the `HandlerConfig` interface.

---

### HandlerConfig

The configuration object passed to the middleware to dictate how the event is validated and how the response is constructed.

```typescript
interface HandlerConfig<TEvent, TResult, TValidators> {
  event?: Use<TEvent>;
  result?: Use<TResult>;
  validators?: TValidators;
  ajvConfig?: Options;
  errorHandler?: (error: any) => any;
  customResponse?: (data: any) => TResult;
}
```

* **event**: Defines the incoming event type. Uses the `Use<T>()` generic helper. Defaults to `Use<APIGatewayProxyEvent>()`.
* **result**: Defines the expected return type. Uses the `Use<T>()` generic helper. Defaults to `Use<APIGatewayProxyResult>()`.
* **validators**: A map of schemas where the key corresponds to the event property to validate (e.g., `body`, `queryStringParameters`, `pathParameters`). `kleanjs` automatically parses `event.body` if a schema is provided for it.
* **ajvConfig**: Optional configuration object passed directly to the AJV instance (e.g., `{ allErrors: true }`).
* **customResponse**: A function to serialize the data returned by your handler. Overrides the default `responseJSON`.
* **errorHandler**: A function to intercept errors thrown during validation or execution. Overrides the default `errorHandler`.

---

### customResponse (Formatters)

Formatters are pure functions that take the raw data returned by your handler and serialize it into the expected `APIGatewayProxyResult` format. 

By default, `kleanjs` uses `responseJSON`, which stringifies the payload and injects the `application/json` content type.

The package exports the following standard formatters and their corresponding header constants (`HEADER_TYPE_JSON`, `HEADER_TYPE_HTML`, `HEADER_TYPE_OCTET`, `HEADER_TYPE_PLAIN`):

* **responseJSON**: Serializes objects to JSON strings.
* **responseHTML**: Returns raw HTML strings.
* **responseMediaFile**: Handles binary data and Buffer objects, automatically setting `isBase64Encoded: true`.
* **responseRedirect**: Generates a 301/302 redirect response given a URL.


```typescript
import { middleware, Use, responseMediaFile } from "@kleanjs/core";
import { APIGatewayProxyEvent } from "aws-lambda";

export const handler = middleware(
  async (event) => {
    const pdfBuffer = await generatePDF();
    return pdfBuffer;
  },
  {
    event: Use<APIGatewayProxyEvent>(),
    customResponse: responseMediaFile,
  }
);
```
> View the source code for all built-in formatters in [src/utils/apigateway.ts](https://github.com/naturalframework/kleanjs/blob/main/src/utils/apigateway.ts#L42).

#### Creating a Custom Formatter
A formatter simply merges your data with the base response template:

```typescript
import { APIGatewayProxyResult } from "aws-lambda";

export const responseXML = (data: any): APIGatewayProxyResult => {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/xml" },
    body: convertToXML(data),
  };
};
```

---

### errorHandler, AJVError, and EventError

`kleanjs` ships with a robust default error handler designed for RESTful APIs. It differentiates between validation errors, controlled business errors, and internal server errors to prevent sensitive infrastructure details from leaking.

If a validation fails, the middleware automatically throws an `AJVError` instance. The default error handler catches it and constructs a `400 Bad Request` response detailing the exact location, field, and rule that failed.

#### Standard Error Response (Validation Failure)

```json
{
  "error": {
    "type": "ValidationException",
    "message": "Invalid request parameters",
    "details": [
      {
        "location": "body",
        "field": "email",
        "rule": "format",
        "message": "must match format \"email\""
      }
    ]
  }
}
``

#### Throwing Custom Business Errors

You can throw controlled errors using the `EventError` class. The default error handler will respect the status code and type, mapping them directly to the JSON response while hiding internal stack traces. Any other unhandled error will default to a 500 Internal Server Error.

The `EventError` constructor supports two signatures for flexibility: a simple string for quick errors, or a configuration object for precise control over the HTTP status and exception type.

```typescript
import { middleware, EventError } from "@kleanjs/core";

export const handler = middleware(
  async (event) => {
    if (!event.body.name) {
      throw new EventError("Name is required but validation was skipped");
    }

    const user = await db.find(event.pathParameters.id);
    
    if (!user) {
      throw new EventError({
        message: "User not found in the database",
        statusCode: 404,
        type: "UserNotFoundException"
      });
    }
    
    return user;
  },
  { validators: { /* ... */ } }
);
```

#### Extending EventError for Custom Domains

For large applications, throwing generic `EventError` instances can become repetitive. You can extend `EventError` to create highly specific, domain-driven exceptions (e.g., database errors, external API timeouts) that encapsulate their own status codes and types.

This approach keeps your business logic clean and enforces a consistent error taxonomy across your microservices.

```typescript
import { EventError } from "@kleanjs/core";

export class DBError extends EventError {
  constructor(entity: string, operation: "insert" | "update" | "delete") {
    super({
      message: `Database conflict occurred while attempting to ${operation} ${entity}`,
      statusCode: 409,
      type: "DatabaseConflictException"
    });
  }
}
```

You can then throw this customized error directly inside your handler. The `kleanjs` middleware will automatically catch it, unpack the prototype, and format the HTTP response without exposing underlying database engine logs.

```typescript
import { middleware, Use } from "@kleanjs/core";
import { APIGatewayProxyEvent } from "aws-lambda";
import { DBError } from "./errors/DBError";

export const handler = middleware(
  async (event) => {
    const { email } = event.body;

    const existingUser = await db.findByEmail(email);
    
    if (existingUser) {
      throw new DBError("User", "insert");
    }

    const newUser = await db.insert({ email });
    return newUser;
  },
  { 
    event: Use<APIGatewayProxyEvent>(),
    validators: { /* ... */ } 
  }
);
```

---

## 🏁 Benchmark

Validation performance measured locally with Vitest (`benchmark/benchmark.bench.ts`) using a typical POST event (total duration: 1700 ms):

### Environment
- **Node.js**: v22.14.0  
- **OS**: Ubuntu 24.04.3 LTS  
- **CPU**: AMD Ryzen™ 7 8840HS w/ Radeon™ 780M Graphics × 16  

### Results

| Metric               | `kleanjs/apigateway` | Middy        | Improvement |
|----------------------|----------------------|--------------|-------------|
| **Throughput (ops/sec)** | 158,901.54       | 94,748.27    | **1.68x**   |
| **Mean latency (ms)**    | 0.0063           | 0.0106       | **40% lower** |
| **P99 latency (ms)**     | 0.0142           | 0.0274       | **48% lower** |
| **Max latency (ms)**     | 0.9264           | 1.1255       | —           |
| **Samples**              | 79,451           | 47,375       | —           |
| **Relative margin of error (rme)** | ±1.27%    | ±1.40%       | More stable |

> ✅ **Conclusion**: `kleanjs/core` delivers higher throughput, lower latency, and better stability than Middy in typical API Gateway validation scenarios.
