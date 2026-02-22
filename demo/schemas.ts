import type { JSONSchemaType } from "ajv";
import { APIGatewayProxyEvent } from "aws-lambda";

export interface UserInput {
  name: string;
  email: string;
  age?: number;
}

export const userSchema: JSONSchemaType<UserInput> = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
    email: { type: "string", format: "email" },
    age: { type: "integer", minimum: 0, nullable: true },
  },
  required: ["name", "email"],
  additionalProperties: false,
};

// Test POST
export const mockEventPOST: APIGatewayProxyEvent = {
  body: JSON.stringify({ name: "Jesús", email: "jesus@example.com", age: 32 }),
  headers: { "Content-Type": "application/json" },
  httpMethod: "POST",
  isBase64Encoded: false,
  path: "/users",
  pathParameters: null,
  queryStringParameters: null,
  requestContext: {} as any,
  resource: "",
  stageVariables: null,
  multiValueHeaders: {},
  multiValueQueryStringParameters: {},
};

export const mockBadEventPOST: APIGatewayProxyEvent = {
  body: JSON.stringify({ name: "", email: "jesus", age: 32 }),
  headers: { "Content-Type": "application/json" },
  httpMethod: "POST",
  isBase64Encoded: false,
  path: "/users",
  pathParameters: null,
  queryStringParameters: null,
  requestContext: {} as any,
  resource: "",
  stageVariables: null,
  multiValueHeaders: {},
  multiValueQueryStringParameters: {},
};
