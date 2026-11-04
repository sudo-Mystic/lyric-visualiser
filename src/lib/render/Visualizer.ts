import { clamp, easeOutCubic, hash01, hashString, mulberry32 } from "./random";
import { getActiveWordIndex } from "../timing";
import type {
  CanvasFormat,
  LyricLine,
  LyricsDoc,
  StyleSettings,
  TimedWord,
} from "../types";
import { BackgroundRenderer } from "./background";
import { DistressedTextRenderer, type RenderedWord } from "./distressedText";
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

function animationState(animation: StyleSettings["animation"], age: number) {
  if (animation === "cut") return { scale: 1, alpha: 1 };

  if (animation === "fade") {
    const progress = easeOutCubic(clamp(age / 0.24, 0, 1));
    return { scale: 1.035 - progress * 0.035, alpha: progress };
  }

  const progress = clamp(age / 0.18, 0, 1);
  let scale: number;
  if (progress < 0.62) {
    const first = easeOutCubic(progress / 0.62);
    scale = 0.82 + (1.035 - 0.82) * first;
  } else {
    const second = easeOutCubic((progress - 0.62) / 0.38);
    scale = 1.035 - 0.035 * second;
  }
  return { scale, alpha: clamp(age / 0.06, 0, 1) };
}

interface TextCell {
  word: TimedWord;
  rendered: RenderedWord;
  active: boolean;
  alpha: number;
}

interface LineDrawOptions {
  activeWordId?: string;
  centerY: number;
  maxWidth: number;
  maxHeight: number;
  scaleCap: number;
  alpha: number;
  entrance: { scale: number; alpha: number };
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

  private accentColor(word: TimedWord, settings: StyleSettings) {
    if (word.color) return word.color;
    return settings.colorMode === "white" ? settings.colorB : settings.colorA;
  }

  private baseColor(word: TimedWord, settings: StyleSettings) {
    if (word.color) return word.color;
    return settings.colorB;
  }

  private drawWord(
    word: TimedWord,
    activeIndex: number,
    settings: StyleSettings,
    time: number,
  ) {
    const age = Math.max(0, time - word.start);
    const animation = animationState(settings.animation, age);

    if (settings.theme === "riso-register") {
      const pink = this.text.get(
        word.text,
        settings.colorA,
        settings.fontSize,
        settings.fontWeight,
        settings.grit,
      );
      const teal = this.text.get(
        word.text,
        settings.colorB,
        settings.fontSize,
        settings.fontWeight,
        settings.grit,
      );
      const offset = Math.min(this.width, this.height) * 0.012;
      const maxWidth = this.width * 0.88;
      const maxHeight = this.height * 0.42;
      const fit = Math.min(
        1,
        maxWidth / Math.max(1, pink.logicalWidth),
        maxHeight / Math.max(1, pink.logicalHeight),
      );
      const width = pink.logicalWidth * fit;
      const height = pink.logicalHeight * fit;

      this.sceneCtx.save();
      this.sceneCtx.translate(this.width / 2, this.height / 2);
      this.sceneCtx.scale(animation.scale, animation.scale);
      this.sceneCtx.globalAlpha = animation.alpha;
      this.applyTextGlow(settings);
      this.sceneCtx.drawImage(teal.canvas, -width / 2 + offset, -height / 2 + offset * 0.35, width, height);
      this.sceneCtx.drawImage(pink.canvas, -width / 2 - offset * 0.6, -height / 2 - offset * 0.28, width, height);
      this.sceneCtx.restore();
      return;
    }

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
    const width = rendered.logicalWidth * fit * animation.scale;
    const height = rendered.logicalHeight * fit * animation.scale;

    this.sceneCtx.save();
    this.sceneCtx.globalAlpha = animation.alpha;
    this.sceneCtx.translate(this.width / 2, this.height / 2);
    if (settings.theme === "letterpress-ink") this.sceneCtx.rotate(-0.01);
    if (settings.theme === "night-journal") this.sceneCtx.rotate(-0.003);
    this.applyTextGlow(settings);
    this.sceneCtx.drawImage(rendered.canvas, -width / 2, -height / 2, width, height);
    this.sceneCtx.restore();
  }

  private drawLine(
    line: LyricLine,
    settings: StyleSettings,
    options: LineDrawOptions,
  ) {
    if (line.words.length === 0) return;

    const gap = this.text.spaceWidth(settings.fontSize, settings.fontWeight) * 0.72;
    const cells: TextCell[] = line.words.map((word) => {
      const active = word.id === options.activeWordId;
      return {
        word,
        rendered: this.text.get(
          word.text,
          active ? this.accentColor(word, settings) : this.baseColor(word, settings),
          settings.fontSize,
          settings.fontWeight,
          settings.grit,
        ),
        active,
        alpha: active ? 1 : options.activeWordId ? 0.78 : 1,
      };
    });

    let textWidth = 0;
    let ascent = 0;
    let descent = 0;
    cells.forEach((cell, index) => {
      textWidth += cell.rendered.textWidth;
      if (index < cells.length - 1) textWidth += gap;
      ascent = Math.max(ascent, cell.rendered.ascent);
      descent = Math.max(descent, cell.rendered.descent);
    });

    const inkHeight = Math.max(1, ascent + descent);
    const fit =
      Math.min(
        options.scaleCap,
        options.maxWidth / Math.max(1, textWidth),
        options.maxHeight / inkHeight,
      ) * options.entrance.scale;

    if (!Number.isFinite(fit) || fit <= 0) return;

    const baseline =
      options.centerY - ((ascent - descent) * fit) / 2;
    let cursor = this.width / 2 - (textWidth * fit) / 2;

    this.sceneCtx.save();
    if (settings.theme === "letterpress-ink") {
      this.sceneCtx.translate(this.width / 2, options.centerY);
      this.sceneCtx.rotate(-0.01);
      this.sceneCtx.translate(-this.width / 2, -options.centerY);
    } else if (settings.theme === "night-journal") {
      this.sceneCtx.translate(this.width / 2, options.centerY);
      this.sceneCtx.rotate(-0.003);
      this.sceneCtx.translate(-this.width / 2, -options.centerY);
    }
    this.applyTextGlow(settings);
    cells.forEach((cell) => {
      const drawX = cursor - cell.rendered.pad * fit;
      const drawY = baseline - (cell.rendered.ascent + cell.rendered.pad) * fit;
      this.sceneCtx.globalAlpha =
        options.alpha * options.entrance.alpha * cell.alpha;
      this.sceneCtx.drawImage(
        cell.rendered.canvas,
        drawX,
        drawY,
        cell.rendered.logicalWidth * fit,
        cell.rendered.logicalHeight * fit,
      );
      cursor += (cell.rendered.textWidth + gap) * fit;
    });
    this.sceneCtx.restore();
  }

  private drawLineMode(
    doc: LyricsDoc,
    word: TimedWord,
    settings: StyleSettings,
    time: number,
  ) {
    const line = doc.lines[word.line];
    if (!line) return;
    const animation = animationState(settings.animation, Math.max(0, time - line.start));
    this.drawLine(line, settings, {
      activeWordId: word.id,
      centerY: this.height * 0.5,
      maxWidth: this.width * 0.9,
      maxHeight: this.height * 0.31,
      scaleCap: 1.22,
      alpha: 1,
      entrance: animation,
    });
  }

  private drawStackMode(
    doc: LyricsDoc,
    word: TimedWord,
    settings: StyleSettings,
    time: number,
  ) {
    const line = doc.lines[word.line];
    if (!line) return;
    const previous = doc.lines[line.index - 1];
    const next = doc.lines[line.index + 1];
    const currentAnimation = animationState(
      settings.animation,
      Math.max(0, time - line.start),
    );
    const wide = this.width >= this.height;

    if (previous) {
      this.drawLine(previous, settings, {
        centerY: this.height * (wide ? 0.28 : 0.3),
        maxWidth: this.width * 0.72,
        maxHeight: this.height * 0.09,
        scaleCap: 0.58,
        alpha: wide ? 0.24 : 0.21,
        entrance: { scale: 1, alpha: 1 },
      });
    }

    if (next) {
      this.drawLine(next, settings, {
        centerY: this.height * (wide ? 0.72 : 0.7),
        maxWidth: this.width * 0.78,
        maxHeight: this.height * 0.1,
        scaleCap: 0.66,
        alpha: 0.48,
        entrance: { scale: 1, alpha: 1 },
      });
    }

    this.drawLine(line, settings, {
      activeWordId: word.id,
      centerY: this.height * 0.5,
      maxWidth: this.width * 0.9,
      maxHeight: this.height * 0.23,
      scaleCap: 0.98,
      alpha: 1,
      entrance: currentAnimation,
    });
  }

  private textGlow(settings: StyleSettings) {
    return {
      "swiss-grid": { color: "rgba(17, 17, 17, 0.24)", blur: 0, offsetY: 0 },
      "letterpress-ink": { color: "rgba(23, 18, 13, 0.24)", blur: 1, offsetY: 1 },
      "riso-register": { color: settings.colorA, blur: 2, offsetY: 1 },
      "analog-tuner": { color: settings.colorA, blur: 12, offsetY: 2 },
      "night-journal": { color: settings.colorA, blur: 20, offsetY: 2 },
      "acid-kinetic": { color: settings.colorA, blur: 4, offsetY: 2 },
    }[settings.theme];
  }

  private applyTextGlow(settings: StyleSettings) {
    const glow = this.textGlow(settings);
    this.sceneCtx.shadowColor = glow.color;
    this.sceneCtx.shadowBlur = glow.blur;
    this.sceneCtx.shadowOffsetX = 0;
    this.sceneCtx.shadowOffsetY = glow.offsetY;
  }

  private drawThemeDecor(settings: StyleSettings, activeIndex: number, time: number) {
    const ctx = this.sceneCtx;
    const width = this.width;
    const height = this.height;
    const short = Math.min(width, height);
    const rng = mulberry32(hashString(settings.theme));

    switch (settings.theme) {
      case "swiss-grid": {
        const margin = short * 0.07;
        const length = short * 0.075;
        const corners: Array<[number, number, number, number]> = [
          [margin, margin, 1, 1],
          [width - margin, margin, -1, 1],
          [margin, height - margin, 1, -1],
          [width - margin, height - margin, -1, -1],
        ];
        ctx.save();
        ctx.strokeStyle = settings.colorA;
        ctx.globalAlpha = 0.48;
        ctx.lineWidth = Math.max(1.5, short * 0.003);
        corners.forEach(([x, y, dx, dy]) => {
          ctx.beginPath();
          ctx.moveTo(x, y + length * dy);
          ctx.lineTo(x, y);
          ctx.lineTo(x + length * dx, y);
          ctx.stroke();
        });
        ctx.globalAlpha = 0.28;
        ctx.lineWidth = 1;
        const ticks = Math.floor(width / (short * 0.055));
        for (let index = 0; index <= ticks; index += 1) {
          const x = margin + ((width - margin * 2) * index) / Math.max(1, ticks);
          const tickLength = short * (index % 5 === 0 ? 0.026 : 0.012);
          ctx.beginPath();
          ctx.moveTo(x, margin);
          ctx.lineTo(x, margin + tickLength);
          ctx.moveTo(x, height - margin);
          ctx.lineTo(x, height - margin - tickLength);
          ctx.stroke();
        }
        ctx.restore();
        break;
      }
      case "letterpress-ink": {
        const sealX = width * 0.86;
        const sealY = height * 0.88;
        const sealRadius = short * 0.055;
        ctx.save();
        ctx.strokeStyle = settings.colorA;
        ctx.globalAlpha = 0.78;
        ctx.lineWidth = Math.max(1.4, short * 0.003);
        ctx.beginPath();
        ctx.arc(sealX, sealY, sealRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.11;
        ctx.fillStyle = settings.colorA;
        ctx.fill();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = settings.colorA;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `${Math.round(short * 0.034)}px "Rozha One", serif`;
        ctx.fillText("राख़", sealX, sealY + short * 0.003);
        ctx.globalAlpha = 0.36;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(width * 0.1, height * 0.09);
        ctx.lineTo(width * 0.9, height * 0.09);
        ctx.moveTo(width * 0.1, height * 0.91);
        ctx.lineTo(width * 0.9, height * 0.91);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case "night-journal": {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (let ribbon = 0; ribbon < 4; ribbon += 1) {
          const baseY = height * (0.27 + ribbon * 0.12);
          const phase = rng() * Math.PI * 2;
          ctx.strokeStyle = settings.colorA;
          ctx.globalAlpha = 0.08 + ribbon * 0.015;
          ctx.lineWidth = short * (0.012 + ribbon * 0.004);
          ctx.beginPath();
          for (let x = 0; x <= width; x += Math.max(10, short / 26)) {
            const y = baseY + Math.sin(x / short * 3.1 + phase) * short * 0.045;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = settings.colorB;
        ctx.lineWidth = 1;
        for (let index = 0; index < 18; index += 1) {
          const x = rng() * width;
          const y = rng() * height * 0.88;
          const size = short * (0.004 + rng() * 0.008);
          ctx.beginPath();
          ctx.moveTo(x - size, y);
          ctx.lineTo(x + size, y);
          ctx.moveTo(x, y - size);
          ctx.lineTo(x, y + size);
          ctx.stroke();
        }
        ctx.restore();
        break;
      }
      case "analog-tuner": {
        const cx = width / 2;
        const cy = height * 0.56;
        const radius = short * 0.36;
        const ticks = 9;
        ctx.save();
        ctx.strokeStyle = settings.colorB;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = Math.max(1, short * 0.0025);
        for (let index = 0; index <= ticks; index += 1) {
          const angle = Math.PI * (0.12 + (index / ticks) * 0.76);
          const inner = radius * (index % 2 === 0 ? 0.82 : 0.9);
          const outer = radius;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
          ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
          ctx.stroke();
        }
        ctx.globalAlpha = 0.72;
        ctx.strokeStyle = settings.colorA;
        ctx.lineWidth = Math.max(2, short * 0.004);
        const progress = activeIndex >= 0 ? Math.min(1, activeIndex / 24) : 0;
        const angle = Math.PI * (0.12 + progress * 0.76);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * radius * 0.76, cy + Math.sin(angle) * radius * 0.76);
        ctx.stroke();
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.42, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case "riso-register": {
        const margin = short * 0.06;
        const arm = short * 0.055;
        const marks: Array<[number, number]> = [
          [margin, margin],
          [width - margin, margin],
          [margin, height - margin],
          [width - margin, height - margin],
        ];
        ctx.save();
        ctx.strokeStyle = settings.colorB;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = Math.max(1, short * 0.002);
        marks.forEach(([x, y]) => {
          ctx.beginPath();
          ctx.moveTo(x - arm, y);
          ctx.lineTo(x + arm, y);
          ctx.moveTo(x, y - arm);
          ctx.lineTo(x, y + arm);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(x, y, arm * 0.36, 0, Math.PI * 2);
          ctx.stroke();
        });
        ctx.globalAlpha = 0.18;
        ctx.setLineDash([short * 0.015, short * 0.02]);
        ctx.beginPath();
        ctx.moveTo(width * 0.08, height * 0.5);
        ctx.lineTo(width * 0.92, height * 0.5);
        ctx.stroke();
        ctx.restore();
        break;
      }
      default:
        break;
    }
  }

  private drawLyrics(
    doc: LyricsDoc,
    activeIndex: number,
    word: TimedWord | null,
    settings: StyleSettings,
    time: number,
  ) {
    if (!word) return;
    if (settings.lyricsMode === "line") {
      this.drawLineMode(doc, word, settings, time);
      return;
    }
    if (settings.lyricsMode === "stack") {
      this.drawStackMode(doc, word, settings, time);
      return;
    }
    this.drawWord(word, activeIndex, settings, time);
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
    this.background.draw(this.sceneCtx, settings.background);
    this.drawThemeDecor(settings, activeIndex, time);

    if (doc) {
      this.drawLyrics(doc, activeIndex, word, settings, time);
    }

    if (activeIndex !== this.lastActive) {
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
    }

    const glitching = Boolean(
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
