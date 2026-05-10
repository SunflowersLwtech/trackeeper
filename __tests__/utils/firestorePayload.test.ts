import { withoutUndefined } from "@/utils/firestorePayload";

describe("withoutUndefined", () => {
  it("removes undefined from nested plain objects and arrays", () => {
    expect(withoutUndefined({
      keep: "yes",
      drop: undefined,
      nested: {
        alsoDrop: undefined,
        value: 1,
      },
      items: ["a", undefined, { x: undefined, y: "b" }],
    })).toEqual({
      keep: "yes",
      nested: { value: 1 },
      items: ["a", { y: "b" }],
    });
  });

  it("preserves non-plain SDK sentinel-like objects", () => {
    class Sentinel {
      readonly kind = "serverTimestamp";
    }
    const sentinel = new Sentinel();

    expect(withoutUndefined({ createdAt: sentinel })).toEqual({ createdAt: sentinel });
  });
});
