import {
  PRIORITY_ORDER,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  getPriorityColor,
  getPriorityLabel,
  getPriorityWeight,
} from "@/utils/priority";

describe("priority utils", () => {
  describe("PRIORITY_ORDER", () => {
    it("lists high first (for sorting)", () => {
      expect(PRIORITY_ORDER).toEqual(["high", "medium", "low"]);
    });
  });

  describe("PRIORITY_COLORS", () => {
    it("has red for high", () => {
      expect(PRIORITY_COLORS.high).toBe("#ef4444");
    });
    it("has amber for medium", () => {
      expect(PRIORITY_COLORS.medium).toBe("#f59e0b");
    });
    it("has green for low", () => {
      expect(PRIORITY_COLORS.low).toBe("#22c55e");
    });
  });

  describe("PRIORITY_LABELS", () => {
    it("has human-readable labels", () => {
      expect(PRIORITY_LABELS.high).toBe("High");
      expect(PRIORITY_LABELS.medium).toBe("Medium");
      expect(PRIORITY_LABELS.low).toBe("Low");
    });
  });

  describe("getPriorityColor", () => {
    it("returns correct color for each priority", () => {
      expect(getPriorityColor("high")).toBe("#ef4444");
      expect(getPriorityColor("medium")).toBe("#f59e0b");
      expect(getPriorityColor("low")).toBe("#22c55e");
    });

    it("returns fallback for unknown priority", () => {
      expect(getPriorityColor("unknown" as never)).toBe("#9ca3af");
    });
  });

  describe("getPriorityLabel", () => {
    it("returns correct label for each priority", () => {
      expect(getPriorityLabel("high")).toBe("High");
      expect(getPriorityLabel("medium")).toBe("Medium");
      expect(getPriorityLabel("low")).toBe("Low");
    });

    it("returns raw value for unknown priority", () => {
      expect(getPriorityLabel("unknown" as never)).toBe("unknown");
    });
  });

  describe("getPriorityWeight", () => {
    it("returns lower weight for higher priority (for sorting)", () => {
      expect(getPriorityWeight("high")).toBeLessThan(getPriorityWeight("medium"));
      expect(getPriorityWeight("medium")).toBeLessThan(getPriorityWeight("low"));
    });
  });
});
