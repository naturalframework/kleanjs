import { ErrorObject } from "ajv";
import { EventError } from "./event.error";

export class AJVFullError extends EventError {
  constructor(location: string, details: ErrorObject[]) {
    super({
      message: `Validation failed at ${location}`,
      statusCode: 400,
      type: "ValidationError",
      details,
    });
  }
}

export class AJVSimpleError extends EventError {
  constructor(location: string, errors: ErrorObject[]) {
    const details = errors.map((err) => ({
      location,
      field: err.instancePath.replace(/^\//, "") || "root",
      rule: err.keyword,
      message: err.message ?? "Unknown error",
    }));

    super({
      message: `Validation failed at ${location}`,
      statusCode: 400,
      type: "ValidationError",
      details,
    });
  }
}
