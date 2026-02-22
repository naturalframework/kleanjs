# ✨ kleanjs — Type-safe middleware for AWS Lambda with JSON Schema

**Validate and type your Lambda events effortlessly** using AJV and TypeScript.  
Parse, validate, and infer types for `body`, `queryStringParameters`, `pathParameters` and more — with **minimal runtime overhead** and **full type safety**.

> ✅ **Optimized for performance**: AJV compiles schemas once per cold start, and validation adds only **microseconds of latency**.

---

## 🚀 Features

- ✅ **Automatic TypeScript inference** from AJV `JSONSchemaType<T>`
- ✅ Validate `body`, `query`, and `path` independently (any combination)
- ✅ Uses **AJV under the hood** (fastest JSON Schema validator)
- ✅ **No dependencies** beyond AJV — pure, minimal, and tree-shakeable
- ✅ Compatible with **native AWS Lambda handlers**

---

## 📦 Peer Dependencies

This package has no direct dependencies. It relies on two peer dependencies that you must install explicitly:
- ajv
- ajv-formats

---

## 📦 Installation (Coming soon...)

```bash
npm install @kleanjs/core ajv ajv-formats
```

---

## Example

```typescript
import { JSONSchemaType } from "ajv";
import { middleware } from "@kleanjs/core";
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
    event: Use<APIGatewayProxyEvent>(),
    result: Use<APIGatewayProxyResult>(),
    response: {
      type: "json",
      errorHandler: (error, responseTemplate) => {
        const isValidationError = !!error.errorsAJV;
        console.error(error);
      
        const response = {
          error: {
            ...(isValidationError
              ? {
                  type: "ValidationException",
                  message: "Invalid request parameters",
                  details: error.errorsAJV,
                }
              : { type: "InternalServerException", message: "Unknow Error" }),
          },
        };
      
        const statusCode = error.statusCode ?? 500;
      
        return {
          statusCode,
          body: JSON.stringify(response),
          headers: responseTemplate.headers,
        };
      }
    },
    validators: {
      body: userSchema,
    },
  },
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
