import { describe, test, expect } from "vitest";

import { middleware } from "../src";
import { mockEventPOST, userSchema } from "../demo/schemas";

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
});
