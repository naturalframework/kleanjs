import { APIGatewayProxyEvent } from "aws-lambda";

const HEADER_FORM = "application/x-www-form-urlencoded";
const HEADER_JSON = "application/json";

export const RESPONSE_TYPE_JSON = "application/json; charset=utf-8";
export const RESPONSE_TYPE_PLAIN = "text/plain; charset=utf-8";
export const RESPONSE_TYPE_HTML = "text/html; charset=utf-8";
export const RESPONSE_TYPE_OCTET = "application/octet-stream";

const METHODS_WITHOUT_BODY = ["GET", "DELETE", "HEAD", "OPTIONS"];

export const getBody = (event: APIGatewayProxyEvent) => {
  if (METHODS_WITHOUT_BODY.includes(event.httpMethod)) {
    return null;
  }

  const contentType: string =
    event.headers?.["content-type"] ?? event.headers?.["Content-Type"] ?? "";

  const bodyText = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64").toString()
    : event.body || "";

  let body: Record<string, any> = {};

  try {
    if (contentType.includes(HEADER_FORM)) {
      const params = new URLSearchParams(bodyText);
      params.forEach((value, key) => {
        body[key] = value;
      });
    } else if (bodyText && contentType.includes(HEADER_JSON)) {
      body = JSON.parse(bodyText);
    }
    return body;
  } catch (err) {
    throw new Error("Invalid or malformed JSON was provided");
  }
};
