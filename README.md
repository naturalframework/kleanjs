# ✨ kleanjs — Type-safe middleware for AWS Lambda with JSON Schema

**Validate and type your Lambda events effortlessly** using AJV and TypeScript.  
Parse, validate, and infer types for `body`, `queryStringParameters`, and `pathParameters` — with **minimal runtime overhead** and **full type safety**.

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
npm install @kleanjs/apigateway ajv ajv-formats
```

---

## Example

```typescript
import { JSONSchemaType } from "ajv";
import { middleware } from "@kleanjs/apigateway";

interface MyData {
  foo: number;
  bar?: string;
}

const schemaBody: JSONSchemaType<MyData> = {
  type: "object",
  properties: {
    foo: { type: "integer" },
    bar: { type: "string", nullable: true },
  },
  required: ["foo"],
  additionalProperties: false,
};

export const handler = middleware(
  (event) => {
    const other = event.queryStringParameters.test;
    const { foo, bar } = event.body;
    return { other, foo, bar };
  },
  {
    response: {
      type: "json",
    },
    validators: {
      body: schemaBody,
    },
  },
);
```
