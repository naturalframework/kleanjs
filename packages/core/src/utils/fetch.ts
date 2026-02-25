import { IncomingMessage } from "node:http";
import { request } from "node:https";
import { Readable } from "node:stream";

const USER_AGENT = "klean-fetch"; // 'curl/7.84.0' // 'undici'

export enum CONTENT_TYPES {
  JSON = "application/json",
  FORM = "application/x-www-form-urlencoded",
}

export const toQueryString = (
  queryParams: Record<string, string | number | undefined>,
) => {
  const queryParamsInternal = new URLSearchParams();
  for (const key of Object.keys(queryParams)) {
    if (queryParams[key] != undefined) {
      queryParamsInternal.set(key, String(queryParams[key]));
    }
  }
  return queryParamsInternal.toString();
};

class Response {
  private raw: IncomingMessage;

  public status?: number;

  public statusText?: string;

  public url?: string;

  constructor(original: IncomingMessage) {
    this.raw = original;
    this.status = original.statusCode;
    this.statusText = original.statusMessage;
    this.url = original.url;
  }

  async text(): Promise<string> {
    return new Promise((resolve, reject) => {
      let data = "";
      this.raw.on("data", (chunk: Buffer) => {
        data += chunk.toString("utf8");
      });
      this.raw.on("end", () => resolve(data));
      this.raw.on("error", reject);
    });
  }

  async json<T = Record<string, any>>(): Promise<T> {
    const data = await this.text();
    return JSON.parse(data);
  }

  get ok() {
    return (
      this.status !== undefined && this.status >= 200 && this.status <= 299
    );
  }
}

export enum FetchMethod {
  GET = "GET",
  POST = "POST",
  PATCH = "PATCH",
  PUT = "PUT",
  DELETE = "DELETE",
}

type FetchOptions = {
  method?: keyof typeof FetchMethod;
  headers: Record<string, string>;
  body?: string | Record<string, any> | Readable;
  signal?: AbortSignal;
  queryParams?: Record<string, string | number | undefined>;
};

export const fetch = async (
  url: string,
  { body, queryParams, headers, ...configInput }: FetchOptions,
): Promise<Response> => {
  const config = {
    method: FetchMethod.GET,
    headers: headers ?? {},
    ...configInput,
  };

  if (config.headers["User-Agent"] === undefined) {
    config.headers["User-Agent"] = USER_AGENT;
  }

  if (queryParams) {
    url = `${url}?${toQueryString(queryParams)}`;
  }

  if (
    body !== undefined &&
    typeof body !== "string" &&
    !(body instanceof Readable)
  ) {
    if (config.headers["Content-Type"] === CONTENT_TYPES.FORM) {
      body = toQueryString(body as Record<string, any>);
    } else {
      body = JSON.stringify(body);
    }
  }

  return new Promise((resolve, reject) => {
    const req = request(url, config, (res) => {
      resolve(new Response(res));
    });
    req.on("error", reject);

    if (body instanceof Readable) {
      body.pipe(req);
      body.on("end", () => req.end());
    } else {
      if (body !== undefined) {
        req.write(body);
      }
      req.end();
    }
  });
};
