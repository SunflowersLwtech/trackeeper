import {
  MAX_IMAGES_PER_REQUEST,
  MAX_IMAGES_PER_MESSAGE,
  IMAGE_RESIZE_LONG_EDGE,
  IMAGE_JPEG_QUALITY,
  getRequestImages,
  getMessageImages,
  assertWithinImageLimit,
} from "@/utils/images";

describe("image limits", () => {
  it("uses 9 for requests (3×3 grid baseline)", () => {
    expect(MAX_IMAGES_PER_REQUEST).toBe(9);
  });
  it("uses 6 for chat messages (denser inline)", () => {
    expect(MAX_IMAGES_PER_MESSAGE).toBe(6);
  });
  it("compresses to 1920px long edge / 0.7 JPEG", () => {
    expect(IMAGE_RESIZE_LONG_EDGE).toBe(1920);
    expect(IMAGE_JPEG_QUALITY).toBeCloseTo(0.7, 2);
  });
});

describe("getRequestImages", () => {
  it("returns canonical imageUrls when present", () => {
    expect(getRequestImages({ imageUrls: ["a", "b"] })).toEqual(["a", "b"]);
  });
  it("falls back to legacy imageUrl when imageUrls missing", () => {
    expect(getRequestImages({ imageUrl: "old.jpg" })).toEqual(["old.jpg"]);
  });
  it("prefers imageUrls over imageUrl when both exist", () => {
    expect(
      getRequestImages({ imageUrls: ["new.jpg"], imageUrl: "old.jpg" }),
    ).toEqual(["new.jpg"]);
  });
  it("handles undefined input", () => {
    expect(getRequestImages(undefined)).toEqual([]);
  });
  it("handles null input", () => {
    expect(getRequestImages(null)).toEqual([]);
  });
  it("handles empty array as 'no images' (falls through to legacy)", () => {
    expect(getRequestImages({ imageUrls: [], imageUrl: "old.jpg" })).toEqual(["old.jpg"]);
  });
  it("returns empty array when nothing is set", () => {
    expect(getRequestImages({})).toEqual([]);
  });
});

describe("getMessageImages", () => {
  it("returns canonical imageUrls when present", () => {
    expect(getMessageImages({ imageUrls: ["a"] })).toEqual(["a"]);
  });
  it("falls back to legacy imageUrl", () => {
    expect(getMessageImages({ imageUrl: "x.jpg" })).toEqual(["x.jpg"]);
  });
  it("returns empty for missing input", () => {
    expect(getMessageImages(undefined)).toEqual([]);
  });
});

describe("assertWithinImageLimit", () => {
  it("passes when total within cap", () => {
    expect(() => assertWithinImageLimit(3, 4, 9)).not.toThrow();
  });
  it("passes when total equals cap", () => {
    expect(() => assertWithinImageLimit(5, 4, 9)).not.toThrow();
  });
  it("throws with remaining count when partial room left", () => {
    expect(() => assertWithinImageLimit(5, 7, 9)).toThrow(/can only add 2 more/i);
  });
  it("throws 'maximum reached' when no room at all", () => {
    expect(() => assertWithinImageLimit(1, 9, 9)).toThrow(/maximum 9 images reached/i);
  });
  it("treats 0 existing as a fresh selection", () => {
    expect(() => assertWithinImageLimit(10, 0, 9)).toThrow(/can only add 9 more|maximum/i);
  });
});
