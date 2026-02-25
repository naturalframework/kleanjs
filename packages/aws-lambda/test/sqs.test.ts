import { describe, it, expect, vi } from "vitest";
import { middlewareParallel, middlewareSeries, Use } from "../src/sqs/index";
import type { SQSEvent, Context } from "aws-lambda";

describe("SQS Adapters", () => {
  const mockContext = {} as Context;

  const createSqsEvent = (bodies: Record<string, any>[]): SQSEvent => ({
    Records: bodies.map((b, i) => ({
      messageId: `id_${i}`,
      body: JSON.stringify(b),
      eventSource: "aws:sqs"
    }))
  } as any);

  describe("middlewareParallel", () => {
    it("should process all records and return empty batchItemFailures on success", async () => {
      const handler = vi.fn().mockResolvedValue(null);
      const mw = middlewareParallel(handler, {
        validators: { body: Use<{ id: number }>() }
      });

      const event = createSqsEvent([{ id: 1 }, { id: 2 }]);
      const result = await mw(event, mockContext);

      expect(handler).toHaveBeenCalledTimes(2);
      expect(result.batchItemFailures).toHaveLength(0);
    });

    it("should report batchItemFailures for failed records in parallel", async () => {
      const handler = vi.fn()
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error("Failure"));

      const mw = middlewareParallel(handler);
      const event = createSqsEvent([{ id: 1 }, { id: 2 }]);
      const result = await mw(event, mockContext);

      expect(result.batchItemFailures).toHaveLength(1);
      expect(result.batchItemFailures[0].itemIdentifier).toBe("id_1");
    });
  });

  describe("middlewareSeries", () => {
    it("should process records sequentially and stop/report correctly", async () => {
      const callOrder: string[] = [];
      const handler = vi.fn().mockImplementation(async (record) => {
        callOrder.push(record.messageId);
        if (record.messageId === "id_1") throw new Error("Stop");
      });

      const mw = middlewareSeries(handler);
      const event = createSqsEvent([{ id: 1 }, { id: 2 }, { id: 3 }]);
      const result = await mw(event, mockContext);

      // In series, if one fails, it continues or reports based on the loop logic
      // In our implementation, it catches and continues but collects the ID
      expect(callOrder).toEqual(["id_0", "id_1", "id_2"]);
      expect(result.batchItemFailures).toHaveLength(1);
      expect(result.batchItemFailures[0].itemIdentifier).toBe("id_1");
    });
  });
});
