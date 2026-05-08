import { RequestCategory, RequestPriority, PrioritySuggestion } from "@/types";

export const PRIORITY_ORDER: RequestPriority[] = ["high", "medium", "low"];

export const PRIORITY_COLORS: Record<RequestPriority, string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#ef4444",
};

export const PRIORITY_LABELS: Record<RequestPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function getPriorityColor(priority: RequestPriority): string {
  return PRIORITY_COLORS[priority] ?? "#9ca3af";
}

export function getPriorityLabel(priority: RequestPriority): string {
  return PRIORITY_LABELS[priority] ?? priority;
}

export function getPriorityWeight(priority: RequestPriority): number {
  return PRIORITY_ORDER.indexOf(priority);
}

const PRIORITY_TEXT_COLORS: Record<RequestPriority, string> = {
  low: "#166534",
  medium: "#92400e",
  high: "#b91c1c",
};

export function getPriorityTextColor(priority: RequestPriority): string {
  return PRIORITY_TEXT_COLORS[priority] ?? "#6b7280";
}

const HIGH_PRIORITY_KEYWORDS = [
  "leak", "leaking", "flood", "flooding", "burst", "burst pipe",
  "no power", "power out", "power outage", "outage", "fire",
  "spark", "smoke", "gas", "shock", "electrocut", "burning smell",
  "no water", "no hot water", "sewage", "overflow", "exposed wire",
  "ceiling falling", "broken glass", "lock broken", "cannot lock",
  "can't lock", "stuck in", "trapped",
];

const MEDIUM_PRIORITY_KEYWORDS = [
  "broken", "not working", "stopped working", "noise", "rattle",
  "drip", "slow drain", "clog", "clogged", "leak slow",
  "flicker", "intermittent", "loose", "damaged", "crack",
];

const CATEGORY_DEFAULT: Record<RequestCategory, RequestPriority> = {
  Plumbing: "medium",
  Electrical: "medium",
  General: "low",
};

const CATEGORY_HIGH_HINT: Record<RequestCategory, string[]> = {
  Plumbing: ["leak", "flood", "burst", "no water", "sewage", "overflow"],
  Electrical: ["fire", "spark", "no power", "shock", "burning"],
  General: ["broken glass", "trapped", "lock", "ceiling falling"],
};

/**
 * Auto-suggest a priority for a new request based on title+description content
 * and the chosen category. Heuristic only — manager has final say.
 */
export function suggestPriority(
  title: string,
  description: string,
  category: RequestCategory,
): PrioritySuggestion {
  const text = `${title} ${description}`.toLowerCase();

  const matchedHigh = HIGH_PRIORITY_KEYWORDS.find((k) => text.includes(k));
  if (matchedHigh) {
    return {
      priority: "high",
      reason: `Keyword "${matchedHigh}" suggests urgent issue`,
      source: "auto",
    };
  }

  const matchedHighCat = CATEGORY_HIGH_HINT[category]?.find((k) => text.includes(k));
  if (matchedHighCat) {
    return {
      priority: "high",
      reason: `${category} keyword "${matchedHighCat}" indicates urgency`,
      source: "auto",
    };
  }

  const matchedMedium = MEDIUM_PRIORITY_KEYWORDS.find((k) => text.includes(k));
  if (matchedMedium) {
    return {
      priority: "medium",
      reason: `Keyword "${matchedMedium}" indicates a real issue`,
      source: "auto",
    };
  }

  const fallback = CATEGORY_DEFAULT[category] ?? "low";
  return {
    priority: fallback,
    reason: `Default priority for ${category} category`,
    source: "auto",
  };
}
