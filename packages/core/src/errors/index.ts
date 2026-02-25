import { AJVSimpleError, AJVFullError } from "./ajv.error";
import { EventError } from "./event.error";

export { AJVSimpleError, AJVFullError, EventError };

export const errorHandler = (error: any): never => {
  console.error(error);

  if (error instanceof EventError) {
    throw error;
  }

  throw new EventError({
    message: "Internal Server Error",
    statusCode: 500,
    type: "InternalServerException",
  });
};
