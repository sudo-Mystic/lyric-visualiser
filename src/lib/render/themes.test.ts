import { describe, expect, it } from "vitest";
import { VISUAL_THEMES, themePreset, visualTheme } from "./themes";

describe("visual themes", () => {
  it("contains six distinct themes", () => {
    expect(VISUAL_THEMES.map((theme) => theme.value)).toEqual([
      "obsidian",
      "neon-monsoon",
      "papyrus",
      "aurora",
      "ember-dusk",
      "ink-signal",
    ]);
  });

  it("turns each theme into a style patch", () => {
    const papyrus = themePreset("papyrus");
    expect(papyrus).toMatchObject({
      theme: "papyrus",
      background: "paper",
      colorA: "#a42318",
      colorB: "#17120d",
      fontFamily: "rozha",
      canvasFormat: "portrait",
      lyricsMode: "stack",
      rain: 0,
    });

    const signal = themePreset("ink-signal");
    expect(signal.glitch).toBeGreaterThan(70);
    expect(signal.canvasFormat).toBe("portrait");

    expect(visualTheme("aurora").label).toBe("Aurora Ribbon");
  });
});
