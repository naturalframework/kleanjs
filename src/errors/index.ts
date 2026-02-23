import { APIGatewayProxyResult } from "aws-lambda";
import { AJVError } from "./ajv.error";
import { EventError } from "./event.error";
import { HEADER_TYPE_JSON } from "../utils/apigateway";

export { AJVError, EventError };

export const errorHandler = (error: any): APIGatewayProxyResult => {
  const isValidationError = error instanceof AJVError;
  const isEventError = error instanceof EventError;

  console.error(error);

  const payloadError: Record<string, any> = {};
  if (isEventError) {
    payloadError.type = error.type;
    payloadError.message = error.message;

    if (isValidationError) {
      payloadError.details = error.details?.map((err) => {
        return {
          location: error.location,
          field: err.instancePath.replace(/^\//, "") || "root",
          rule: err.keyword,
          message: err.message ?? "Unknown",
        };
      });
    }
  } else {
    payloadError.type = "InternalServerException";
    payloadError.message = "Internal Server Error";
  }

  const statusCode = isEventError ? error.statusCode : 500;

  return {
    statusCode,
    body: JSON.stringify({ error: payloadError }),
    headers: {
      "Content-Type": HEADER_TYPE_JSON,
    },
  };
};
