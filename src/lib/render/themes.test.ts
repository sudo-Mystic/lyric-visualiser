import { describe, expect, it } from "vitest";
import { VISUAL_THEMES, themePreset, visualTheme } from "./themes";

describe("visual themes", () => {
  it("contains six distinct themes", () => {
    expect(VISUAL_THEMES.map((theme) => theme.value)).toEqual([
      "swiss-grid",
      "letterpress-ink",
      "riso-register",
      "analog-tuner",
      "night-journal",
      "acid-kinetic",
    ]);
  });

  it("turns each theme into a style patch", () => {
    const letterpress = themePreset("letterpress-ink");
    expect(letterpress).toMatchObject({
      theme: "letterpress-ink",
      background: "paper",
      colorA: "#8f1d16",
      colorB: "#17120d",
      fontFamily: "rozha",
      canvasFormat: "portrait",
      lyricsMode: "stack",
      rain: 0,
    });

    const acid = themePreset("acid-kinetic");
    expect(acid.glitch).toBeGreaterThan(40);
    expect(acid.canvasFormat).toBe("landscape");

    expect(visualTheme("night-journal").label).toBe("Night Journal");
  });
});
