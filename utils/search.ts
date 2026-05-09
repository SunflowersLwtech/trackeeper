/**
 * Search-token helpers for Firestore array-contains queries on titles.
 *
 * Firestore has no native full-text search. To get cheap "starts-with"
 * matching across the title, we tokenise into lowercase words + prefixes and
 * write to `request.titleTokens: string[]`. Combined with a single-field
 * array-contains index, queries like `titleTokens array-contains "leak"`
 * become O(matching docs) without external services.
 *
 * For multi-word queries we run the array-contains on the first token and
 * filter the rest client-side — adequate up to ~10k docs/tenant. Past that,
 * graduate to Algolia/Typesense.
 */

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "of", "on", "in", "at", "to", "for",
  "is", "are", "be", "been", "this", "that",
]);

/**
 * Tokenise a title for search. Lowercases, splits on non-alpha, drops stop
 * words, and emits 3+ char prefixes for each remaining token. Total token
 * count capped at 50 so we stay under Firestore's 1MB doc limit easily.
 *
 * Example: "Bathroom sink leaking" → ["bath","bathr","bathro","bathroo","bathroom",
 *                                     "sink", // sink is 4 chars, full word only
 *                                     "leak","leaki","leakin","leaking"]
 */
export function tokenizeTitle(title: string, maxTokens = 50): string[] {
  if (!title || typeof title !== "string") return [];
  const lower = title.toLowerCase();
  const words = lower.split(/[^a-z0-9]+/).filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
  const out = new Set<string>();
  for (const word of words) {
    // Always emit the full word.
    out.add(word);
    // Plus 3+ char prefixes so the user can search "bath" or "bathr" early.
    for (let len = 3; len < word.length; len++) {
      out.add(word.slice(0, len));
      if (out.size >= maxTokens) return Array.from(out);
    }
    if (out.size >= maxTokens) break;
  }
  return Array.from(out);
}

/**
 * Highlight match spans in a piece of text against a query. Returns an array
 * of `{ text, match }` segments — the UI maps these to <Text> + <Text bg>.
 * Case-insensitive. Multi-word queries highlight each word separately.
 */
export interface HighlightSegment {
  text: string;
  match: boolean;
}

export function highlightMatches(text: string, query: string): HighlightSegment[] {
  if (!text) return [];
  const trimmed = (query ?? "").trim();
  if (trimmed.length === 0) return [{ text, match: false }];

  const words = trimmed
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .map(escapeRegex);
  if (words.length === 0) return [{ text, match: false }];

  const re = new RegExp(`(${words.join("|")})`, "gi");
  const segments: HighlightSegment[] = [];
  let cursor = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) != null) {
    if (m.index > cursor) {
      segments.push({ text: text.slice(cursor, m.index), match: false });
    }
    segments.push({ text: m[0], match: true });
    cursor = m.index + m[0].length;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), match: false });
  }
  return segments;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Industry-standard search debounce — see Algolia/Typesense recommendations. */
export const SEARCH_DEBOUNCE_MS = 300;
