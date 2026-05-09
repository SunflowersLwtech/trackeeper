const mockManipulate = jest.fn();
jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: (...args: unknown[]) => mockManipulate(...args),
  SaveFormat: { JPEG: "jpeg", PNG: "png" },
}));

import { compressImage, compressImages } from "@/services/imageCompression";

beforeEach(() => {
  mockManipulate.mockReset();
});

describe("compressImage", () => {
  it("calls manipulateAsync with 1920px resize and JPEG 0.7", async () => {
    mockManipulate.mockResolvedValue({ uri: "file:///compressed.jpg" });
    const result = await compressImage("file:///original.png");
    expect(mockManipulate).toHaveBeenCalledTimes(1);
    const [uri, actions, opts] = mockManipulate.mock.calls[0];
    expect(uri).toBe("file:///original.png");
    expect(actions).toEqual([{ resize: { width: 1920 } }]);
    expect(opts.compress).toBeCloseTo(0.7, 2);
    expect(opts.format).toBe("jpeg");
    expect(result).toEqual({ uri: "file:///compressed.jpg", modified: true });
  });

  it("falls back to original URI on non-HEIC failures", async () => {
    mockManipulate.mockRejectedValue(new Error("decoder boom"));
    const result = await compressImage("file:///original.png");
    expect(result).toEqual({ uri: "file:///original.png", modified: false });
  });

  it("throws a clear error for HEIC files when transcoding fails", async () => {
    mockManipulate.mockRejectedValue(new Error("decoder boom"));
    await expect(compressImage("file:///photo.HEIC")).rejects.toThrow(/transcode HEIC/i);
  });

  it("recognises HEIF as well as HEIC", async () => {
    mockManipulate.mockRejectedValue(new Error("decoder boom"));
    await expect(compressImage("file:///x.heif")).rejects.toThrow(/transcode HEIC/i);
  });

  it("recognises HEIC with a query string suffix", async () => {
    mockManipulate.mockRejectedValue(new Error("decoder boom"));
    await expect(compressImage("file:///x.heic?ph=1")).rejects.toThrow(/transcode HEIC/i);
  });
});

describe("compressImages", () => {
  it("preserves input order", async () => {
    mockManipulate.mockImplementation(async (uri: string) => ({ uri: `${uri}-c` }));
    const result = await compressImages(["a", "b", "c"], 2);
    expect(result.map((r) => r.uri)).toEqual(["a-c", "b-c", "c-c"]);
  });

  it("returns empty array for empty input without invoking manipulate", async () => {
    const result = await compressImages([], 3);
    expect(result).toEqual([]);
    expect(mockManipulate).not.toHaveBeenCalled();
  });

  it("respects concurrency cap", async () => {
    let active = 0;
    let peak = 0;
    mockManipulate.mockImplementation(async (uri: string) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return { uri: `${uri}-c` };
    });
    await compressImages(["1", "2", "3", "4", "5", "6"], 2);
    expect(peak).toBeLessThanOrEqual(2);
  });
});
