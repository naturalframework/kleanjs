import { type Options, type JSONSchemaType, Ajv, ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { AJVFullError, AJVSimpleError, errorHandler, EventError } from "./errors";

export { AJVFullError, AJVSimpleError, EventError, errorHandler };

export type TSchemaMap = Record<string, any>;
export type TInterface<T> = { __isContract: true; __type: T };
export type Constructor<T = any> = new (...args: any[]) => T;

export const Use = <T>(): TInterface<T> =>
  ({ __isContract: true }) as unknown as TInterface<T>;

export type TExtract<V> = {
  [K in keyof V]: V[K] extends TInterface<infer T>
    ? T
    : V[K] extends Constructor<infer T>
      ? T
      : V[K] extends JSONSchemaType<infer T>
        ? T
        : any;
};

export type TCombinedEvent<TEvent, TValidators> = Omit<TEvent, keyof TValidators> &
  TExtract<TValidators>;

export interface HandlerConfig<
  TEvent = any,
  TResult = any,
  TContext = any,
  TValidators = TSchemaMap
> {
  event?: TInterface<TEvent>;
  result?: TInterface<TResult>;
  context?: TInterface<TContext>;
  validators?: TValidators;
  transformers?: Record<string, (event: TEvent, context?: TContext) => any>;
  ajvConfig?: Options;
  customResponse?: (data: any, context?: TContext) => TResult;
  errorHandler?: (error: any, context?: TContext) => any;
  ajvError?: typeof AJVFullError;
}

export const middleware = <
  TEvent,
  TResult,
  TContext,
  TValidators extends TSchemaMap = TSchemaMap,
>(
  handler: (
    event: TCombinedEvent<TEvent, TValidators>,
    context?: TContext,
  ) => any,
  options: HandlerConfig<TEvent, TResult, TContext, TValidators>,
) => {
  const schemaActions: {
    n: string; // name
    t: (ev: TEvent, ctx?: TContext) => any; // transformer function
    v?: ValidateFunction; // validate function
  }[] = [];

  let ajv: Ajv | null = null;
  const validatorEntries = options.validators ? Object.entries(options.validators) : [];

  if (validatorEntries.length !== 0) {
    for (const [key, item] of validatorEntries) {
      const transformer = options.transformers?.[key] ?? ((ev: TEvent) => (ev as any)[key]);
      const isContract = (item && typeof item === "object" && "__isContract" in item) || typeof item === "function";

      if (!isContract && !ajv) {
        ajv = new Ajv(options.ajvConfig);
        addFormats(ajv);
      }

      schemaActions.push({
        n: key,
        t: transformer,
        v: ajv && !isContract ? ajv.compile(item) : undefined,
      });
    }
  }

  const errorCb = options.errorHandler ?? errorHandler;
  const customResponse = options.customResponse ?? ((data: any) => data as unknown as TResult);
  const errorClass = options.ajvError ?? AJVSimpleError;

  return async (rawEvent: TEvent, context?: TContext): Promise<TResult> => {
    try {
      const overrides: any = {};
      for (const action of schemaActions) {
        const data = action.t(rawEvent, context);
        if (action.v && !action.v(data)) {
          throw new errorClass(action.n, action.v.errors ?? []);
        }
        overrides[action.n] = data;
      }

      const newEvent: TCombinedEvent<TEvent, TValidators> = { ...rawEvent, ...overrides };
      const data = await handler(newEvent, context);
      return customResponse(data, context);
    } catch (error: any) {
      return errorCb(error, context);
    }
  };
};
