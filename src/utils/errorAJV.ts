import { ErrorObject } from "ajv";

export class ErrorAJV extends Error {
  public readonly location: string;
  public readonly details?: ErrorObject[] | null;
  public readonly statusCode: number;

  constructor(location: string, details?: ErrorObject[] | null) {
    super("Invalid request parameters");
    this.name = "ErrorAJV";
    this.location = location;
    this.details = details;
    this.statusCode = 400;

    Object.setPrototypeOf(this, ErrorAJV.prototype);
  }
}
