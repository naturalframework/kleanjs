import { ErrorObject } from "ajv";
import { EventError } from "./event.error";

export class AJVError extends EventError {
  public readonly location: string;
  public readonly details: ErrorObject[];

  constructor(location: string, details: ErrorObject[]) {
    super({
      message: "Invalid request parameters",
      statusCode: 400,
      type: "ValidationException",
    });
    this.location = location;
    this.details = details;
  }
}
