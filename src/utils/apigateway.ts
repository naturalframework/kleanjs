import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const HEADER_FORM = "application/x-www-form-urlencoded";
const HEADER_JSON = "application/json";

export const HEADER_TYPE_JSON = "application/json; charset=utf-8";
export const HEADER_TYPE_PLAIN = "text/plain; charset=utf-8";
export const HEADER_TYPE_HTML = "text/html; charset=utf-8";
export const HEADER_TYPE_OCTET = "application/octet-stream";

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

export const responseJSON = <TResult = APIGatewayProxyResult>(
  data: any,
  statusCode = 200,
): TResult => {
  return {
    statusCode,
    headers: {
      "Content-Type": HEADER_TYPE_JSON,
    },
    body: typeof data === "string" ? data : JSON.stringify(data),
  } as TResult;
};

export const responseHTML = <TResult = APIGatewayProxyEvent>(
  data: any,
  statusCode = 200,
) => {
  return {
    statusCode,
    headers: {
      "Content-Type": HEADER_TYPE_HTML,
    },
    body: `<!DOCTYPE html>${data}`,
  } as TResult;
};

export const responseRedirect = <TResult = APIGatewayProxyResult>(
  data: any,
  statusCode = 302,
) => {
  return {
    statusCode,
    headers: {
      Location: data,
    },
    body: "",
  } as TResult;
};

export const responseMediaFile = <TResult = APIGatewayProxyResult>(
  data: any,
  statusCode = 200,
) => {
  return {
    statusCode,
    headers: { "Content-Type": HEADER_TYPE_OCTET },
    isBase64Encoded: true,
    body: Buffer.isBuffer(data) ? data.toString("base64") : String(data),
  } as TResult;
};
