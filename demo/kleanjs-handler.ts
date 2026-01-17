import { middleware, Use } from "../src";
import { userSchema } from "../demo/schemas";
import { APIGatewayProxyEvent } from "aws-lambda";

export const handler = middleware(
  (event) => {
    return {
      userName: event.body.name,
      userEmail: event.body.email,
    };
  },
  {
    event: Use<APIGatewayProxyEvent>(),
    response: {
      type: "json",
    },
    validators: {
      body: userSchema,
    },
  },
);
