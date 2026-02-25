import type { SQSRecord } from "aws-lambda";

export const getBody = <T = unknown>(record: SQSRecord): T => {
  const payload = record.body;

  if (!payload) {
    return {} as T;
  }

  try {
    return JSON.parse(payload) as T;
  } catch {
    return payload as unknown as T;
  }
};
