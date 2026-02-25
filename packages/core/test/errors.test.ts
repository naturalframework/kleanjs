import { describe, it, expect } from "vitest";
import { AJVSimpleError, AJVFullError, EventError } from "../src/index";
import { ErrorObject } from "ajv";

describe("AJV Error Classes", () => {
  const mockAjvErrors: ErrorObject[] = [
    {
      instancePath: "/user/email",
      keyword: "format",
      message: "must match format email",
      params: { format: "email" },
      schemaPath: "#/properties/user/properties/email/format"
    },
    {
      instancePath: "",
      keyword: "required",
      message: "must have required property 'id'",
      params: { missingProperty: "id" },
      schemaPath: "#/required"
    }
  ];

  describe("AJVSimpleError", () => {
    it("should transform AJV errors into a clean, simplified format", () => {
      const location = "body";
      const error = new AJVSimpleError(location, mockAjvErrors);

      expect(error).toBeInstanceOf(EventError);
      expect(error.statusCode).toBe(400);
      expect(error.type).toBe("ValidationError");
      expect(error.message).toBe(`Validation failed at ${location}`);

      // Verify mapping logic
      expect(error.details).toHaveLength(2);

      // Check nested path transformation
      expect(error.details[0]).toEqual({
        location: "body",
        field: "user/email",
        rule: "format",
        message: "must match format email"
      });

      // Check root path transformation
      expect(error.details[1]).toEqual({
        location: "body",
        field: "root",
        rule: "required",
        message: "must have required property 'id'"
      });
    });

    it("should use a default message when AJV error message is missing", () => {
      const minimalError: ErrorObject[] = [{
        instancePath: "/test",
        keyword: "type",
        params: {},
        schemaPath: ""
      }];

      const error = new AJVSimpleError("query", minimalError);
      expect(error.details[0].message).toBe("Unknown error");
    });
  });

  describe("AJVFullError", () => {
    it("should preserve the original AJV ErrorObject array without transformations", () => {
      const location = "params";
      const error = new AJVFullError(location, mockAjvErrors);

      expect(error.statusCode).toBe(400);
      expect(error.type).toBe("ValidationError");

      // Full error should keep the AJV objects intact for advanced debugging
      expect(error.details).toEqual(mockAjvErrors);
      expect(error.details[0]).toHaveProperty("params");
      expect(error.details[0]).toHaveProperty("schemaPath");
    });
  });
});
