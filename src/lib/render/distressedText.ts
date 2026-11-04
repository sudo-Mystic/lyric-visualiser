import type { CanvasFont, FontWeight } from "../types";
import { clamp, hashString, mulberry32 } from "./random";

const SUPERSAMPLE = 1.5;
const CACHE_LIMIT = 72;
export const FONT_STACKS: Record<CanvasFont, string> = {
  sans: '"Noto Sans Devanagari Variable", "Noto Sans Variable", sans-serif',
  mono: '"JetBrains Mono Variable", "Noto Sans Devanagari Variable", monospace',
  rozha: '"Rozha One", "Noto Sans Devanagari Variable", serif',
  kalam: '"Kalam", "Noto Sans Devanagari Variable", sans-serif',
  yatra: '"Yatra One", "Noto Sans Devanagari Variable", sans-serif',
};

export interface RenderedWord {
  canvas: HTMLCanvasElement;
  logicalWidth: number;
  logicalHeight: number;
  textWidth: number;
  ascent: number;
  descent: number;
  pad: number;
}

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.ceil(width));
  canvas.height = Math.max(2, Math.ceil(height));
  return canvas;
}

export class DistressedTextRenderer {
  private cache = new Map<string, RenderedWord>();
  private measureCanvas = makeCanvas(8, 8);
  private measureContext = this.measureCanvas.getContext("2d");
  private fontFamily: CanvasFont = "sans";
  private letterSpacing = 0;

  setTypography(family: CanvasFont, letterSpacing: number) {
    if (this.fontFamily === family && Math.abs(this.letterSpacing - letterSpacing) < 0.0001) {
      return;
    }
    this.fontFamily = family;
    this.letterSpacing = letterSpacing;
    this.cache.clear();
  }

  get(
    text: string,
    color: string,
    fontSize: number,
    fontWeight: FontWeight,
    grit: number,
  ): RenderedWord {
    const key = `${this.fontFamily}|${this.letterSpacing}|${text}\u0000${color}\u0000${fontSize}\u0000${fontWeight}\u0000${Math.round(grit)}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const rendered = this.build(text, color, fontSize, fontWeight, grit);
    this.cache.set(key, rendered);
    if (this.cache.size > CACHE_LIMIT) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    return rendered;
  }

  clear() {
    this.cache.clear();
  }

  spaceWidth(fontSize: number, fontWeight: FontWeight) {
    const ctx = this.measureContext;
    if (!ctx) return fontSize * 0.26;
    this.setMeasureFont(ctx, fontSize, fontWeight);
    return ctx.measureText(" ").width || fontSize * 0.26;
  }

  private setMeasureFont(ctx: CanvasRenderingContext2D, fontSize: number, fontWeight: FontWeight) {
    ctx.font = `${fontWeight} ${fontSize}px ${FONT_STACKS[this.fontFamily]}`;
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
      `${this.letterSpacing * fontSize}px`;
  }

  private measure(text: string, fontSize: number, fontWeight: FontWeight) {
    const ctx = this.measureContext;
    if (!ctx) return { width: text.length * fontSize * 0.6, ascent: fontSize * 0.82, descent: fontSize * 0.3 };
    this.setMeasureFont(ctx, fontSize, fontWeight);
    const metrics = ctx.measureText(text);
    return {
      width: metrics.width,
      ascent: metrics.actualBoundingBoxAscent || fontSize * 0.82,
      descent: Math.abs(metrics.actualBoundingBoxDescent) || fontSize * 0.32,
    };
  }

  private build(
    text: string,
    color: string,
    fontSize: number,
    fontWeight: FontWeight,
    grit: number,
  ): RenderedWord {
    const metrics = this.measure(text, fontSize, fontWeight);
    const pad = Math.max(10, fontSize * 0.24);
    const logicalWidth = metrics.width + pad * 2;
    const logicalHeight = metrics.ascent + metrics.descent + pad * 2;
    const rendered: RenderedWord = {
      canvas: makeCanvas(1, 1),
      logicalWidth,
      logicalHeight,
      textWidth: metrics.width,
      ascent: metrics.ascent,
      descent: metrics.descent,
      pad,
    };

    const canvas = makeCanvas(logicalWidth * SUPERSAMPLE, logicalHeight * SUPERSAMPLE);
    rendered.canvas = canvas;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      return rendered;
    }

    ctx.scale(SUPERSAMPLE, SUPERSAMPLE);
    this.setMeasureFont(ctx, fontSize, fontWeight);
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = color;
    ctx.fillText(text, logicalWidth / 2, pad + metrics.ascent);

    const rng = mulberry32(hashString(`${text}|${color}|${fontWeight}|${Math.round(grit)}`));
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = image.data;
    const width = canvas.width;
    const height = canvas.height;
    const pxScale = SUPERSAMPLE;
    const base = fontSize * pxScale * 0.012;
    const gritFactor = clamp(grit / 100, 0, 1);

    const alphaAt = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= width || y >= height) return 0;
      return data[(y * width + x) * 4 + 3];
    };

    const edgePoints: Array<{ x: number; y: number }> = [];
    const sampleStep = 3;
    for (let y = 2; y < height - 2; y += sampleStep) {
      for (let x = 2; x < width - 2; x += sampleStep) {
        if (alphaAt(x, y) < 90) continue;
        const open =
          alphaAt(x - 4, y) < 28 ||
          alphaAt(x + 4, y) < 28 ||
          alphaAt(x, y - 4) < 28 ||
          alphaAt(x, y + 4) < 28 ||
          alphaAt(x - 3, y - 3) < 28 ||
          alphaAt(x + 3, y - 3) < 28 ||
          alphaAt(x - 3, y + 3) < 28 ||
          alphaAt(x + 3, y + 3) < 28;
        if (open) edgePoints.push({ x, y });
      }
    }

    if (edgePoints.length === 0) {
      return rendered;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.save();
    ctx.fillStyle = color;

    const splatterCount = Math.min(210, Math.floor(edgePoints.length * (0.012 + gritFactor * 0.04)));
    for (let index = 0; index < splatterCount; index += 1) {
      const point = edgePoints[Math.floor(rng() * edgePoints.length)];
      const angle = rng() * Math.PI * 2;
      const distance = base * (0.7 + rng() * 4.6);
      const radius = base * (0.2 + rng() * 1.15);
      ctx.globalAlpha = 0.18 + rng() * 0.55;
      ctx.beginPath();
      ctx.arc(point.x + Math.cos(angle) * distance, point.y + Math.sin(angle) * distance, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let index = 0; index < 26; index += 1) {
      const point = edgePoints[Math.floor(rng() * edgePoints.length)];
      const angle = rng() * Math.PI * 2;
      const distance = base * (3 + rng() * 10);
      ctx.globalAlpha = 0.08 + rng() * 0.22;
      ctx.beginPath();
      ctx.arc(point.x + Math.cos(angle) * distance, point.y + Math.sin(angle) * distance, base * (0.12 + rng() * 0.45), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";

    const edgeErasures = Math.min(380, Math.floor(edgePoints.length * (0.018 + gritFactor * 0.085)));
    for (let index = 0; index < edgeErasures; index += 1) {
      const point = edgePoints[Math.floor(rng() * edgePoints.length)];
      const radius = base * (0.35 + rng() * (1.1 + gritFactor * 2.1));
      ctx.globalAlpha = 0.42 + rng() * 0.58;
      ctx.beginPath();
      ctx.ellipse(
        point.x + (rng() - 0.5) * base * 2,
        point.y + (rng() - 0.5) * base * 2,
        radius * (0.8 + rng() * 0.8),
        radius * (0.45 + rng() * 0.8),
        rng() * Math.PI,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    const speckleCount = Math.floor(50 + gritFactor * 130);
    for (let index = 0; index < speckleCount; index += 1) {
      const x = Math.floor(rng() * width);
      const y = Math.floor(rng() * height);
      if (alphaAt(x, y) < 80) continue;
      const radius = base * (0.18 + rng() * 0.7);
      ctx.globalAlpha = 0.5 + rng() * 0.5;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let index = 0; index < 8 + Math.floor(gritFactor * 12); index += 1) {
      const point = edgePoints[Math.floor(rng() * edgePoints.length)];
      ctx.globalAlpha = 0.3 + rng() * 0.4;
      ctx.lineWidth = Math.max(0.6, base * (0.12 + rng() * 0.35));
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(point.x + (rng() - 0.5) * base * 8, point.y + (rng() - 0.5) * base * 8);
      ctx.stroke();
    }

    ctx.restore();
    return rendered;
  }
}
