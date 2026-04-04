import { formatTimeAgo, formatTime, formatDateTime } from "@/utils/time";

describe("formatTimeAgo", () => {
  it("returns 'Just now' for less than 1 minute ago", () => {
    const now = new Date();
    expect(formatTimeAgo(now)).toBe("Just now");
    expect(formatTimeAgo(new Date(now.getTime() - 30000))).toBe("Just now");
  });

  it("returns minutes for 1-59 minutes ago", () => {
    const now = new Date();
    expect(formatTimeAgo(new Date(now.getTime() - 60000))).toBe("1m ago");
    expect(formatTimeAgo(new Date(now.getTime() - 30 * 60000))).toBe("30m ago");
    expect(formatTimeAgo(new Date(now.getTime() - 59 * 60000))).toBe("59m ago");
  });

  it("returns hours for 1-23 hours ago", () => {
    const now = new Date();
    expect(formatTimeAgo(new Date(now.getTime() - 60 * 60000))).toBe("1h ago");
    expect(formatTimeAgo(new Date(now.getTime() - 12 * 60 * 60000))).toBe("12h ago");
    expect(formatTimeAgo(new Date(now.getTime() - 23 * 60 * 60000))).toBe("23h ago");
  });

  it("returns days for 24+ hours ago", () => {
    const now = new Date();
    expect(formatTimeAgo(new Date(now.getTime() - 24 * 60 * 60000))).toBe("1d ago");
    expect(formatTimeAgo(new Date(now.getTime() - 7 * 24 * 60 * 60000))).toBe("7d ago");
  });
});

describe("formatTime", () => {
  it("formats time as HH:MM with zero padding", () => {
    expect(formatTime(new Date(2026, 0, 1, 9, 5))).toBe("09:05");
    expect(formatTime(new Date(2026, 0, 1, 14, 30))).toBe("14:30");
    expect(formatTime(new Date(2026, 0, 1, 0, 0))).toBe("00:00");
    expect(formatTime(new Date(2026, 0, 1, 23, 59))).toBe("23:59");
  });
});

describe("formatDateTime", () => {
  it("formats as d/MM HH:MM", () => {
    expect(formatDateTime(new Date(2026, 3, 3, 9, 45))).toBe("3/04 09:45");
    expect(formatDateTime(new Date(2026, 0, 15, 14, 0))).toBe("15/01 14:00");
    expect(formatDateTime(new Date(2026, 11, 1, 0, 5))).toBe("1/12 00:05");
  });
});
