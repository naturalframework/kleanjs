import { describe, it, expect, vi } from "vitest";
import { middleware, Use, EventError, AJVSimpleError, AJVFullError } from "../src/index";

describe("Core Middleware Comprehensive Runtime", () => {

  it("should merge transformed data into the event and return handler result", async () => {
    const handler = vi.fn().mockImplementation((event) => ({
      receivedId: event.id,
      receivedMeta: event.meta
    }));

    const mw = middleware(handler, {
      transformers: {
        id: (ev: any) => ev.rawId.toUpperCase(),
        meta: (ev: any) => ({ ...ev.rawMeta, processed: true })
      },
      validators: {
        id: Use<string>(),
        meta: Use<{ processed: boolean }>()
      }
    });

    const result = await mw({ rawId: "usr_123", rawMeta: { source: "web" } });

    expect(result).toEqual({
      receivedId: "USR_123",
      receivedMeta: { source: "web", processed: true }
    });
  });

  it("should allow transformers to use context for data derivation", async () => {
    const handler = (event: any) => event.body;
    const mw = middleware(handler, {
      transformers: {
        body: (ev: any, ctx: any) => ({
          ...ev.body,
          environment: ctx.envName
        })
      },
      validators: {
        body: Use<{ environment: string }>()
      },
      result: Use<{ data: string;  environment: string }>()
    });

    const result = await mw({ body: { data: "test" } }, { envName: "production" });
    expect(result.environment).toBe("production");
  });

  it("should wrap the handler output using customResponse", async () => {
    const handler = async () => ({ userId: "1" });
    const mw = middleware(handler, {
      customResponse: (data, ctx: any) => ({
        success: true,
        data,
        requestId: ctx?.requestId
      })
    });

    const result = await mw({}, { requestId: "abc-123" });
    expect(result).toEqual({
      success: true,
      data: { userId: "1" },
      requestId: "abc-123"
    });
  });

  it("should bypass default error logic when a custom errorHandler is provided", async () => {
    const error = new Error("Business Rule Violation");
    const handler = async () => { throw error; };
    const customErrorHandler = vi.fn().mockImplementation((err) => ({
      customError: true,
      msg: err.message
    }));

    const mw = middleware(handler, { errorHandler: customErrorHandler });
    const result = await mw({});

    expect(customErrorHandler).toHaveBeenCalledWith(error, undefined);
    expect(result).toEqual({ customError: true, msg: "Business Rule Violation" });
  });

  it("should catch native errors and rethrow them as 500 EventErrors via default handler", async () => {
    const handler = async () => { JSON.parse("{ invalid json }"); };
    const mw = middleware(handler, {});

    await expect(mw({})).rejects.toThrow(EventError);
    try {
      await mw({});
    } catch (err: any) {
      expect(err.statusCode).toBe(500);
      expect(err.type).toBe("InternalServerException");
    }
  });

  // 6. AJV Config Options (e.g., allErrors)
  it("should respect AJV configuration like allErrors", async () => {
    const schema = {
      type: "object",
      properties: {
        a: { type: "number" },
        b: { type: "number" }
      },
      required: ["a", "b"]
    };

    const mw = middleware(async (ev) => ev, {
      ajvConfig: { allErrors: true },
      validators: { body: schema },
      transformers: { body: (ev: any) => ev.body }
    });

    try {
      await mw({ body: { a: "string", b: "string" } });
    } catch (error: any) {
      // If allErrors is true, we should have 2 error details
      expect(error.details.length).toBe(2);
    }
  });
});
