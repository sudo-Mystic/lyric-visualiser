import type { BackgroundMode } from "../types";
import { mulberry32 } from "./random";

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function paintGrunge(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Pure black. The rain system and glitch renderer do all the texture
  // work for this preset, in Visualizer, so the background stays flat.
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);
}

function paintStage(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // A dark stage: a spotlight cone from the top centre, a floor line,
  // nothing else. The karaoke line lives in the lit bottom third.
  const base = ctx.createLinearGradient(0, 0, 0, height);
  base.addColorStop(0, "#0a0f1e");
  base.addColorStop(0.55, "#101828");
  base.addColorStop(1, "#05070d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  const cone = ctx.createLinearGradient(0, 0, 0, height * 0.85);
  cone.addColorStop(0, "rgba(255, 214, 10, 0.16)");
  cone.addColorStop(1, "rgba(255, 214, 10, 0)");
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(width * 0.44, 0);
  ctx.lineTo(width * 0.56, 0);
  ctx.lineTo(width * 0.88, height * 0.85);
  ctx.lineTo(width * 0.12, height * 0.85);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fillRect(0, height * 0.85, width, 1);
}

function paintCollagePaper(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Off-white poster paper, with a thick black poster frame. Deliberately
  // the opposite of the black grunge frame: light, flat, print-like.
  const short = Math.min(width, height);
  ctx.fillStyle = "#f2ead8";
  ctx.fillRect(0, 0, width, height);

  const rng = mulberry32(0xc011a6e);
  const area = width * height;
  for (let index = 0; index < Math.round(area / 900); index += 1) {
    const x = rng() * width;
    const y = rng() * height;
    ctx.fillStyle = rng() > 0.5 ? "rgba(17, 17, 17, 0.05)" : "rgba(255, 255, 255, 0.25)";
    ctx.fillRect(x, y, 1 + rng() * 2, 1 + rng() * 2);
  }

  ctx.strokeStyle = "#111111";
  ctx.lineWidth = Math.max(6, short * 0.012);
  ctx.strokeRect(short * 0.03, short * 0.03, width - short * 0.06, height - short * 0.06);
  ctx.strokeStyle = "#e8001d";
  ctx.lineWidth = Math.max(2, short * 0.003);
  ctx.strokeRect(short * 0.055, short * 0.055, width - short * 0.11, height - short * 0.11);
}

function paintTerminal(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Near-black terminal with a faint green tint and static scanlines.
  // The scrolling log in Visualizer provides the motion; the background
  // itself is flat and utilitarian on purpose.
  ctx.fillStyle = "#030805";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "rgba(77, 255, 136, 0.03)";
  for (let y = 0; y < height; y += 4) {
    ctx.fillRect(0, y, width, 1);
  }
  ctx.fillStyle = "rgba(77, 255, 136, 0.10)";
  ctx.fillRect(0, 0, width, Math.max(2, height * 0.002));
}

function paintNeonNight(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Night street: purple sky, a horizon glow, and a perspective grid
  // floor. No dots, no paper, no spotlight cone, no rain.
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#0b0221");
  sky.addColorStop(0.55, "#1b0b3a");
  sky.addColorStop(0.62, "#3a0f4d");
  sky.addColorStop(1, "#05010f");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const horizon = height * 0.58;
  const glow = ctx.createRadialGradient(
    width / 2, horizon, 0, width / 2, horizon, width * 0.45,
  );
  glow.addColorStop(0, "rgba(255, 46, 136, 0.28)");
  glow.addColorStop(0.5, "rgba(0, 229, 255, 0.10)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, horizon - height * 0.3, width, height * 0.6);

  // Perspective grid below the horizon.
  ctx.strokeStyle = "rgba(0, 229, 255, 0.28)";
  ctx.lineWidth = 1;
  const vanishingX = width / 2;
  for (let i = -8; i <= 8; i += 1) {
    ctx.beginPath();
    ctx.moveTo(vanishingX, horizon);
    ctx.lineTo(vanishingX + i * width * 0.22, height);
    ctx.stroke();
  }
  let y = horizon;
  let step = 6;
  while (y < height) {
    ctx.strokeStyle = "rgba(0, 229, 255, 0.22)";
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    y += step;
    step *= 1.35;
  }
}

function paintComicDots(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Comic halftone: bright yellow field with red dots that grow toward
  // the bottom right. Nothing like the other five backgrounds.
  const short = Math.min(width, height);
  ctx.fillStyle = "#ffcf00";
  ctx.fillRect(0, 0, width, height);

  const step = short * 0.055;
  for (let y = step / 2; y < height; y += step) {
    for (let x = step / 2; x < width; x += step) {
      const t = (x / width) * 0.7 + (y / height) * 0.7;
      const radius = step * (0.08 + Math.min(0.32, t * 0.22));
      ctx.fillStyle = "rgba(230, 0, 30, 0.55)";
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = "rgba(255, 255, 255, 0.10)";
  ctx.fillRect(0, 0, width, height * 0.06);
}

function createThemeBackground(width: number, height: number, mode: BackgroundMode) {
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  switch (mode) {
    case "stage":
      paintStage(ctx, width, height);
      break;
    case "collage-paper":
      paintCollagePaper(ctx, width, height);
      break;
    case "terminal":
      paintTerminal(ctx, width, height);
      break;
    case "neon-night":
      paintNeonNight(ctx, width, height);
      break;
    case "comic-dots":
      paintComicDots(ctx, width, height);
      break;
    case "grunge":
    default:
      paintGrunge(ctx, width, height);
      break;
  }
  return canvas;
}

export class BackgroundRenderer {
  private cache = new Map<BackgroundMode, HTMLCanvasElement>();

  constructor(
    private width: number,
    private height: number,
  ) {}

  draw(ctx: CanvasRenderingContext2D, mode: BackgroundMode) {
    if (mode === "grunge") {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, this.width, this.height);
      return;
    }

    const cached = this.cache.get(mode) ?? createThemeBackground(this.width, this.height, mode);
    this.cache.set(mode, cached);
    ctx.drawImage(cached, 0, 0);
  }
}
