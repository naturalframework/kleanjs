export type SchemaProxy<T> = { __type: T };
export const Use = <T>(): SchemaProxy<T> => ({}) as any;

export type InferredEvent<E, V> = Omit<E, keyof V> & V;

export interface ResponseConfig {
  status?: number;
  type?: "json" | "text" | "file";
  validator?: SchemaProxy<any>;
  contentType?: string;
}
