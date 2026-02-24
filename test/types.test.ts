import { describe, it, expectTypeOf } from "vitest";
import { type JSONSchemaType } from "ajv";
import { middleware, Use } from "../src/index";

class CreateOrderDto {
  id!: string;
  amount!: number;
}

interface CustomQuery {
  search: string;
  page: number;
}

interface CustomHeaders {
  "x-api-key": string;
}

const headersSchema: JSONSchemaType<CustomHeaders> = {
  type: "object",
  properties: {
    "x-api-key": { type: "string" },
  },
  required: ["x-api-key"],
};

describe("KleanJS Core - Type Inference", () => {
  it("should infer type from a Class (Constructor Contract)", () => {
    middleware(
      async (event) => {
        expectTypeOf(event.body).toEqualTypeOf<CreateOrderDto>();
        return { statusCode: 200, body: "OK" };
      },
      {
        validators: {
          body: CreateOrderDto,
        },
      },
    );
  });

  it("should infer type from Use<T> (Interface Contract)", () => {
    middleware(
      async (event) => {
        expectTypeOf(event.queryStringParameters).toEqualTypeOf<CustomQuery>();
        return { statusCode: 200, body: "OK" };
      },
      {
        validators: {
          queryStringParameters: Use<CustomQuery>(),
        },
      },
    );
  });

  it("should infer type from a JSONSchemaType (AJV Validator)", () => {
    middleware(
      async (event) => {
        expectTypeOf(event.headers).toEqualTypeOf<CustomHeaders>();
        return { statusCode: 200, body: "OK" };
      },
      {
        validators: {
          headers: headersSchema,
        },
      },
    );
  });

  it("should combine multiple inferences correctly", () => {
    middleware(
      async (event) => {
        expectTypeOf(event.body).toEqualTypeOf<CreateOrderDto>();
        expectTypeOf(event.queryStringParameters).toEqualTypeOf<CustomQuery>();
        expectTypeOf(event.headers).toEqualTypeOf<CustomHeaders>();
        return { statusCode: 200, body: "OK" };
      },
      {
        validators: {
          body: CreateOrderDto,
          queryStringParameters: Use<CustomQuery>(),
          headers: headersSchema,
        },
      },
    );
  });

  it("should preserve original properties of the base event (functional Omit)", () => {
    middleware(
      async (event) => {
        expectTypeOf(event.httpMethod).toEqualTypeOf<string>();
        expectTypeOf(event.requestContext).toBeObject();

        expectTypeOf(event.body).not.toEqualTypeOf<string | null>();
        expectTypeOf(event.body).toEqualTypeOf<CreateOrderDto>();

        return { statusCode: 200, body: "OK" };
      },
      {
        validators: {
          body: CreateOrderDto,
        },
      },
    );
  });

  it("should prevent accessing non-existent properties on inferred types", () => {
    middleware(
      async (event) => {
        expectTypeOf(event.body).not.toHaveProperty("notExists");
        expectTypeOf(event.queryStringParameters).not.toHaveProperty(
          "invalidParam",
        );

        return { statusCode: 200, body: "OK" };
      },
      {
        validators: {
          body: CreateOrderDto,
          queryStringParameters: Use<CustomQuery>(),
        },
      },
    );
  });
});
