import { clamp, easeOutCubic, hash01, hashString, mulberry32 } from "./random";
import { getActiveWordIndex } from "../timing";
import type {
  CanvasFont,
  CanvasFormat,
  FontWeight,
  LyricLine,
  LyricsDoc,
  StyleSettings,
  TimedWord,
  VisualTheme,
} from "../types";
import { BackgroundRenderer } from "./background";
import {
  DistressedTextRenderer,
  FONT_STACKS,
} from "./distressedText";
import { canvasSize } from "./formats";
import { GlitchRenderer, type GlitchEvent } from "./glitch";
import { getWordColor } from "./palette";
import { RainSystem } from "./rain";

export interface RenderInfo {
  activeIndex: number;
  word: TimedWord | null;
  line: number;
  changed: boolean;
  glitching: boolean;
}

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

interface PlainMetrics {
  width: number;
  ascent: number;
  descent: number;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

export class Visualizer {
  private width: number;
  private height: number;
  private scene: HTMLCanvasElement;
  private glitchCanvas: HTMLCanvasElement;
  private text = new DistressedTextRenderer();
  private background: BackgroundRenderer;
  private rain: RainSystem;
  private glitch: GlitchRenderer;
  private ctx: CanvasRenderingContext2D;
  private sceneCtx: CanvasRenderingContext2D;
  private measureCanvas: HTMLCanvasElement;
  private measureCtx: CanvasRenderingContext2D | null;
  private lastSettings: StyleSettings | null = null;
  private lastActive = -2;
  private lastDocSignature = "";
  private glitchEvent: GlitchEvent | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    format: CanvasFormat,
  ) {
    const size = canvasSize(format);
    this.width = size.width;
    this.height = size.height;
    this.scene = makeCanvas(this.width, this.height);
    this.glitchCanvas = makeCanvas(this.width, this.height);
    this.background = new BackgroundRenderer(this.width, this.height);
    this.rain = new RainSystem(this.width, this.height);
    this.glitch = new GlitchRenderer(this.width, this.height);
    this.measureCanvas = makeCanvas(8, 8);
    this.measureCtx = this.measureCanvas.getContext("2d");

    canvas.width = this.width;
    canvas.height = this.height;
    const main = canvas.getContext("2d");
    const scene = this.scene.getContext("2d");
    if (!main || !scene) throw new Error("Canvas 2D is unavailable");
    this.ctx = main;
    this.sceneCtx = scene;
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = "high";
    this.sceneCtx.imageSmoothingEnabled = true;
    this.sceneCtx.imageSmoothingQuality = "high";
  }

  // ---------------------------------------------------------------- plain type

  private setPlainFont(
    ctx: CanvasRenderingContext2D,
    family: CanvasFont,
    size: number,
    weight: FontWeight,
    letterSpacing: number,
  ) {
    ctx.font = `${weight} ${size}px ${FONT_STACKS[family]}`;
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
      `${letterSpacing * size}px`;
  }

  private measurePlain(
    text: string,
    family: CanvasFont,
    size: number,
    weight: FontWeight,
    letterSpacing: number,
  ): PlainMetrics {
    const ctx = this.measureCtx;
    if (!ctx) return { width: text.length * size * 0.6, ascent: size * 0.82, descent: size * 0.32 };
    this.setPlainFont(ctx, family, size, weight, letterSpacing);
    const metrics = ctx.measureText(text);
    return {
      width: metrics.width,
      ascent: metrics.actualBoundingBoxAscent || size * 0.82,
      descent: Math.abs(metrics.actualBoundingBoxDescent) || size * 0.32,
    };
  }

  private applySettings(settings: StyleSettings) {
    const previous = this.lastSettings;
    this.text.setTypography(settings.fontFamily, settings.letterSpacing);
    if (
      !previous ||
      previous.fontSize !== settings.fontSize ||
      previous.fontWeight !== settings.fontWeight ||
      previous.grit !== settings.grit ||
      previous.colorA !== settings.colorA ||
      previous.colorB !== settings.colorB
    ) {
      this.text.clear();
    }
    this.lastSettings = settings;
  }

  // ------------------------------------------------------- 1. Raakh Grunge

  private drawGrunge(word: TimedWord, activeIndex: number, settings: StyleSettings) {
    const rendered = this.text.get(
      word.text,
      getWordColor(word, activeIndex, settings),
      settings.fontSize,
      settings.fontWeight,
      settings.grit,
    );
    const maxWidth = this.width * 0.88;
    const maxHeight = this.height * 0.42;
    const fit = Math.min(
      1,
      maxWidth / Math.max(1, rendered.logicalWidth),
      maxHeight / Math.max(1, rendered.logicalHeight),
    );
    const width = rendered.logicalWidth * fit;
    const height = rendered.logicalHeight * fit;
    const ctx = this.sceneCtx;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.drawImage(rendered.canvas, this.width / 2 - width / 2, this.height / 2 - height / 2, width, height);
    ctx.restore();
  }

  // ------------------------------------------------------- 2. Karaoke Stage

  private drawKaraoke(
    doc: LyricsDoc,
    word: TimedWord,
    settings: StyleSettings,
    time: number,
  ) {
    const ctx = this.sceneCtx;
    const line = doc.lines[word.line];
    if (!line) return;
    const short = Math.min(this.width, this.height);

    // Title, top left, small and quiet. The line below is the star.
    if (doc.title) {
      const label = doc.artist ? `${doc.title} · ${doc.artist}` : doc.title;
      ctx.save();
      this.setPlainFont(ctx, "sans", Math.round(short * 0.028), 700, 0.02);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
      ctx.fillText(label, this.width * 0.06, this.height * 0.09);
      ctx.restore();
    }

    const fontSize = settings.fontSize;
    const gap = fontSize * 0.28;
    const widths = line.words.map(
      (w) => this.measurePlain(w.text, settings.fontFamily, fontSize, settings.fontWeight, settings.letterSpacing).width,
    );
    const totalWidth = widths.reduce((sum, w, i) => sum + w + (i > 0 ? gap : 0), 0);
    const maxWidth = this.width * 0.86;
    const scale = Math.min(1, maxWidth / Math.max(1, totalWidth));
    const size = fontSize * scale;
    const baseline = this.height * 0.74;
    let cursor = this.width / 2 - (totalWidth * scale) / 2;

    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    line.words.forEach((w, index) => {
      const sung = w.start <= time;
      const active = w.id === word.id;
      this.setPlainFont(ctx, settings.fontFamily, size, settings.fontWeight, settings.letterSpacing);
      ctx.fillStyle = sung ? settings.colorA : "rgba(255, 255, 255, 0.35)";
      if (active) {
        ctx.shadowColor = settings.colorA;
        ctx.shadowBlur = 14;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fillText(w.text, cursor, baseline);
      cursor += (widths[index] + gap) * scale;
    });
    ctx.shadowBlur = 0;

    // Sweeping underline: the only motion in this preset.
    const activeInLine = line.words.findIndex((w) => w.id === word.id);
    const wordProgress = clamp(
      (time - word.start) / Math.max(0.01, word.end - word.start),
      0,
      1,
    );
    const progress =
      line.words.length === 0
        ? 0
        : (activeInLine + wordProgress) / line.words.length;
    const trackY = baseline + size * 0.42;
    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    ctx.fillRect(this.width / 2 - (totalWidth * scale) / 2, trackY, totalWidth * scale, Math.max(3, short * 0.004));
    ctx.fillStyle = settings.colorA;
    ctx.fillRect(
      this.width / 2 - (totalWidth * scale) / 2,
      trackY,
      totalWidth * scale * progress,
      Math.max(3, short * 0.004),
    );

    // Next line, faint, so the singer can see what is coming.
    const next = doc.lines[line.index + 1];
    if (next) {
      const nextText = next.words.map((w) => w.text).join(" ");
      let nextSize = size * 0.52;
      let nextWidth = this.measurePlain(nextText, settings.fontFamily, nextSize, 700, settings.letterSpacing).width;
      while (nextWidth > maxWidth && nextSize > 20) {
        nextSize *= 0.9;
        nextWidth = this.measurePlain(nextText, settings.fontFamily, nextSize, 700, settings.letterSpacing).width;
      }
      this.setPlainFont(ctx, settings.fontFamily, nextSize, 700, settings.letterSpacing);
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
      ctx.fillText(nextText, this.width / 2, baseline + size * 1.05);
    }
    ctx.restore();
  }

  // ------------------------------------------------------- 3. Kinetic Collage

  private drawKinetic(
    doc: LyricsDoc,
    word: TimedWord,
    activeIndex: number,
    settings: StyleSettings,
    time: number,
  ) {
    const ctx = this.sceneCtx;
    const start = Math.max(0, activeIndex - 4);
    for (let index = start; index <= activeIndex; index += 1) {
      const w = doc.words[index];
      if (!w) continue;
      const isActive = index === activeIndex;
      const distance = activeIndex - index;
      const rng = mulberry32(hashString(w.id));
      const posX = this.width * (0.16 + rng() * 0.68);
      const posY = this.height * (0.22 + rng() * 0.56);
      let rotation = (rng() - 0.5) * 0.62;
      const baseScale = isActive ? 1 : Math.max(0.45, 1 - distance * 0.15);
      const alpha = isActive ? 1 : Math.max(0.26, 1 - distance * 0.18);

      let entrance = 1;
      if (isActive) {
        const age = Math.max(0, time - w.start);
        const progress = clamp(age / 0.22, 0, 1);
        entrance = 1.55 - 0.55 * easeOutCubic(progress);
        rotation *= 0.35 + 0.65 * progress;
      }

      const color = isActive ? settings.colorA : settings.colorB;
      const size = Math.round(settings.fontSize * baseScale);
      const rendered = this.text.get(w.text, color, size, settings.fontWeight, settings.grit);
      const fit = Math.min(
        1,
        (this.width * 0.62) / Math.max(1, rendered.logicalWidth),
        (this.height * 0.30) / Math.max(1, rendered.logicalHeight),
      );
      const drawW = rendered.logicalWidth * fit * entrance;
      const drawH = rendered.logicalHeight * fit * entrance;
      // Clamp the centre so a wide word can never run off the frame,
      // even at a seeded position near an edge (seen in screenshots).
      const margin = Math.min(this.width, this.height) * 0.05;
      const clampedX = clamp(posX, drawW / 2 + margin, this.width - drawW / 2 - margin);
      const clampedY = clamp(posY, drawH / 2 + margin, this.height - drawH / 2 - margin);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(clampedX, clampedY);
      ctx.rotate(rotation);
      ctx.drawImage(rendered.canvas, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    }
  }

  // ------------------------------------------------------- 4. Terminal Scroll

  private drawTerminal(
    doc: LyricsDoc,
    word: TimedWord,
    settings: StyleSettings,
    time: number,
  ) {
    const ctx = this.sceneCtx;
    const short = Math.min(this.width, this.height);
    const activeLine = word.line;

    ctx.save();
    this.setPlainFont(ctx, "mono", Math.round(short * 0.026), 700, 0);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "rgba(77, 255, 136, 0.65)";
    ctx.fillText("● ● ●   RAAKH // TRANSCRIPT", this.width * 0.06, this.height * 0.055);
    ctx.restore();

    const rowHeight = settings.fontSize * 1.55;
    const startLine = Math.max(0, activeLine - 4);
    const endLine = Math.min(doc.lines.length - 1, activeLine + 2);
    const rows = doc.lines.slice(startLine, endLine + 1);
    const totalHeight = rows.length * rowHeight;
    const top = (this.height - totalHeight) / 2 + rowHeight * 0.55;

    rows.forEach((line, rowIndex) => {
      const isActive = line.index === activeLine;
      const distance = Math.abs(line.index - activeLine);
      const alpha = isActive ? 1 : line.index < activeLine ? Math.max(0.32, 0.92 - distance * 0.16) : 0.42;
      const baseline = top + rowIndex * rowHeight;
      const gutterX = this.width * 0.06;
      const textX = this.width * 0.11;
      const maxWidth = this.width * 0.84;

      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      this.setPlainFont(ctx, settings.fontFamily, settings.fontSize, settings.fontWeight, settings.letterSpacing);
      ctx.fillStyle = settings.colorA;
      ctx.globalAlpha = alpha * 0.7;
      ctx.fillText(isActive ? ">" : " ", gutterX, baseline);

      // Fit the whole line, then draw word by word so the active line
      // can show sung vs unsung words differently.
      const gap = settings.fontSize * 0.26;
      const widths = line.words.map(
        (w) => this.measurePlain(w.text, settings.fontFamily, settings.fontSize, settings.fontWeight, settings.letterSpacing).width,
      );
      const total = widths.reduce((sum, w, i) => sum + w + (i > 0 ? gap : 0), 0);
      const fit = Math.min(1, maxWidth / Math.max(1, total));
      const size = settings.fontSize * fit;
      this.setPlainFont(ctx, settings.fontFamily, size, settings.fontWeight, settings.letterSpacing);
      let cursor = textX;
      let sungCursor = textX;
      line.words.forEach((w, i) => {
        const sung = !isActive || line.index < activeLine || w.start <= time;
        ctx.globalAlpha = isActive ? (sung ? 1 : 0.28) : alpha;
        ctx.fillStyle = settings.colorA;
        ctx.fillText(w.text, cursor, baseline);
        cursor += (widths[i] + gap) * fit;
        // The cursor belongs after the last SUNG word, not at the end
        // of the line (a screenshot caught it sitting after "dar"
        // while only "andhere" had been sung).
        if (isActive && sung) sungCursor = cursor;
      });

      if (isActive) {
        // Blinking block cursor after the last sung word.
        const blink = Math.floor(time * 2) % 2 === 0;
        if (blink) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = settings.colorA;
          ctx.fillRect(sungCursor + gap * fit * 0.4, baseline - size * 0.78, size * 0.55, size * 0.85);
        }
      }
      ctx.restore();
    });

    // Footer: block progress bar, no smooth slider.
    const progress = doc.lines.length > 0 ? activeLine / Math.max(1, doc.lines.length - 1) : 0;
    const blocks = 22;
    const filled = Math.round(progress * blocks);
    ctx.save();
    this.setPlainFont(ctx, "mono", Math.round(short * 0.026), 700, 0);
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(77, 255, 136, 0.75)";
    ctx.fillText(
      `[${"█".repeat(filled)}${"░".repeat(blocks - filled)}] ${Math.round(progress * 100)}%`,
      this.width * 0.06,
      this.height * 0.95,
    );
    ctx.restore();
  }

  // ------------------------------------------------------- 5. Neon Sign

  private drawNeon(word: TimedWord, settings: StyleSettings, time: number) {
    const ctx = this.sceneCtx;
    const short = Math.min(this.width, this.height);
    const metrics = this.measurePlain(word.text, settings.fontFamily, settings.fontSize, settings.fontWeight, settings.letterSpacing);
    const fit = Math.min(
      1,
      (this.width * 0.86) / Math.max(1, metrics.width),
      (this.height * 0.38) / Math.max(1, metrics.ascent + metrics.descent),
    );
    const size = settings.fontSize * fit;
    const cx = this.width / 2;
    const cy = this.height * 0.42;
    const seed = hash01(word.id);
    const flicker = 0.88 + 0.12 * (0.5 + 0.5 * Math.sin(time * 9 + seed * 20));
    const drop = Math.sin(time * 3.7 + seed * 40) > 0.97 ? 0.55 : 1;
    const alpha = flicker * drop;

    // Side neon bars: the sign is framed, not floating on black.
    ctx.save();
    ctx.strokeStyle = settings.colorB;
    ctx.shadowColor = settings.colorB;
    ctx.shadowBlur = short * 0.03;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = Math.max(3, short * 0.006);
    ctx.beginPath();
    ctx.moveTo(this.width * 0.07, this.height * 0.18);
    ctx.lineTo(this.width * 0.07, this.height * 0.82);
    ctx.moveTo(this.width * 0.93, this.height * 0.18);
    ctx.lineTo(this.width * 0.93, this.height * 0.82);
    ctx.stroke();
    ctx.restore();

    const drawOutline = (atY: number, a: number, glow: number) => {
      ctx.save();
      this.setPlainFont(ctx, settings.fontFamily, size, settings.fontWeight, settings.letterSpacing);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = a;
      ctx.shadowColor = settings.colorA;
      ctx.shadowBlur = glow;
      ctx.strokeStyle = settings.colorA;
      ctx.lineWidth = Math.max(2, size * 0.035);
      ctx.strokeText(word.text, cx, atY);
      ctx.strokeText(word.text, cx, atY);
      ctx.shadowBlur = glow * 0.25;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
      ctx.lineWidth = Math.max(1, size * 0.011);
      ctx.strokeText(word.text, cx, atY);
      ctx.restore();
    };

    drawOutline(cy, alpha, short * 0.045);

    // Reflection: the same outline, flipped, faded by erasing its own
    // alpha (destination-out on an offscreen canvas). Painting a solid
    // fade colour over the full width left a black band across the
    // grid in screenshots, so no background-coloured rect is used here.
    const reflectY = cy + (metrics.ascent + metrics.descent) * fit * 0.5 + short * 0.04;
    const reflection = makeCanvas(this.width, this.height);
    const reflectionCtx = reflection.getContext("2d");
    if (reflectionCtx) {
      reflectionCtx.save();
      reflectionCtx.translate(0, reflectY * 2);
      reflectionCtx.scale(1, -1);
      this.setPlainFont(reflectionCtx, settings.fontFamily, size, settings.fontWeight, settings.letterSpacing);
      reflectionCtx.textAlign = "center";
      reflectionCtx.textBaseline = "middle";
      reflectionCtx.globalAlpha = alpha * 0.22;
      reflectionCtx.strokeStyle = settings.colorA;
      reflectionCtx.lineWidth = Math.max(2, size * 0.035);
      reflectionCtx.strokeText(word.text, cx, cy);
      reflectionCtx.restore();

      const textHeight = (metrics.ascent + metrics.descent) * fit;
      const fade = reflectionCtx.createLinearGradient(0, reflectY, 0, reflectY + textHeight * 1.1);
      fade.addColorStop(0, "rgba(0, 0, 0, 0)");
      fade.addColorStop(1, "rgba(0, 0, 0, 1)");
      reflectionCtx.save();
      reflectionCtx.globalCompositeOperation = "destination-out";
      reflectionCtx.fillStyle = fade;
      reflectionCtx.fillRect(
        cx - metrics.width * fit * 0.6,
        reflectY,
        metrics.width * fit * 1.2,
        textHeight * 1.1,
      );
      reflectionCtx.restore();

      ctx.save();
      ctx.drawImage(reflection, 0, 0);
      ctx.restore();
    }
  }

  // ------------------------------------------------------- 6. Comic Pop

  private drawComic(
    doc: LyricsDoc,
    word: TimedWord,
    settings: StyleSettings,
    time: number,
  ) {
    const ctx = this.sceneCtx;
    const short = Math.min(this.width, this.height);

    // Caption strip: the previous line, in a black bar on top.
    const line = doc.lines[word.line];
    const previous = line && line.index > 0 ? doc.lines[line.index - 1] : line;
    const caption = previous ? previous.words.map((w) => w.text).join(" ") : "";
    if (caption) {
      ctx.save();
      ctx.fillStyle = "#111111";
      ctx.fillRect(0, 0, this.width, this.height * 0.09);
      let capSize = short * 0.034;
      let capWidth = this.measurePlain(caption, "grotesk", capSize, 700, 0).width;
      while (capWidth > this.width * 0.9 && capSize > 18) {
        capSize *= 0.9;
        capWidth = this.measurePlain(caption, "grotesk", capSize, 700, 0).width;
      }
      this.setPlainFont(ctx, "grotesk", capSize, 700, 0);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(caption, this.width / 2, this.height * 0.045);
      ctx.restore();
    }

    const drawBurst = (x: number, y: number, r: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      for (let i = 0; i < 24; i += 1) {
        const angle = (i / 24) * Math.PI * 2;
        const radius = i % 2 === 0 ? r : r * 0.55;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = "#e8001d";
      ctx.fill();
      ctx.lineWidth = Math.max(3, short * 0.005);
      ctx.strokeStyle = "#111111";
      ctx.stroke();
      ctx.restore();
    };
    drawBurst(this.width * 0.88, this.height * 0.20, short * 0.055);
    drawBurst(this.width * 0.11, this.height * 0.83, short * 0.045);

    // Speech bubble with overshoot pop and a decaying wobble.
    const age = Math.max(0, time - word.start);
    const progress = clamp(age / 0.28, 0, 1);
    let pop: number;
    if (progress < 0.6) pop = 0.62 + 0.46 * easeOutCubic(progress / 0.6);
    else pop = 1.08 - 0.08 * easeOutCubic((progress - 0.6) / 0.4);
    const wobble = Math.sin(age * 18) * 0.02 * (1 - progress);
    const bubbleW = this.width * 0.84;
    const bubbleH = this.height * 0.38;
    const cx = this.width / 2;
    const cy = this.height * 0.54;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(wobble);
    ctx.scale(pop, pop);

    // Tail first, so the bubble body covers its top edge.
    ctx.beginPath();
    ctx.moveTo(-bubbleW * 0.25, bubbleH / 2 - 2);
    ctx.lineTo(-bubbleW * 0.16, bubbleH / 2 + bubbleH * 0.20);
    ctx.lineTo(-bubbleW * 0.06, bubbleH / 2 - 2);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = Math.max(6, short * 0.009);
    ctx.strokeStyle = "#111111";
    ctx.stroke();

    roundRectPath(ctx, -bubbleW / 2, -bubbleH / 2, bubbleW, bubbleH, short * 0.06);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = Math.max(7, short * 0.011);
    ctx.strokeStyle = "#111111";
    ctx.stroke();

    // Clean heavy type inside the bubble. No distress, no outline.
    const metrics = this.measurePlain(word.text, settings.fontFamily, settings.fontSize, settings.fontWeight, settings.letterSpacing);
    const fit = Math.min(
      1,
      (bubbleW * 0.82) / Math.max(1, metrics.width),
      (bubbleH * 0.68) / Math.max(1, metrics.ascent + metrics.descent),
    );
    const size = settings.fontSize * fit;
    this.setPlainFont(ctx, settings.fontFamily, size, settings.fontWeight, settings.letterSpacing);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#111111";
    ctx.fillText(word.text, 0, 0);
    ctx.restore();
  }

  // ------------------------------------------------------- dispatch

  private drawEngine(
    doc: LyricsDoc,
    word: TimedWord,
    activeIndex: number,
    settings: StyleSettings,
    time: number,
  ) {
    const theme: VisualTheme = settings.theme;
    switch (theme) {
      case "karaoke-stage":
        this.drawKaraoke(doc, word, settings, time);
        break;
      case "kinetic-collage":
        this.drawKinetic(doc, word, activeIndex, settings, time);
        break;
      case "terminal-scroll":
        this.drawTerminal(doc, word, settings, time);
        break;
      case "neon-sign":
        this.drawNeon(word, settings, time);
        break;
      case "comic-pop":
        this.drawComic(doc, word, settings, time);
        break;
      case "raakh-grunge":
      default:
        this.drawGrunge(word, activeIndex, settings);
        break;
    }
  }

  render(time: number, doc: LyricsDoc | null, settings: StyleSettings): RenderInfo {
    this.applySettings(settings);
    this.rain.setIntensity(settings.rain);

    const signature = doc
      ? `${doc.trackKey ?? ""}|${doc.source}|${doc.words.length}|${doc.words[0]?.text ?? ""}|${doc.lines.length}`
      : "empty";

    if (signature !== this.lastDocSignature) {
      this.lastDocSignature = signature;
      this.lastActive = -2;
      this.glitchEvent = null;
    }

    const words = doc?.words ?? [];
    const activeIndex = getActiveWordIndex(words, time);
    const word = activeIndex >= 0 ? words[activeIndex] : null;
    const previousActive = this.lastActive;

    this.sceneCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.sceneCtx.globalAlpha = 1;
    this.sceneCtx.globalCompositeOperation = "source-over";
    this.sceneCtx.shadowColor = "transparent";
    this.sceneCtx.shadowBlur = 0;
    this.sceneCtx.shadowOffsetX = 0;
    this.sceneCtx.shadowOffsetY = 0;
    this.background.draw(this.sceneCtx, settings.background);

    if (doc && word) {
      this.drawEngine(doc, word, activeIndex, settings, time);
    }

    // Rain and glitch belong ONLY to Raakh Grunge. The other five presets
    // set rain: 0 and glitch: 0 in their definitions, and this gate makes
    // that a code fact, not just a preset value.
    const isGrunge = settings.theme === "raakh-grunge";
    if (isGrunge && activeIndex !== this.lastActive) {
      const previous = this.lastActive;
      this.lastActive = activeIndex;

      if (word && settings.glitch > 0 && previous <= activeIndex) {
        const probability = 0.05 + (settings.glitch / 100) * 0.95;
        const roll = hash01(
          `${word.id}|${word.text}|${settings.glitch}|${Math.round(word.start * 1000)}`,
        );
        if (roll < probability) {
          const duration =
            0.1 + (settings.glitch / 100) * 0.07 + hash01(`${word.id}|duration`) * 0.04;
          this.glitchEvent = {
            start: time,
            duration,
            seed: hashString(`${word.id}|${word.start}|${settings.glitch}`),
          };
        }
      }
    } else if (!isGrunge) {
      this.lastActive = activeIndex;
      this.glitchEvent = null;
    } else {
      this.lastActive = activeIndex;
    }

    const glitching = Boolean(
      isGrunge &&
        this.glitchEvent &&
        time >= this.glitchEvent.start &&
        time < this.glitchEvent.start + this.glitchEvent.duration,
    );

    let source: HTMLCanvasElement = this.scene;
    if (glitching && this.glitchEvent) {
      this.glitch.render(
        this.scene,
        this.glitchCanvas,
        this.glitchEvent,
        time,
        settings.glitch,
      );
      source = this.glitchCanvas;
    }

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.drawImage(source, 0, 0);
    // RainSystem no-ops at intensity 0, so this is only visible on grunge.
    this.rain.render(this.ctx, source, time);

    return {
      activeIndex,
      word,
      line: word?.line ?? -1,
      changed: activeIndex !== previousActive,
      glitching,
    };
  }

  clearCaches() {
    this.text.clear();
    this.lastDocSignature = "";
    this.lastActive = -2;
    this.glitchEvent = null;
  }
}
