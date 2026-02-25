import middy from "@middy/core";
import jsonBodyParser from "@middy/http-json-body-parser";
import httpErrorHandler from "@middy/http-error-handler";
import validator from "@middy/validator";
import { transpileSchema } from "@middy/validator/transpile";
import { userSchema } from "../demo/schemas";

const eventSchema = {
  type: "object",
  properties: {
    body: userSchema,
  },
};

const lambdaHandler = (event: any) => {
  const { name, email } = event.body;
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      userName: name,
      userEmail: email,
    }),
  };
};

export const handler = middy()
  .use(jsonBodyParser()) // parses the request body when it's a JSON and converts it to an object
  .use(
    validator({
      eventSchema: transpileSchema(eventSchema),
    }),
  ) // validates the input
  .use(httpErrorHandler()) // handles common http errors and returns proper responses
  .handler(lambdaHandler);
