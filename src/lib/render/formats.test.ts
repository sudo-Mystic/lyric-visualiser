import { describe, expect, it } from "vitest";
import { canvasFormatLabel, canvasFormatInfo, canvasSize } from "./formats";

describe("canvas formats", () => {
  it("returns the supported orientation sizes", () => {
    expect(canvasSize("story")).toEqual({ width: 1080, height: 1920 });
    expect(canvasSize("portrait")).toEqual({ width: 1080, height: 1350 });
    expect(canvasSize("square")).toEqual({ width: 1080, height: 1080 });
    expect(canvasSize("landscape")).toEqual({ width: 1920, height: 1080 });
  });

  it("labels every format with its aspect ratio", () => {
    expect(canvasFormatLabel("story")).toBe("1080 × 1920 · 9:16");
    expect(canvasFormatInfo("landscape").shortLabel).toBe("16:9");
    expect(canvasFormatLabel("square")).toBe("1080 × 1080 · 1:1");
  });
});
