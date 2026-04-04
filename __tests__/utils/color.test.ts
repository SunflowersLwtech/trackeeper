import { withOpacity, contrastText } from "@/utils/color";

describe("withOpacity", () => {
  it("converts hex to rgba with given opacity", () => {
    expect(withOpacity("#FF0000", 0.5)).toBe("rgba(255, 0, 0, 0.5)");
  });

  it("handles hex without hash prefix", () => {
    expect(withOpacity("00FF00", 1)).toBe("rgba(0, 255, 0, 1)");
  });

  it("converts black with zero opacity", () => {
    expect(withOpacity("#000000", 0)).toBe("rgba(0, 0, 0, 0)");
  });

  it("converts white", () => {
    expect(withOpacity("#FFFFFF", 0.8)).toBe("rgba(255, 255, 255, 0.8)");
  });

  it("handles mixed hex values", () => {
    expect(withOpacity("#1A2B3C", 0.3)).toBe("rgba(26, 43, 60, 0.3)");
  });
});

describe("contrastText", () => {
  it("returns #fff for dark backgrounds", () => {
    expect(contrastText("#000000")).toBe("#fff");
    expect(contrastText("#1A1A1A")).toBe("#fff");
    expect(contrastText("#333333")).toBe("#fff");
  });

  it("returns #000 for light backgrounds", () => {
    expect(contrastText("#FFFFFF")).toBe("#000");
    expect(contrastText("#F0F0F0")).toBe("#000");
    expect(contrastText("#CCCCCC")).toBe("#000");
  });

  it("handles mid-range colors", () => {
    // Pure red has low luminance → white text
    expect(contrastText("#FF0000")).toBe("#fff");
    // Pure green has high luminance → black text
    expect(contrastText("#00FF00")).toBe("#000");
    // Pure blue has very low luminance → white text
    expect(contrastText("#0000FF")).toBe("#fff");
  });

  it("handles hex without hash prefix", () => {
    expect(contrastText("FFFFFF")).toBe("#000");
    expect(contrastText("000000")).toBe("#fff");
  });

  it("handles sRGB linearisation threshold boundary", () => {
    // Values near 0.03928 boundary (≈10 in 0-255 range)
    expect(contrastText("#0A0A0A")).toBe("#fff");
  });
});
