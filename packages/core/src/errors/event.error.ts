export interface EventErrorOptions {
  message: string;
  statusCode?: number;
  type?: string;
  details?: any;
}

export class EventError extends Error {
  public readonly statusCode: number;
  public readonly type: string;
  public readonly details?: any;

  constructor(message: string);
  constructor(options: EventErrorOptions);
  constructor(messageOrOptions: string | EventErrorOptions) {
    const options =
      typeof messageOrOptions === "string"
        ? { message: messageOrOptions }
        : messageOrOptions;

    super(options.message);

    this.name = this.constructor.name;
    this.statusCode = options.statusCode ?? 400;
    this.type = options.type ?? "ClientException";
    this.details = options.details;
  }
}
