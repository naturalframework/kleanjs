import { describe, test, expect } from "vitest";

import { middleware } from "../src";
import { mockBadEventPOST, mockEventPOST, userSchema } from "../demo/schemas";

describe("Method: POST", () => {
  test("simple: status 200", async () => {
    const handler = middleware(
      (event) => {
        return {
          userName: event.body.name,
          userEmail: event.body.email,
        };
      },
      {
        response: {
          type: "json",
        },
        validators: {
          body: userSchema,
        },
      },
    );
    const response = await handler(mockEventPOST);
    expect(response).toStrictEqual({
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        userName: "Jesús",
        userEmail: "jesus@example.com",
      }),
    });
  });

  test("simple: validate ajv status 400", async () => {
    const handler = middleware(
      (event) => {
        return {
          userName: event.body.name,
          userEmail: event.body.email,
        };
      },
      {
        response: {
          type: "json",
        },
        validators: {
          body: userSchema,
        },
      },
    );
    const response = await handler(mockBadEventPOST);
    expect(response).toStrictEqual({
      statusCode: 400,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        error: {
          type: "ValidationException",
          message: "Invalid request parameters",
          details: [
            {
              location: "body",
              field: "name",
              rule: "minLength",
              message: "must NOT have fewer than 1 characters",
            },
          ],
        },
      }),
    });
  });
});
