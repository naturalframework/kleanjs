import { JSONSchemaType } from "ajv";
import { middleware } from "../src/index";

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
