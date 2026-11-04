import type { BackgroundMode } from "../types";
import { mulberry32 } from "./random";

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function paintVignette(ctx: CanvasRenderingContext2D, width: number, height: number, alpha = 0.58) {
  const short = Math.min(width, height);
  const long = Math.max(width, height);
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    short * 0.24,
    width / 2,
    height / 2,
    long * 0.78,
  );
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(1, `rgba(0, 0, 0, ${alpha})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function paintPaper(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const short = Math.min(width, height);
  const area = width * height;
  const rng = mulberry32(0x1a2739);

  ctx.fillStyle = "#e8dcc8";
  ctx.fillRect(0, 0, width, height);

  const wash = ctx.createLinearGradient(0, 0, width, height);
  wash.addColorStop(0, "rgba(255, 248, 235, 0.62)");
  wash.addColorStop(0.48, "rgba(215, 197, 160, 0.34)");
  wash.addColorStop(1, "rgba(132, 107, 74, 0.5)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);

  for (let index = 0; index < Math.round(area / 2600); index += 1) {
    const x = rng() * width;
    const y = rng() * height;
    const radius = short * (0.03 + rng() * 0.17);
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${rng() > 0.5 ? "255, 246, 226" : "111, 83, 50"}, ${0.025 + rng() * 0.055})`);
    gradient.addColorStop(1, "rgba(255, 246, 226, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  for (let index = 0; index < Math.round(area / 105); index += 1) {
    const x = rng() * width;
    const y = rng() * height;
    const size = rng() < 0.93 ? rng() * 1.35 : 1 + rng() * 2.8;
    ctx.fillStyle = rng() > 0.45 ? "rgba(70, 52, 33, 0.07)" : "rgba(255, 252, 240, 0.12)";
    ctx.fillRect(x, y, size, size);
  }

  for (let index = 0; index < Math.round(area / 26000 + 18); index += 1) {
    const x = rng() * width;
    const y = rng() * height;
    const length = short * (0.02 + rng() * 0.1);
    const angle = (rng() - 0.5) * 0.5;
    ctx.strokeStyle = `rgba(102, 78, 45, ${0.025 + rng() * 0.05})`;
    ctx.lineWidth = 0.45 + rng() * 1.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.sin(angle) * length, y + Math.cos(angle) * length);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(98, 70, 38, 0.1)";
  ctx.lineWidth = Math.max(1, short * 0.012);
  ctx.strokeRect(short * 0.055, short * 0.055, width - short * 0.11, height - short * 0.11);
  paintVignette(ctx, width, height, 0.24);
}

function paintBlood(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const short = Math.min(width, height);
  const long = Math.max(width, height);
  const area = width * height;
  const rng = mulberry32(0x5e7a11);

  ctx.fillStyle = "#070101";
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(
    width * 0.5,
    height * 0.42,
    short * 0.02,
    width * 0.5,
    height * 0.42,
    long * 0.7,
  );
  glow.addColorStop(0, "rgba(102, 11, 8, 0.88)");
  glow.addColorStop(0.42, "rgba(52, 5, 5, 0.6)");
  glow.addColorStop(1, "rgba(5, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.filter = `blur(${Math.round(Math.min(70, short * 0.065))}px)`;
  for (let index = 0; index < Math.round((area / 129_600) * 16); index += 1) {
    const x = rng() * width;
    const y = height * (0.12 + rng() * 0.78);
    const radius = short * (0.055 + rng() * 0.2);
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${110 + Math.floor(rng() * 60)}, 6, 4, ${0.07 + rng() * 0.1})`);
    gradient.addColorStop(1, "rgba(12, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  for (let index = 0; index < Math.round(area / 398); index += 1) {
    const x = rng() * width;
    const y = rng() * height;
    const size = rng() < 0.9 ? rng() * 1.6 : 1 + rng() * 4;
    const alpha = 0.025 + rng() * 0.09;
    ctx.fillStyle =
      rng() > 0.55 ? `rgba(255, 92, 74, ${alpha})` : `rgba(0, 0, 0, ${alpha * 1.8})`;
    ctx.fillRect(x, y, size, size);
  }

  for (let index = 0; index < Math.round((area / 69_120) * 30); index += 1) {
    const x = rng() * width;
    const y = rng() * height;
    const length = short * (0.03 + rng() * 0.125);
    ctx.strokeStyle = `rgba(255, 57, 37, ${0.018 + rng() * 0.04})`;
    ctx.lineWidth = 0.6 + rng() * 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rng() - 0.5) * short * 0.03, y + length);
    ctx.stroke();
  }

  paintVignette(ctx, width, height, 0.58);
}

function paintMonsoon(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const short = Math.min(width, height);
  const area = width * height;
  const rng = mulberry32(0x102a48);

  const base = ctx.createLinearGradient(0, 0, width * 0.25, height);
  base.addColorStop(0, "#08151c");
  base.addColorStop(0.46, "#0c2a36");
  base.addColorStop(0.78, "#123f4b");
  base.addColorStop(1, "#071118");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.filter = `blur(${Math.round(short * 0.09)}px)`;
  const sheen = ctx.createRadialGradient(
    width * 0.64,
    height * 0.3,
    short * 0.04,
    width * 0.64,
    height * 0.3,
    short * 0.86,
  );
  sheen.addColorStop(0, "rgba(112, 211, 230, 0.24)");
  sheen.addColorStop(0.38, "rgba(59, 132, 155, 0.14)");
  sheen.addColorStop(1, "rgba(6, 20, 25, 0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  for (let index = 0; index < Math.round(area / 340); index += 1) {
    const x = rng() * width;
    const y = rng() * height;
    const size = rng() < 0.94 ? rng() * 1.5 : 1 + rng() * 3.5;
    ctx.fillStyle = rng() > 0.45 ? "rgba(190, 238, 246, 0.055)" : "rgba(0, 0, 0, 0.08)";
    ctx.fillRect(x, y, size, size);
  }

  for (let index = 0; index < Math.round(area / 78000 + 24); index += 1) {
    const x = rng() * width;
    const y = rng() * height;
    const length = short * (0.04 + rng() * 0.22);
    ctx.strokeStyle = `rgba(170, 230, 242, ${0.018 + rng() * 0.045})`;
    ctx.lineWidth = 0.45 + rng() * 1.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - length * 0.08, y + length);
    ctx.stroke();
  }

  paintVignette(ctx, width, height, 0.46);
}

function paintAurora(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const short = Math.min(width, height);
  const area = width * height;
  const rng = mulberry32(0x0a47a1);

  ctx.fillStyle = "#020608";
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.filter = `blur(${Math.round(short * 0.065)}px)`;
  const glow = ctx.createRadialGradient(
    width * 0.68,
    height * 0.24,
    short * 0.02,
    width * 0.68,
    height * 0.24,
    short * 0.85,
  );
  glow.addColorStop(0, "rgba(48, 205, 142, 0.34)");
  glow.addColorStop(0.42, "rgba(33, 98, 164, 0.2)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let band = 0; band < 7; band += 1) {
    const y = height * (0.2 + band * 0.07);
    const phase = rng() * Math.PI * 2;
    const gradient = ctx.createLinearGradient(0, y, width, y);
    gradient.addColorStop(
      0,
      `rgba(48, 227, 159, ${0.018 + band * 0.002})`,
    );
    gradient.addColorStop(0.48, `rgba(54, 229, 193, ${0.07 + rng() * 0.07})`);
    gradient.addColorStop(1, "rgba(73, 180, 255, 0)");
    ctx.strokeStyle = gradient;
    ctx.lineWidth = short * (0.022 + rng() * 0.045);
    ctx.beginPath();
    ctx.moveTo(-short * 0.05, y);
    for (let x = 0; x <= width; x += Math.max(12, short / 28)) {
      ctx.lineTo(x, y + Math.sin(x / short * 3.4 + phase) * short * 0.055 + Math.sin(x / short * 1.2 + phase) * short * 0.025);
    }
    ctx.stroke();
  }
  ctx.restore();

  for (let index = 0; index < Math.round(area / 260); index += 1) {
    const x = rng() * width;
    const y = rng() * height * 0.75;
    const size = rng() < 0.96 ? rng() * 1.4 : 1 + rng() * 2.4;
    ctx.fillStyle = `rgba(225, 250, 244, ${0.025 + rng() * 0.16})`;
    ctx.fillRect(x, y, size, size);
  }

  paintVignette(ctx, width, height, 0.54);
}

function paintDusk(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const short = Math.min(width, height);
  const area = width * height;
  const rng = mulberry32(0x701a2f);

  const base = ctx.createLinearGradient(0, 0, width, height);
  base.addColorStop(0, "#130609");
  base.addColorStop(0.44, "#431014");
  base.addColorStop(0.72, "#8e2517");
  base.addColorStop(1, "#120203");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.filter = `blur(${Math.round(short * 0.08)}px)`;
  for (let index = 0; index < 9; index += 1) {
    const x = width * (0.2 + rng() * 0.6);
    const y = height * (0.18 + rng() * 0.62);
    const radius = short * (0.12 + rng() * 0.28);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, `rgba(255, ${110 + Math.floor(rng() * 80)}, 44, ${0.07 + rng() * 0.12})`);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  ctx.restore();

  for (let index = 0; index < Math.round(area / 520); index += 1) {
    const x = rng() * width;
    const y = rng() * height;
    const size = rng() < 0.93 ? rng() * 1.7 : 1 + rng() * 4;
    ctx.fillStyle = rng() > 0.28 ? "rgba(255, 190, 93, 0.045)" : "rgba(0, 0, 0, 0.09)";
    ctx.fillRect(x, y, size, size);
  }

  for (let index = 0; index < Math.round(area / 120000 + 15); index += 1) {
    const x = rng() * width;
    const y = rng() * height;
    const length = short * (0.035 + rng() * 0.12);
    ctx.strokeStyle = `rgba(255, 151, 52, ${0.02 + rng() * 0.045})`;
    ctx.lineWidth = 0.5 + rng() * 2.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rng() - 0.5) * short * 0.035, y + length);
    ctx.stroke();
  }

  paintVignette(ctx, width, height, 0.52);
}

function paintSignal(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const short = Math.min(width, height);
  const area = width * height;
  const rng = mulberry32(0x7e0501);

  ctx.fillStyle = "#040710";
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(
    width * 0.5,
    height * 0.42,
    short * 0.03,
    width * 0.5,
    height * 0.42,
    short * 0.92,
  );
  glow.addColorStop(0, "rgba(36, 98, 180, 0.26)");
  glow.addColorStop(0.45, "rgba(31, 24, 96, 0.18)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  const step = short / 14;
  ctx.strokeStyle = "rgba(92, 159, 255, 0.11)";
  ctx.lineWidth = 1;
  for (let x = step; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = step; y < height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  for (let index = 0; index < 8; index += 1) {
    const y = rng() * height;
    const gradient = ctx.createLinearGradient(0, y, width, y);
    gradient.addColorStop(0, "rgba(0, 229, 255, 0)");
    gradient.addColorStop(0.5, `rgba(0, 229, 255, ${0.025 + rng() * 0.045})`);
    gradient.addColorStop(1, "rgba(0, 229, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, y, width, 1 + rng() * 2);
  }

  for (let index = 0; index < Math.round(area / 330); index += 1) {
    const x = rng() * width;
    const y = rng() * height;
    const size = rng() < 0.95 ? rng() * 1.5 : 1 + rng() * 3;
    ctx.fillStyle = rng() > 0.44 ? "rgba(164, 220, 255, 0.055)" : "rgba(0, 0, 0, 0.12)";
    ctx.fillRect(x, y, size, size);
  }

  for (let y = 0; y < height; y += 3) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.07)";
    ctx.fillRect(0, y, width, 1);
  }

  paintVignette(ctx, width, height, 0.52);
}

function createThemeBackground(width: number, height: number, mode: BackgroundMode) {
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  switch (mode) {
    case "paper":
      paintPaper(ctx, width, height);
      break;
    case "blood":
      paintBlood(ctx, width, height);
      break;
    case "monsoon":
      paintMonsoon(ctx, width, height);
      break;
    case "aurora":
      paintAurora(ctx, width, height);
      break;
    case "dusk":
      paintDusk(ctx, width, height);
      break;
    case "signal":
      paintSignal(ctx, width, height);
      break;
    case "black":
    default:
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);
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
    if (mode === "black") {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, this.width, this.height);
      return;
    }

    const cached = this.cache.get(mode) ?? createThemeBackground(this.width, this.height, mode);
    this.cache.set(mode, cached);
    ctx.drawImage(cached, 0, 0);
  }
}