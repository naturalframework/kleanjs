import { describe, it, expect, vi } from "vitest";
import { middleware, Use } from "../src/apigateway/index";
import { EventError } from "@kleanjs/core";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";

describe("APIGateway Adapter", () => {
  const mockContext = {} as Context;

  it("should successfully process a request and return a JSON response", async () => {
    const handler = vi.fn().mockResolvedValue({ message: "hello" });
    const mw = middleware(handler, {
      validators: { body: Use<{ name: string }>() }
    });

    const event = {
      body: JSON.stringify({ name: "KleanJS" }),
      httpMethod: "POST",
      headers: { "Content-Type": "application/json" }
    } as unknown as APIGatewayProxyEvent;

    const result = await mw(event, mockContext);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ message: "hello" });
    expect(result.headers?.["Content-Type"]).toBe("application/json");
  });

  it("should catch EventError and format it as a valid API Gateway response", async () => {
    const handler = async () => {
      throw new EventError({
        message: "Resource not found",
        statusCode: 404,
        type: "NotFoundException"
      });
    };

    const mw = middleware(handler);
    const result = await mw({} as any, mockContext);

    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.error.type).toBe("NotFoundException");
  });

  it("should return 400 when AJV validation fails via middleware", async () => {
    const schema = {
      type: "object",
      properties: { age: { type: "number" } },
      required: ["age"]
    };

    const mw = middleware(async (ev) => ev, {
      validators: { body: schema }
    });

    const event = { body: JSON.stringify({ age: "invalid" }) } as any;
    const result = await mw(event, mockContext);

    expect(result.statusCode).toBe(400);
    expect(result.body).toContain("ValidationError");
  });
});
