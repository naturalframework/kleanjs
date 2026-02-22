import { describe, test, expect } from "vitest";

import { middleware, Use, HEADER_TYPE_JSON } from "../src";
import { mockBadEventPOST, mockEventPOST, userSchema } from "../demo/schemas";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

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

  test("complex: status 200", async () => {
    const handler = middleware(
      (event) => {
        return {
          userName: event.body.name,
          userEmail: event.body.email,
        };
      },
      {
        event: Use<APIGatewayProxyEvent>(),
        result: Use<APIGatewayProxyResult>(),
        customResponse: (data) => {
          // wrapper response { data: {...} }
          return {
            statusCode: 200,
            headers: {
              "Content-Type": HEADER_TYPE_JSON,
            },
            body: JSON.stringify({ error: false, statusCode: 200, data }),
          };
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
        error: false,
        statusCode: 200,
        data: {
          userName: "Jesús",
          userEmail: "jesus@example.com",
        },
      }),
    });
  });

  test("complex: errorCustom status 400", async () => {
    const handler = middleware(
      (event) => {
        return {
          userName: event.body.name,
          userEmail: event.body.email,
        };
      },
      {
        event: Use<APIGatewayProxyEvent>(),
        result: Use<APIGatewayProxyResult>(),
        errorHandler: (error) => {
          const statusCode = error.statusCode ?? 500;
          return {
            statusCode,
            headers: {
              "Content-Type": HEADER_TYPE_JSON,
            },
            body: JSON.stringify({
              error: true,
              statusCode,
              data: error.details?.map((d: any) => {
                return { location: error.location, message: d.message };
              }),
            }),
          };
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
        error: true,
        statusCode: 400,
        data: [
          {
            location: "body",
            message: "must NOT have fewer than 1 characters",
          },
        ],
      }),
    });
  });
});
