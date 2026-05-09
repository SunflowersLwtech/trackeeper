jest.mock("firebase/firestore", () => ({
  Timestamp: {
    fromDate: (d: Date) => ({
      toMillis: () => d.getTime(),
      toDate: () => d,
    }),
    fromMillis: (ms: number) => ({
      toMillis: () => ms,
      toDate: () => new Date(ms),
    }),
    now: () => ({
      toMillis: () => Date.now(),
      toDate: () => new Date(),
    }),
  },
}));

import {
  SLA_TARGETS,
  computeSlaTargets,
  pauseSla,
  resumeSla,
  effectiveResolutionAt,
  slaRemainingMs,
  slaSeverity,
  formatSlaRemaining,
  priorityToSlaPriority,
} from "@/utils/sla";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe("SLA_TARGETS — industry medians", () => {
  it("emergency = 1h response / 4h resolution", () => {
    expect(SLA_TARGETS.emergency).toEqual({ responseMs: 1 * HOUR, resolutionMs: 4 * HOUR });
  });
  it("high = 4h / 24h", () => {
    expect(SLA_TARGETS.high).toEqual({ responseMs: 4 * HOUR, resolutionMs: 24 * HOUR });
  });
  it("medium = 8h / 72h", () => {
    expect(SLA_TARGETS.medium).toEqual({ responseMs: 8 * HOUR, resolutionMs: 72 * HOUR });
  });
  it("low = 24h / 7d", () => {
    expect(SLA_TARGETS.low).toEqual({ responseMs: 24 * HOUR, resolutionMs: 7 * DAY });
  });
});

describe("priorityToSlaPriority", () => {
  it("maps high → high", () => {
    expect(priorityToSlaPriority("high")).toBe("high");
  });
  it("maps medium → medium", () => {
    expect(priorityToSlaPriority("medium")).toBe("medium");
  });
  it("maps low → low", () => {
    expect(priorityToSlaPriority("low")).toBe("low");
  });
});

describe("computeSlaTargets", () => {
  it("derives target timestamps from createdAt + spec", () => {
    const created = new Date("2026-05-01T10:00:00Z");
    const sla = computeSlaTargets("high", created);
    expect(sla.responseTargetAt.toMillis()).toBe(created.getTime() + 4 * HOUR);
    expect(sla.resolutionTargetAt.toMillis()).toBe(created.getTime() + 24 * HOUR);
    expect(sla.totalPausedMs).toBe(0);
    expect(sla.pausedAt).toBeNull();
    expect(sla.breachedResponse).toBe(false);
    expect(sla.breachedResolution).toBe(false);
  });
});

describe("pauseSla / resumeSla", () => {
  const baseSla = computeSlaTargets("high", new Date("2026-05-01T10:00:00Z"));

  it("pause sets pausedAt", () => {
    const paused = pauseSla(baseSla, new Date("2026-05-01T11:00:00Z"));
    expect(paused.pausedAt).not.toBeNull();
    expect(paused.totalPausedMs).toBe(0);
  });

  it("pause is a no-op if already paused", () => {
    const once = pauseSla(baseSla, new Date("2026-05-01T11:00:00Z"));
    const twice = pauseSla(once, new Date("2026-05-01T12:00:00Z"));
    expect(twice.pausedAt!.toMillis()).toBe(once.pausedAt!.toMillis());
  });

  it("resume accumulates paused duration", () => {
    const paused = pauseSla(baseSla, new Date("2026-05-01T11:00:00Z"));
    const resumed = resumeSla(paused, new Date("2026-05-01T13:00:00Z"));
    expect(resumed.pausedAt).toBeNull();
    expect(resumed.totalPausedMs).toBe(2 * HOUR);
  });

  it("resume is a no-op if not paused", () => {
    const x = resumeSla(baseSla, new Date());
    expect(x).toEqual(baseSla);
  });
});

describe("effectiveResolutionAt", () => {
  const created = new Date("2026-05-01T10:00:00Z");
  const baseSla = computeSlaTargets("high", created);

  it("equals raw target when never paused", () => {
    const eff = effectiveResolutionAt(baseSla, new Date("2026-05-01T15:00:00Z"));
    expect(eff).toBe(baseSla.resolutionTargetAt.toMillis());
  });

  it("adds totalPausedMs", () => {
    const sla = { ...baseSla, totalPausedMs: 3 * HOUR };
    const eff = effectiveResolutionAt(sla, new Date("2026-05-01T20:00:00Z"));
    expect(eff).toBe(sla.resolutionTargetAt.toMillis() + 3 * HOUR);
  });

  it("counts current pause segment too", () => {
    const sla = pauseSla(baseSla, new Date("2026-05-01T11:00:00Z"));
    const eff = effectiveResolutionAt(sla, new Date("2026-05-01T13:00:00Z"));
    expect(eff).toBe(sla.resolutionTargetAt.toMillis() + 2 * HOUR);
  });
});

describe("slaSeverity", () => {
  const created = new Date("2026-05-01T10:00:00Z");

  it("returns 'breached' when remaining ≤ 0", () => {
    const sla = computeSlaTargets("emergency", created);
    expect(slaSeverity(sla, new Date("2026-05-01T15:00:00Z"))).toBe("breached"); // past 4h target
  });

  it("returns 'danger' when remaining < 20% of window", () => {
    const sla = computeSlaTargets("high", created);
    // 24h window, danger if remaining < 4.8h. Check at 20h elapsed → 4h left = 16.6%
    expect(slaSeverity(sla, new Date("2026-05-02T06:00:00Z"))).toBe("danger");
  });

  it("returns 'warning' when 20%-50% remaining", () => {
    const sla = computeSlaTargets("high", created);
    // 24h window — warning band is (20%, 50%]. Pick 30% remaining (~7.2h left).
    expect(slaSeverity(sla, new Date("2026-05-02T02:48:00Z"))).toBe("warning");
  });

  it("returns 'ok' when more than 50% remaining", () => {
    const sla = computeSlaTargets("high", created);
    expect(slaSeverity(sla, new Date("2026-05-01T11:00:00Z"))).toBe("ok"); // 23h left
  });
});

describe("formatSlaRemaining", () => {
  it("formats positive duration", () => {
    expect(formatSlaRemaining(2 * HOUR + 14 * 60 * 1000)).toBe("2h 14m");
  });
  it("prefixes OVERDUE for negative", () => {
    expect(formatSlaRemaining(-(35 * 60 * 1000))).toBe("OVERDUE 35m");
  });
  it("uses days when > 1 day", () => {
    expect(formatSlaRemaining(3 * DAY + 5 * HOUR)).toBe("3d 5h");
  });
  it("falls back to 0m for very small remainders", () => {
    expect(formatSlaRemaining(5_000)).toBe("0m");
  });
});

describe("slaRemainingMs", () => {
  const created = new Date("2026-05-01T10:00:00Z");

  it("returns positive when before target", () => {
    const sla = computeSlaTargets("high", created);
    expect(slaRemainingMs(sla, new Date("2026-05-01T14:00:00Z"))).toBeGreaterThan(0);
  });

  it("returns negative when after target", () => {
    const sla = computeSlaTargets("emergency", created);
    expect(slaRemainingMs(sla, new Date("2026-05-01T15:00:00Z"))).toBeLessThan(0);
  });

  it("recovers ground when SLA was paused", () => {
    const sla = computeSlaTargets("high", created);
    const pausedAndResumed = resumeSla(
      pauseSla(sla, new Date("2026-05-01T11:00:00Z")),
      new Date("2026-05-01T13:00:00Z"),
    );
    // 2h paused → effective deadline pushed 2h forward
    expect(slaRemainingMs(pausedAndResumed, new Date("2026-05-02T10:00:00Z"))).toBe(2 * HOUR);
  });
});
