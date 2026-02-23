import { SchemaProxy, ResponseConfig } from "./types";

/**
 * @Validate("queryStringParameters", Use<SearchDTO>())
 */
export function Validate<T>(key: string, schema: SchemaProxy<T>) {
  return (value: any, context: ClassMemberDecoratorContext) => value;
}

/**
 * @Body(Use<UserInput>())
 * Equivalente a Validate("body", ...) pero inyecta JSON.parse(event.body)
 */
export function Body<T>(schema: SchemaProxy<T>) {
  return (value: any, context: ClassMemberDecoratorContext) => value;
}

/**
 * @Response({ status: 201, validator: Use<UserOutput>() })
 */
export function Response(config: ResponseConfig) {
  return (value: any, context: ClassMemberDecoratorContext) => value;
}
