import { describe, it, expectTypeOf } from "vitest";
import { middleware, Use, TCombinedEvent, AJVFullError } from "../src/index";

type TInterface<T> = { __isContract: true; __type: T };

describe("Core Middleware Type Integrity", () => {

  it("should verify that TCombinedEvent overrides original keys with validated ones", () => {
    interface Original { id: number; name: string }
    interface Validated { id: string } // Overriding number with string

    type Result = TCombinedEvent<Original, { id: TInterface<Validated["id"]> }>;

    expectTypeOf<Result["id"]>().toBeString();
    expectTypeOf<Result["name"]>().toBeString();
  });

  it("should infer full handler signature from declarative config", () => {
    interface Ev { raw: string }
    interface Ctx { user: { id: string } }
    interface Res { body: string; status: number }
    interface Body { count: number }

    const mw = middleware(
      (event, context) => {
        expectTypeOf(event.raw).toBeString();
        expectTypeOf(event.body.count).toBeNumber();
        expectTypeOf(context!.user.id).toBeString();

        return { body: "ok", status: 200 };
      },
      {
        event: Use<Ev>(),
        context: Use<Ctx>(),
        result: Use<Res>(),
        validators: {
          body: Use<Body>()
        }
      }
    );

    expectTypeOf(mw).returns.resolves.toExtend<Res>();
  });

  it("should enforce correct types in customResponse", () => {
    middleware(
      async () => ({ score: 100 }),
      {
        context: Use<{ trace: string }>(),
        customResponse: (data: { score: number }, context) => {
          expectTypeOf(data.score).toBeNumber();
          expectTypeOf(context!.trace).toBeString();
          return "formatted-string";
        }
      }
    );
  });

  it("should support the ajvError class injection type", () => {
    middleware(async () => {}, {
      ajvError: AJVFullError,
      validators: { test: { type: "string" } }
    });
  });
});
