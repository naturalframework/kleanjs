# @kleanjs/core

The agnostic middleware engine for KleanJS. Built for high performance and strict type safety, it allows developers to write clean, hexagonal business logic while keeping the infrastructure details separate.

## Key Features

* **Zero-Overhead Typing**: Use `Use<T>()` to define input/output contracts. No manual generics needed in your handlers.
* **Agnostic by Design**: Works in AWS Lambda, Google Cloud Functions, Azure, or pure Node.js environments.
* **Advanced Validation**: Optimized AJV integration with support for both simplified and full error reporting.
* **Hexagonal Ready**: Clear separation between data transformation, validation, and business execution.

## Installation

```bash
npm install @kleanjs/core
```

---

## Configuration Reference (`HandlerConfig`)

The `middleware` function accepts a configuration object that defines the behavior of the request lifecycle.

### 1. Type Markers: `event`, `result`, `context`
These attributes use the `Use<T>()` utility to register types for inference. They do not hold values; they only carry type information.
- **event**: The raw input event type (e.g., `APIGatewayProxyEvent`).
- **result**: The expected return type of the middleware.
- **context**: The infrastructure context (e.g., AWS `Context`).

### 2. `validators`
Defines the schema validation or type contracts for specific parts of the event.
- If a **JSON Schema** is provided: The data is validated at runtime using AJV.
- If **`Use<T>()`** is provided: Only type inference is applied (Zero runtime cost).

### 3. `transformers`
Functions that extract or normalize data from the raw event before validation.
- **Signature**: `(event: TEvent, context?: TContext) => any`

### 4. `customResponse`
A factory function to format the successful output of the handler.
- **Signature**: `(data: any, context?: TContext) => TResult`

### 5. `errorHandler`
Intercepts any thrown error. If omitted, the default handler normalizes errors into `EventError` and rethrows them.
- **Signature**: `(error: any, context?: TContext) => any`

### 6. `ajvError` & `ajvConfig`
- **ajvError**: Choose between `AJVSimpleError` (default, formatted details) or `AJVFullError` (raw AJV objects).
- **ajvConfig**: Native AJV options (e.g., `{ allErrors: true }`).

---

## Technical Interfaces

### `HandlerConfig`
```typescript
export interface HandlerConfig<
  TEvent = any,
  TResult = any,
  TContext = any,
  TValidators = TSchemaMap
> {
  event?: TInterface<TEvent>;
  result?: TInterface<TResult>;
  context?: TInterface<TContext>;
  validators?: TValidators;
  transformers?: Record<string, (event: TEvent, context?: TContext) => any>;
  ajvConfig?: Options;
  customResponse?: (data: any, context?: TContext) => TResult;
  errorHandler?: (error: any, context?: TContext) => any;
  ajvError?: typeof AJVFullError | typeof AJVSimpleError;
}
```

### Error Classes
KleanJS uses a hierarchical error system where all validation or controlled errors extend `EventError`.

#### `EventError`
```typescript
export class EventError extends Error {
  public readonly statusCode: number;
  public readonly type: string;
  public readonly details?: any;
}
```

#### `AJVSimpleError`
Standard validation error that transforms AJV's `ErrorObject` into:
- `field`: Clean path (e.g., "user/email").
- `rule`: Failed keyword (e.g., "required").
- `message`: Human-readable description.

---

## Internal Type Logic

KleanJS leverages advanced TypeScript mapped types to provide an "Invisible" DX.

### `TCombinedEvent`
Merges the original `TEvent` with the inferred types from `TValidators`. If a key exists in both, the validated type takes precedence.
```typescript
export type TCombinedEvent<TEvent, TValidators> = Omit<TEvent, keyof TValidators> &
  TExtract<TValidators>;
```

### `TExtract`
Recursively resolves types from JSON Schemas, Classes, or `Use<T>()` contracts.
```typescript
export type TExtract<V> = {
  [K in keyof V]: V[K] extends TInterface<infer T>
    ? T
    : V[K] extends Constructor<infer T>
      ? T
      : V[K] extends JSONSchemaType<infer T>
        ? T
        : any;
};
```

---

## Usage Examples

### Basic with Type Inference
```typescript
import { middleware, Use } from "@kleanjs/core";

export const handler = middleware(
  async (event) => {
    // event.body is automatically typed as { id: number }
    return { success: true };
  },
  {
    validators: {
      body: Use<{ id: number }>()
    }
  }
);
```

### Advanced Transformers
```typescript
const handler = middleware(
  async (event) => event.user,
  {
    transformers: {
      user: (event, context) => ({
        id: event.headers['user-id'],
        region: context.invokedFunctionArn
      })
    },
    validators: {
      user: Use<{ id: string; region: string }>()
    }
  }
);
```

## License
GPLv3
