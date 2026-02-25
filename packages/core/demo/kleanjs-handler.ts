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
    validators: {
      body: userSchema,
    },
    transformers: {
      body: (ev: any) => JSON.parse(ev.body),
    },
  },
);
