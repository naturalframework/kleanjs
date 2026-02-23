import typia from "typia";
import { Context } from "aws-lambda";
import { getBody } from "./utils";

type SchemaMap = Record<string, (input: unknown) => any>;

type InferValidators<V extends SchemaMap> = {
  [K in keyof V]: ReturnType<V[K]>;
};

type TCombinedEvent<TEvent, TValidators extends SchemaMap> = Omit<
  TEvent,
  keyof TValidators
> &
  InferValidators<TValidators>;

type TInterface<T> = { __type: T };
export const KUse = <T>(): TInterface<T> => ({}) as any;

export const KValidate = <T>() => typia.createAssert<T>();
export const KStringify = <T>() => typia.json.createAssertStringify<T>();

interface KMiddlewareConfig<
  TEvent,
  TResult,
  TStringify,
  TValidators extends SchemaMap,
> {
  event?: TEvent;
  result?: TResult;
  validators?: TValidators;
  response?: {
    status?: number;
    stringify?: TStringify;
  };
}

const transformResultDefault = <R>(input: R) => {
  return JSON.stringify(input);
};

export const middleware = <
  TEvent,
  TResult = any,
  TStringify = any,
  TValidators extends SchemaMap = {},
>(
  config: KMiddlewareConfig<TEvent, TResult, TStringify, TValidators>,
  handler: (
    event: TCombinedEvent<TEvent, TValidators>,
    context: Context,
  ) => Promise<TStringify>,
) => {
  const stringify: (input: TStringify) => string = config.response?.stringify
    ? typia.json.createStringify<TStringify>()
    : transformResultDefault<TStringify>;

  const status = config.response?.status ?? 200;

  const validators: {
    n: string; // name
    v: any; // validate function
    p: boolean; // isParse
  }[] = [];

  if (config.validators) {
    for (const [key, schema] of Object.entries(config.validators)) {
    }
  }

  return async (rawEvent: TEvent, context: Context) => {
    try {
      const overrides: any = {};

      if (config.validators) {
        for (const key in config.validators) {
          let data = (rawEvent as any)[key];

          // Normalización automática para el Body de API Gateway
          if (key === "body" && typeof data === "string") {
            data = getBody(rawEvent as any);
          }

          // Validación con Typia (Lanza error si falla)
          overrides[key] = config.validators[key](data);
        }
      }

      // Ejecución del handler con los tipos combinados
      const result = await handler({ ...rawEvent, ...overrides }, context);

      // Respuesta para API Gateway o similar
      if ((rawEvent as any).httpMethod || (rawEvent as any).requestContext) {
        return {
          statusCode: status,
          headers: { "Content-Type": "application/json" },
          body: stringify(result),
        };
      }

      return result; // Retorno directo para eventos S3, SQS, etc.
    } catch (error: any) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Validation Error",
          message: error.message,
          details: error.errors, // Typia devuelve detalles exactos
        }),
      };
    }
  };
};
