import { mockEventPOST } from "./schemas";
import { handler as kleanjsHandler } from "./kleanjs-handler";
import { handler as middyHandler } from "./middy-handler";
import { Context } from "aws-lambda";

async function main() {
  console.time("kleanjs");
  const res = await kleanjsHandler(mockEventPOST);
  console.timeEnd("kleanjs");
  console.log("resKleanJS", res);

  console.time("middy");
  const res2 = await middyHandler(mockEventPOST, {} as Context);
  console.timeEnd("middy");
  console.log("resMiddy", res2);
}

main();
