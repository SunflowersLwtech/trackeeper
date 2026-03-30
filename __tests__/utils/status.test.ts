import {
  canTransition,
  getNextStatuses,
  getStatusColor,
  getStatusLabel,
  getStatusIndex,
  STATUS_ORDER,
} from "@/utils/status";

describe("status utils", () => {
  describe("canTransition", () => {
    it("allows submitted → assigned", () => {
      expect(canTransition("submitted", "assigned")).toBe(true);
    });

    it("allows assigned → in_progress", () => {
      expect(canTransition("assigned", "in_progress")).toBe(true);
    });

    it("allows in_progress → completed", () => {
      expect(canTransition("in_progress", "completed")).toBe(true);
    });

    it("rejects backward transition completed → in_progress", () => {
      expect(canTransition("completed", "in_progress")).toBe(false);
    });

    it("rejects backward transition assigned → submitted", () => {
      expect(canTransition("assigned", "submitted")).toBe(false);
    });

    it("rejects skipping submitted → in_progress", () => {
      expect(canTransition("submitted", "in_progress")).toBe(false);
    });

    it("rejects skipping submitted → completed", () => {
      expect(canTransition("submitted", "completed")).toBe(false);
    });

    it("rejects same-state transition", () => {
      expect(canTransition("assigned", "assigned")).toBe(false);
    });
  });

  describe("getNextStatuses", () => {
    it("returns [assigned] for submitted", () => {
      expect(getNextStatuses("submitted")).toEqual(["assigned"]);
    });

    it("returns [in_progress] for assigned", () => {
      expect(getNextStatuses("assigned")).toEqual(["in_progress"]);
    });

    it("returns [completed] for in_progress", () => {
      expect(getNextStatuses("in_progress")).toEqual(["completed"]);
    });

    it("returns [] for completed (terminal state)", () => {
      expect(getNextStatuses("completed")).toEqual([]);
    });
  });

  describe("getStatusColor", () => {
    it("returns gray for submitted", () => {
      expect(getStatusColor("submitted")).toBe("#9ca3af");
    });

    it("returns blue for assigned", () => {
      expect(getStatusColor("assigned")).toBe("#3b82f6");
    });

    it("returns amber for in_progress", () => {
      expect(getStatusColor("in_progress")).toBe("#f59e0b");
    });

    it("returns green for completed", () => {
      expect(getStatusColor("completed")).toBe("#22c55e");
    });
  });

  describe("getStatusLabel", () => {
    it("returns human-readable labels", () => {
      expect(getStatusLabel("submitted")).toBe("Submitted");
      expect(getStatusLabel("in_progress")).toBe("In Progress");
    });
  });

  describe("getStatusIndex", () => {
    it("returns correct index for each status", () => {
      expect(getStatusIndex("submitted")).toBe(0);
      expect(getStatusIndex("assigned")).toBe(1);
      expect(getStatusIndex("in_progress")).toBe(2);
      expect(getStatusIndex("completed")).toBe(3);
    });
  });

  describe("STATUS_ORDER", () => {
    it("has exactly 4 statuses", () => {
      expect(STATUS_ORDER).toHaveLength(4);
    });

    it("is in correct order", () => {
      expect(STATUS_ORDER).toEqual(["submitted", "assigned", "in_progress", "completed"]);
    });
  });
});
