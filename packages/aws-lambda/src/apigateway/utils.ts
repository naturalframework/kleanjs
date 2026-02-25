import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export const HEADER_TYPE_JSON = { "Content-Type": "application/json" };
export const HEADER_TYPE_HTML = { "Content-Type": "text/html" };
export const HEADER_TYPE_OCTET = { "Content-Type": "application/octet-stream" };
export const HEADER_TYPE_PLAIN = { "Content-Type": "text/plain" };

const CONTENT_TYPE_JSON = "application/json";
const CONTENT_TYPE_FORM = "application/x-www-form-urlencoded";

export interface ResponseOptions {
  statusCode?: number;
  headers?: Record<string, string | boolean | number>;
  multiValueHeaders?: Record<string, (string | boolean | number)[]>;
  isBase64Encoded?: boolean;
  cookies?: string[];
}

export const getBody = <T = unknown>(event: APIGatewayProxyEvent): T => {
  if (!event.body) return {} as T;

  const contentType = event.headers["content-type"] || event.headers["Content-Type"] || "";
  const payload = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;

  if (contentType.includes(CONTENT_TYPE_FORM)) {
    return Object.fromEntries(new URLSearchParams(payload)) as unknown as T;
  }

  if (contentType.includes(CONTENT_TYPE_JSON)) {
    try {
      return JSON.parse(payload) as T;
    } catch {
      return payload as unknown as T;
    }
  }

  return payload as unknown as T;
};

export const responseJSON = (options: ResponseOptions = {}) => {
  const { statusCode = 200, headers, ...rest } = options;
  const finalHeaders = { ...HEADER_TYPE_JSON, ...headers };

  return (data: any): APIGatewayProxyResult => ({
    statusCode,
    headers: finalHeaders,
    body: JSON.stringify(data ?? null),
    ...rest,
  } as APIGatewayProxyResult);
};

export const responseHTML = (options: ResponseOptions = {}) => {
  const { statusCode = 200, headers, ...rest } = options;
  const finalHeaders = { ...HEADER_TYPE_HTML, ...headers };

  return (html: string): APIGatewayProxyResult => ({
    statusCode,
    headers: finalHeaders,
    body: html,
    ...rest,
  } as APIGatewayProxyResult);
};

export const responseMediaFile = (options: ResponseOptions & { contentType?: string } = {}) => {
  const { statusCode = 200, contentType = "application/octet-stream", headers, ...rest } = options;
  const finalHeaders = { "Content-Type": contentType, ...headers };

  return (base64: string): APIGatewayProxyResult => ({
    statusCode,
    headers: finalHeaders,
    body: base64,
    isBase64Encoded: true,
    ...rest,
  } as APIGatewayProxyResult);
};

export const responseRedirect = (options: ResponseOptions = {}) => {
  const { statusCode = 302, headers, ...rest } = options;

  return (url: string): APIGatewayProxyResult => ({
    statusCode,
    headers: { Location: url, ...headers },
    body: "",
    ...rest,
  } as APIGatewayProxyResult);
};
