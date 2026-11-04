import { describe, expect, it } from "vitest";
import { VISUAL_THEMES, themePreset, visualTheme } from "./themes";

describe("visual themes", () => {
  it("contains six presets and no trace of the old similar set", () => {
    expect(VISUAL_THEMES.map((theme) => theme.value)).toEqual([
      "raakh-grunge",
      "karaoke-stage",
      "kinetic-collage",
      "terminal-scroll",
      "neon-sign",
      "comic-pop",
    ]);
  });

  it("differs on layout, reading, motion and background, not just colour", () => {
    // This is the regression test for the user's complaint: the old six
    // shared one centred-word layout and only changed palette/format.
    // A preset that only changes colour cannot pass this.
    expect(new Set(VISUAL_THEMES.map((t) => t.layout)).size).toBe(6);
    expect(new Set(VISUAL_THEMES.map((t) => t.reading)).size).toBe(6);
    expect(new Set(VISUAL_THEMES.map((t) => t.motion)).size).toBe(6);
    expect(new Set(VISUAL_THEMES.map((t) => t.background)).size).toBe(6);
    expect(new Set(VISUAL_THEMES.map((t) => t.canvasFormat)).size).toBeGreaterThan(1);
  });

  it("keeps rain and glitch only on the grunge preset", () => {
    const grunge = themePreset("raakh-grunge");
    expect(grunge.rain).toBeGreaterThan(0);
    expect(grunge.glitch).toBeGreaterThan(0);
    for (const theme of VISUAL_THEMES.filter((t) => t.value !== "raakh-grunge")) {
      const preset = themePreset(theme.value);
      expect(preset.rain).toBe(0);
      expect(preset.glitch).toBe(0);
    }
  });

  it("turns each theme into a style patch", () => {
    const terminal = themePreset("terminal-scroll");
    expect(terminal).toMatchObject({
      theme: "terminal-scroll",
      background: "terminal",
      colorA: "#4dff88",
      fontFamily: "mono",
      canvasFormat: "portrait",
      lyricsMode: "scroll",
    });

    const comic = themePreset("comic-pop");
    expect(comic.canvasFormat).toBe("portrait");
    expect(comic.lyricsMode).toBe("word");

    expect(visualTheme("neon-sign").label).toBe("Neon Sign");
  });
});
