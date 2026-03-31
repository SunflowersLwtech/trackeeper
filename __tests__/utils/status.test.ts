import {
  canTransition,
  canCancel,
  getNextStatuses,
  getStatusColor,
  getStatusLabel,
  getStatusIndex,
  STATUS_ORDER,
  canTransitionWithRole,
  getNextStatusesForRole,
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

    it("allows submitted → cancelled", () => {
      expect(canTransition("submitted", "cancelled")).toBe(true);
    });

    it("allows assigned → cancelled", () => {
      expect(canTransition("assigned", "cancelled")).toBe(true);
    });

    it("rejects in_progress → cancelled", () => {
      expect(canTransition("in_progress", "cancelled")).toBe(false);
    });

    it("allows assigned → on_hold", () => {
      expect(canTransition("assigned", "on_hold")).toBe(true);
    });

    it("allows in_progress → on_hold", () => {
      expect(canTransition("in_progress", "on_hold")).toBe(true);
    });

    it("allows on_hold → assigned", () => {
      expect(canTransition("on_hold", "assigned")).toBe(true);
    });

    it("allows on_hold → in_progress", () => {
      expect(canTransition("on_hold", "in_progress")).toBe(true);
    });

    it("rejects on_hold → completed", () => {
      expect(canTransition("on_hold", "completed")).toBe(false);
    });

    it("rejects submitted → on_hold", () => {
      expect(canTransition("submitted", "on_hold")).toBe(false);
    });

    it("rejects completed → cancelled", () => {
      expect(canTransition("completed", "cancelled")).toBe(false);
    });
  });

  describe("getNextStatuses", () => {
    it("returns [assigned] for submitted", () => {
      expect(getNextStatuses("submitted")).toEqual(["assigned"]);
    });

    it("returns [in_progress, on_hold] for assigned", () => {
      expect(getNextStatuses("assigned")).toEqual(["in_progress", "on_hold"]);
    });

    it("returns [completed, on_hold] for in_progress", () => {
      expect(getNextStatuses("in_progress")).toEqual(["completed", "on_hold"]);
    });

    it("returns [assigned, in_progress] for on_hold", () => {
      expect(getNextStatuses("on_hold")).toEqual(["assigned", "in_progress"]);
    });

    it("returns [] for completed (terminal state)", () => {
      expect(getNextStatuses("completed")).toEqual([]);
    });

    it("returns [] for cancelled (terminal state)", () => {
      expect(getNextStatuses("cancelled")).toEqual([]);
    });
  });

  describe("canCancel", () => {
    it("returns true for submitted", () => {
      expect(canCancel("submitted")).toBe(true);
    });

    it("returns true for assigned", () => {
      expect(canCancel("assigned")).toBe(true);
    });

    it("returns false for in_progress", () => {
      expect(canCancel("in_progress")).toBe(false);
    });

    it("returns false for completed", () => {
      expect(canCancel("completed")).toBe(false);
    });

    it("returns false for cancelled", () => {
      expect(canCancel("cancelled")).toBe(false);
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

    it("returns red for cancelled", () => {
      expect(getStatusColor("cancelled")).toBe("#ef4444");
    });

    it("returns violet for on_hold", () => {
      expect(getStatusColor("on_hold")).toBe("#8b5cf6");
    });
  });

  describe("getStatusLabel", () => {
    it("returns human-readable labels", () => {
      expect(getStatusLabel("submitted")).toBe("Submitted");
      expect(getStatusLabel("in_progress")).toBe("In Progress");
      expect(getStatusLabel("cancelled")).toBe("Cancelled");
    });

    it("returns On Hold for on_hold", () => {
      expect(getStatusLabel("on_hold")).toBe("On Hold");
    });
  });

  describe("getStatusIndex", () => {
    it("returns correct index for each status", () => {
      expect(getStatusIndex("submitted")).toBe(0);
      expect(getStatusIndex("assigned")).toBe(1);
      expect(getStatusIndex("in_progress")).toBe(2);
      expect(getStatusIndex("completed")).toBe(3);
    });

    it("returns -1 for cancelled (not in linear order)", () => {
      expect(getStatusIndex("cancelled")).toBe(-1);
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

  describe("canTransitionWithRole", () => {
    // Tenant transitions
    it("allows tenant: submitted → cancelled", () => {
      expect(canTransitionWithRole("submitted", "cancelled", "tenant")).toBe(true);
    });
    it("allows tenant: assigned → cancelled", () => {
      expect(canTransitionWithRole("assigned", "cancelled", "tenant")).toBe(true);
    });
    it("rejects tenant: submitted → assigned", () => {
      expect(canTransitionWithRole("submitted", "assigned", "tenant")).toBe(false);
    });
    it("rejects tenant: in_progress → cancelled", () => {
      expect(canTransitionWithRole("in_progress", "cancelled", "tenant")).toBe(false);
    });

    // Manager transitions
    it("allows manager: submitted → assigned", () => {
      expect(canTransitionWithRole("submitted", "assigned", "manager")).toBe(true);
    });
    it("allows manager: assigned → on_hold", () => {
      expect(canTransitionWithRole("assigned", "on_hold", "manager")).toBe(true);
    });
    it("allows manager: in_progress → on_hold", () => {
      expect(canTransitionWithRole("in_progress", "on_hold", "manager")).toBe(true);
    });
    it("allows manager: on_hold → assigned", () => {
      expect(canTransitionWithRole("on_hold", "assigned", "manager")).toBe(true);
    });
    it("allows manager: on_hold → in_progress", () => {
      expect(canTransitionWithRole("on_hold", "in_progress", "manager")).toBe(true);
    });
    it("rejects manager: assigned → in_progress", () => {
      expect(canTransitionWithRole("assigned", "in_progress", "manager")).toBe(false);
    });
    it("rejects manager: in_progress → completed", () => {
      expect(canTransitionWithRole("in_progress", "completed", "manager")).toBe(false);
    });

    // Maintainer transitions
    it("allows maintainer: assigned → in_progress", () => {
      expect(canTransitionWithRole("assigned", "in_progress", "maintainer")).toBe(true);
    });
    it("allows maintainer: in_progress → completed", () => {
      expect(canTransitionWithRole("in_progress", "completed", "maintainer")).toBe(true);
    });
    it("allows maintainer: assigned → on_hold", () => {
      expect(canTransitionWithRole("assigned", "on_hold", "maintainer")).toBe(true);
    });
    it("allows maintainer: in_progress → on_hold", () => {
      expect(canTransitionWithRole("in_progress", "on_hold", "maintainer")).toBe(true);
    });
    it("allows maintainer: on_hold → assigned", () => {
      expect(canTransitionWithRole("on_hold", "assigned", "maintainer")).toBe(true);
    });
    it("allows maintainer: on_hold → in_progress", () => {
      expect(canTransitionWithRole("on_hold", "in_progress", "maintainer")).toBe(true);
    });
    it("rejects maintainer: submitted → assigned", () => {
      expect(canTransitionWithRole("submitted", "assigned", "maintainer")).toBe(false);
    });
  });

  describe("getNextStatusesForRole", () => {
    it("tenant from submitted: [cancelled]", () => {
      expect(getNextStatusesForRole("submitted", "tenant")).toEqual(["cancelled"]);
    });
    it("tenant from assigned: [cancelled]", () => {
      expect(getNextStatusesForRole("assigned", "tenant")).toEqual(["cancelled"]);
    });
    it("tenant from in_progress: []", () => {
      expect(getNextStatusesForRole("in_progress", "tenant")).toEqual([]);
    });
    it("manager from submitted: [assigned]", () => {
      expect(getNextStatusesForRole("submitted", "manager")).toEqual(["assigned"]);
    });
    it("manager from on_hold: [assigned, in_progress]", () => {
      expect(getNextStatusesForRole("on_hold", "manager")).toEqual(["assigned", "in_progress"]);
    });
    it("maintainer from assigned: [in_progress, on_hold]", () => {
      expect(getNextStatusesForRole("assigned", "maintainer")).toEqual(["in_progress", "on_hold"]);
    });
    it("maintainer from in_progress: [completed, on_hold]", () => {
      expect(getNextStatusesForRole("in_progress", "maintainer")).toEqual(["completed", "on_hold"]);
    });
  });
});
