import { middleware } from "../src";
import { userSchema } from "../demo/schemas";

export const handler = middleware(
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
