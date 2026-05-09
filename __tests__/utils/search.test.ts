import { tokenizeTitle, highlightMatches, SEARCH_DEBOUNCE_MS } from "@/utils/search";

describe("SEARCH_DEBOUNCE_MS", () => {
  it("is 300ms (Algolia/Typesense recommendation)", () => {
    expect(SEARCH_DEBOUNCE_MS).toBe(300);
  });
});

describe("tokenizeTitle", () => {
  it("returns lowercase full-word + 3+ char prefix tokens", () => {
    const tokens = tokenizeTitle("Bathroom sink leaking");
    expect(tokens).toContain("bathroom");
    expect(tokens).toContain("bath");
    expect(tokens).toContain("bathr");
    expect(tokens).toContain("sink");
    expect(tokens).toContain("leak");
    expect(tokens).toContain("leaking");
  });

  it("drops stop words", () => {
    const tokens = tokenizeTitle("The kitchen on fire");
    expect(tokens).not.toContain("the");
    expect(tokens).not.toContain("on");
  });

  it("returns empty array for empty/null/non-string input", () => {
    expect(tokenizeTitle("")).toEqual([]);
    expect(tokenizeTitle(undefined as never)).toEqual([]);
  });

  it("handles punctuation by splitting on non-alphanumeric", () => {
    const tokens = tokenizeTitle("Bathroom — leak!!");
    expect(tokens).toContain("bathroom");
    expect(tokens).toContain("leak");
  });

  it("respects maxTokens cap to keep doc under 1MB", () => {
    const long = Array.from({ length: 100 }, (_, i) => `wordnumber${i}`).join(" ");
    expect(tokenizeTitle(long, 30).length).toBeLessThanOrEqual(30);
  });

  it("does not emit prefixes shorter than 3 chars", () => {
    const tokens = tokenizeTitle("ab abc");
    // "ab" is too short (we require >= 2 to enter, but only emit prefixes >= 3
    // — "abc" passes, it produces "abc")
    expect(tokens).toContain("abc");
    expect(tokens).not.toContain("a");
  });

  it("dedupes tokens (same prefix from two words)", () => {
    const tokens = tokenizeTitle("leaking leakage");
    const leakCount = tokens.filter((t) => t === "leak").length;
    expect(leakCount).toBe(1);
  });
});

describe("highlightMatches", () => {
  it("returns single non-match segment for empty query", () => {
    expect(highlightMatches("hello world", "")).toEqual([{ text: "hello world", match: false }]);
  });

  it("highlights a single word", () => {
    const segs = highlightMatches("Bathroom sink leaking", "leak");
    const matches = segs.filter((s) => s.match).map((s) => s.text);
    expect(matches).toEqual(["leak"]);
  });

  it("is case-insensitive", () => {
    const segs = highlightMatches("BATHROOM sink", "bath");
    expect(segs.some((s) => s.match && s.text.toUpperCase() === "BATH")).toBe(true);
  });

  it("highlights multiple words separately", () => {
    const segs = highlightMatches("Bathroom sink leaking water", "sink water");
    const matches = segs.filter((s) => s.match).map((s) => s.text.toLowerCase());
    expect(matches).toEqual(["sink", "water"]);
  });

  it("preserves order with non-match segments between matches", () => {
    const segs = highlightMatches("a leak and another leak here", "leak");
    expect(segs).toEqual([
      { text: "a ", match: false },
      { text: "leak", match: true },
      { text: " and another ", match: false },
      { text: "leak", match: true },
      { text: " here", match: false },
    ]);
  });

  it("escapes regex special characters in the query", () => {
    const segs = highlightMatches("price $10 today", "$10");
    const matches = segs.filter((s) => s.match).map((s) => s.text);
    // Single-char queries (length < 2) are filtered out — multi-char like "$10" should match.
    expect(matches).toContain("$10");
  });

  it("returns empty array for empty text", () => {
    expect(highlightMatches("", "anything")).toEqual([]);
  });
});
