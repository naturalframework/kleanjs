import { bench, describe } from "vitest";
import { mockEventPOST } from "../demo/schemas";
import { handler as kleanjsHandler } from "../demo/kleanjs-handler";
import { handler as middyHandler } from "../demo/middy-handler";
import { Context } from "aws-lambda";

const eventContext = {} as Context;

/* // Warm-up
for (let i = 0; i < 100; i++) {
  invokeKleanJS();
  invokeMiddy();
} */

describe("Validation Performance: POST Event", () => {
  bench("kleanjs/apigateway", async () => {
    await kleanjsHandler({ ...mockEventPOST }, eventContext);
  });

  bench("Middy", async () => {
    await middyHandler({ ...mockEventPOST }, eventContext);
  });
});

// Métrica adicional: uso de memoria
/* describe("Memory Usage", () => {
  bench("kleanjs memory", () => {
    const before = process.memoryUsage().heapUsed;
    invokeKleanJS();
    const after = process.memoryUsage().heapUsed;
    return after - before;
  });

  bench("Middy memory", async () => {
    const before = process.memoryUsage().heapUsed;
    invokeMiddy();
    const after = process.memoryUsage().heapUsed;
    return after - before;
  });
}); */
