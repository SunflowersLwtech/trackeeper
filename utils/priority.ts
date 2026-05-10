import {
  PriorityConfidence,
  PrioritySuggestion,
  RequestCategory,
  RequestPriority,
  TriageFactor,
} from "@/types";

export const PRIORITY_ORDER: RequestPriority[] = ["high", "medium", "low"];

export const PRIORITY_COLORS: Record<RequestPriority, string> = {
  low: "#5BD27D", // lime
  medium: "#F4B400", // mustard
  high: "#FF4D2E", // tomato
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
  low: "#0A0A0A",
  medium: "#0A0A0A",
  high: "#FFFEF8",
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

export const TRIAGE_FACTOR_LABELS: Record<TriageFactor, string> = {
  safety_hazard: "Safety hazard",
  active_damage: "Active damage",
  essential_service_down: "Essential service down",
  access_security: "Access or security risk",
  worsening: "Getting worse",
};

export const TRIAGE_FACTOR_DESCRIPTIONS: Record<TriageFactor, string> = {
  safety_hazard: "Smoke, sparks, gas smell, exposed wiring, broken glass, or injury risk.",
  active_damage: "Water, sewage, ceiling damage, or anything causing property damage now.",
  essential_service_down: "No usable power, water, toilet, main door, or other essential function.",
  access_security: "Cannot lock, cannot enter, trapped inside, or unit security is compromised.",
  worsening: "The issue is spreading, repeating, or likely to become more expensive if delayed.",
};

const HIGH_RISK_FACTORS: TriageFactor[] = [
  "safety_hazard",
  "active_damage",
  "essential_service_down",
  "access_security",
];

function uniqueFactors(factors: TriageFactor[] = []): TriageFactor[] {
  return factors.filter((factor, index) => factors.indexOf(factor) === index);
}

function reasonFromFactors(prefix: string, factors: TriageFactor[]): string {
  const labels = factors.map((factor) => TRIAGE_FACTOR_LABELS[factor]);
  return `${prefix}: ${labels.join(", ")}`;
}

function buildSuggestion(
  priority: RequestPriority,
  reason: string,
  factors: TriageFactor[],
  confidence: PriorityConfidence,
): PrioritySuggestion {
  return {
    priority,
    reason,
    source: "system_triage",
    factors,
    confidence,
  };
}

/**
 * Suggest priority from explicit triage answers first, then title+description
 * keyword hints, then category defaults. This is deterministic system triage,
 * not an ML/LLM classifier; manager has final say.
 */
export function suggestPriority(
  title: string,
  description: string,
  category: RequestCategory,
  triageFactors: TriageFactor[] = [],
): PrioritySuggestion {
  const factors = uniqueFactors(triageFactors);
  const highFactors = factors.filter((factor) => HIGH_RISK_FACTORS.includes(factor));
  if (highFactors.length > 0) {
    return buildSuggestion(
      "high",
      reasonFromFactors("Risk checklist", highFactors),
      factors,
      "high",
    );
  }

  const text = `${title} ${description}`.toLowerCase();

  const matchedHigh = HIGH_PRIORITY_KEYWORDS.find((k) => text.includes(k));
  if (matchedHigh) {
    return buildSuggestion(
      "high",
      `Keyword "${matchedHigh}" suggests urgent issue`,
      factors,
      "medium",
    );
  }

  const matchedHighCat = CATEGORY_HIGH_HINT[category]?.find((k) => text.includes(k));
  if (matchedHighCat) {
    return buildSuggestion(
      "high",
      `${category} keyword "${matchedHighCat}" indicates urgency`,
      factors,
      "medium",
    );
  }

  if (factors.includes("worsening")) {
    return buildSuggestion(
      "medium",
      reasonFromFactors("Risk checklist", ["worsening"]),
      factors,
      "high",
    );
  }

  const matchedMedium = MEDIUM_PRIORITY_KEYWORDS.find((k) => text.includes(k));
  if (matchedMedium) {
    return buildSuggestion(
      "medium",
      `Keyword "${matchedMedium}" indicates a real issue`,
      factors,
      "medium",
    );
  }

  const fallback = CATEGORY_DEFAULT[category] ?? "low";
  return buildSuggestion(
    fallback,
    `Default priority for ${category} category`,
    factors,
    "low",
  );
}
