import { clamp, mulberry32 } from "./random";

const BLUR_SCALE = 0.42;

interface LensDrop {
  x: number;
  y: number;
  radius: number;
  stretch: number;
  lean: number;
  alpha: number;
  magnification: number;
}

interface SlideDrop {
  x: number;
  radius: number;
  speed: number;
  phase: number;
  trail: number;
  wobble: number;
  seed: number;
  alpha: number;
  lean: number;
}

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.round(width));
  canvas.height = Math.max(2, Math.round(height));
  return canvas;
}

export class RainSystem {
  private intensity = -1;
  private drops: LensDrop[] = [];
  private sliders: SlideDrop[] = [];
  private mistCanvas: HTMLCanvasElement;
  private blurCanvas: HTMLCanvasElement;
  private blurContext: CanvasRenderingContext2D | null;

  constructor(
    private width: number,
    private height: number,
  ) {
    this.mistCanvas = makeCanvas(width, height);
    this.blurCanvas = makeCanvas(width * BLUR_SCALE, height * BLUR_SCALE);
    this.blurContext = this.blurCanvas.getContext("2d");
  }

  setIntensity(intensity: number) {
    const safe = clamp(Math.round(intensity), 0, 100);
    if (safe === this.intensity) return;
    this.intensity = safe;
    this.generate();
  }

  private generate() {
    const amount = this.intensity / 100;
    const areaFactor = (this.width * this.height) / (1080 * 1920);
    const sizeUnit = Math.min(this.width, this.height) / 1080;
    const rng = mulberry32(0x71a1b0 + this.intensity * 997);
    const total = Math.round((13 + 68 * amount) * Math.max(0.55, areaFactor));
    const heroCount = this.intensity === 0 ? 0 : Math.round(2 + 7 * amount);
    const sliderCount = this.intensity === 0 ? 0 : Math.round(1 + 7 * amount);

    this.drops = Array.from({ length: total }, (_, index) => {
      const hero = index < heroCount;
      const radius = hero
        ? sizeUnit * (16 + rng() * 14)
        : sizeUnit * (2.6 + rng() ** 2.4 * 17);
      return {
        x: rng() * this.width,
        y: rng() * this.height,
        radius,
        stretch: 1.02 + rng() * 0.12,
        lean: (rng() - 0.5) * radius * 0.34,
        alpha: 0.7 + rng() * 0.28,
        magnification: 1.12 + rng() * 0.34,
      };
    });

    this.sliders = Array.from({ length: sliderCount }, () => {
      const radius = sizeUnit * (3.4 + rng() * 5.2);
      return {
        x: this.width * (0.06 + rng() * 0.88),
        radius,
        speed: sizeUnit * (17 + rng() * 38),
        phase: rng() * (this.height + 500),
        trail: sizeUnit * (90 + rng() * 300),
        wobble: sizeUnit * (2 + rng() * 8),
        seed: rng() * Math.PI * 2,
        alpha: 0.78 + rng() * 0.2,
        lean: (rng() - 0.5) * radius * 0.3,
      };
    });

    this.buildMist(amount, sizeUnit, rng);
  }

  private buildMist(amount: number, sizeUnit: number, rng: () => number) {
    const ctx = this.mistCanvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    if (amount <= 0) return;

    const short = Math.min(this.width, this.height);
    const areaFactor = (this.width * this.height) / (1080 * 1920);

    for (let index = 0; index < 11; index += 1) {
      const x = rng() * this.width;
      const y = rng() * this.height;
      const radius = short * (0.13 + rng() * 0.28);
      const fog = ctx.createRadialGradient(x, y, 0, x, y, radius);
      fog.addColorStop(0, `rgba(158, 184, 195, ${0.014 + rng() * 0.018})`);
      fog.addColorStop(0.55, `rgba(118, 145, 158, ${0.006 + rng() * 0.008})`);
      fog.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = fog;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    const microCount = Math.round((380 + 2350 * amount) * Math.max(0.5, areaFactor));
    for (let index = 0; index < microCount; index += 1) {
      const x = rng() * this.width;
      const y = rng() * this.height;
      const radius = sizeUnit * (0.3 + rng() ** 2.2 * 1.85);
      const alpha = 0.022 + rng() * 0.105;

      ctx.fillStyle = `rgba(128, 158, 171, ${alpha * 0.52})`;
      ctx.beginPath();
      ctx.ellipse(
        x + radius * 0.2,
        y + radius * 0.32,
        radius,
        radius * 0.78,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      ctx.fillStyle = `rgba(226, 242, 248, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x - radius * 0.12, y - radius * 0.12, radius * 0.74, 0, Math.PI * 2);
      ctx.fill();
    }

    const runnelCount = Math.round(18 * amount);
    for (let index = 0; index < runnelCount; index += 1) {
      const x = rng() * this.width;
      const y = rng() * this.height;
      const length = sizeUnit * (10 + rng() * 48);
      const gradient = ctx.createLinearGradient(x, y, x, y + length);
      gradient.addColorStop(0, "rgba(206, 228, 237, 0)");
      gradient.addColorStop(0.65, `rgba(206, 228, 237, ${0.012 + rng() * 0.02})`);
      gradient.addColorStop(1, "rgba(206, 228, 237, 0)");
      ctx.strokeStyle = gradient;
      ctx.lineWidth = sizeUnit * (0.45 + rng() * 0.55);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        x + (rng() - 0.5) * sizeUnit * 5,
        y + length * 0.5,
        x,
        y + length,
      );
      ctx.stroke();
    }
  }

  render(ctx: CanvasRenderingContext2D, source: HTMLCanvasElement, time: number) {
    if (this.intensity <= 0 || this.drops.length === 0) return;
    const blur = this.blurContext;
    if (!blur) return;

    blur.setTransform(1, 0, 0, 1, 0, 0);
    blur.clearRect(0, 0, this.blurCanvas.width, this.blurCanvas.height);
    blur.filter = `blur(${1.35 + this.intensity * 0.006}px)`;
    blur.drawImage(source, 0, 0, this.blurCanvas.width, this.blurCanvas.height);
    blur.filter = "none";

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(this.mistCanvas, 0, 0);

    for (const drop of this.drops) {
      this.drawLens(
        ctx,
        drop.x,
        drop.y,
        drop.radius,
        drop.radius * drop.stretch,
        drop.lean,
        drop.alpha,
        drop.magnification,
      );
    }

    for (const slider of this.sliders) {
      const loop = this.height + slider.trail + 460;
      const travelled = (slider.phase + time * slider.speed) % loop;
      const y = travelled - slider.trail - 170;
      if (y - slider.trail > this.height || y < -slider.trail) continue;
      const x = this.sliderX(slider, y, time);
      this.drawSliderTrail(ctx, slider, x, y, time);
      if (y > -slider.radius && y < this.height + slider.radius) {
        const stretch = 1.18 + Math.min(0.35, slider.speed / 180);
        this.drawLens(
          ctx,
          x,
          y,
          slider.radius,
          slider.radius * stretch,
          slider.lean,
          slider.alpha,
          1.08,
        );
      }
    }

    ctx.restore();
  }

  private sliderX(slider: SlideDrop, y: number, time: number) {
    return (
      slider.x +
      Math.sin(y * 0.007 + slider.seed) * slider.wobble +
      Math.sin(time * 0.55 + slider.seed * 1.7) * slider.wobble * 0.22
    );
  }

  private drawSliderTrail(
    ctx: CanvasRenderingContext2D,
    slider: SlideDrop,
    x: number,
    y: number,
    time: number,
  ) {
    const steps = 10;
    const points: Array<{ x: number; y: number }> = [];
    for (let index = 0; index <= steps; index += 1) {
      const pointY = y - (slider.trail * index) / steps;
      points.push({ x: this.sliderX(slider, pointY, time), y: pointY });
    }

    const gradient = ctx.createLinearGradient(0, y - slider.trail, 0, y);
    gradient.addColorStop(0, "rgba(196, 224, 235, 0)");
    gradient.addColorStop(0.55, "rgba(196, 224, 235, 0.018)");
    gradient.addColorStop(0.9, "rgba(216, 238, 247, 0.065)");
    gradient.addColorStop(1, "rgba(230, 247, 252, 0.1)");

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(102, 133, 148, 0.055)";
    ctx.lineWidth = Math.max(1.4, slider.radius * 0.56);
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();

    ctx.strokeStyle = gradient;
    ctx.lineWidth = Math.max(0.55, slider.radius * 0.17);
    ctx.stroke();

    for (let index = 2; index <= steps - 1; index += 2) {
      const point = points[index];
      const progress = 1 - index / steps;
      const radius = Math.max(0.45, slider.radius * (0.08 + progress * 0.14));
      ctx.globalAlpha = 0.13 + progress * 0.2;
      ctx.fillStyle = "rgba(222, 242, 250, 0.85)";
      ctx.beginPath();
      ctx.arc(point.x + Math.sin(index * 2.1) * 1.4, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private traceLens(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    rx: number,
    ry: number,
    lean: number,
  ) {
    const topX = x + lean;
    ctx.beginPath();
    ctx.moveTo(topX, y - ry);
    ctx.bezierCurveTo(
      topX + rx * 0.72,
      y - ry * 0.98,
      x + rx,
      y - ry * 0.48,
      x + rx * 0.94,
      y + ry * 0.12,
    );
    ctx.bezierCurveTo(
      x + rx * 0.86,
      y + ry * 0.7,
      x + rx * 0.42,
      y + ry * 0.98,
      x,
      y + ry,
    );
    ctx.bezierCurveTo(
      x - rx * 0.42,
      y + ry * 0.98,
      x - rx * 0.86,
      y + ry * 0.7,
      x - rx * 0.94,
      y + ry * 0.12,
    );
    ctx.bezierCurveTo(
      x - rx,
      y - ry * 0.48,
      topX - rx * 0.72,
      y - ry * 0.98,
      topX,
      y - ry,
    );
    ctx.closePath();
  }

  private drawLens(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    rx: number,
    ry: number,
    lean: number,
    alpha: number,
    magnification: number,
  ) {
    const blur = this.blurContext;
    if (!blur || rx < 1.1) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    this.traceLens(ctx, x, y, rx, ry, lean);
    ctx.clip();

    const sourceWidth = (rx * 2) / magnification;
    const sourceHeight = (ry * 2) / magnification;
    const scaleX = this.blurCanvas.width / this.width;
    const scaleY = this.blurCanvas.height / this.height;
    const sourceX = (x + rx * 0.08 - sourceWidth / 2) * scaleX;
    const sourceY = (y + ry * 0.12 - sourceHeight / 2) * scaleY;

    ctx.drawImage(
      this.blurCanvas,
      sourceX,
      sourceY,
      sourceWidth * scaleX,
      sourceHeight * scaleY,
      x - rx,
      y - ry,
      rx * 2,
      ry * 2,
    );

    const tint = ctx.createLinearGradient(x, y - ry, x, y + ry);
    tint.addColorStop(0, "rgba(231, 246, 252, 0.11)");
    tint.addColorStop(0.48, "rgba(151, 190, 207, 0.025)");
    tint.addColorStop(0.82, "rgba(52, 78, 91, 0.03)");
    tint.addColorStop(1, "rgba(0, 0, 0, 0.25)");
    ctx.fillStyle = tint;
    ctx.fillRect(x - rx * 1.2, y - ry * 1.2, rx * 2.4, ry * 2.4);

    if (rx > 2.4) {
      const glint = ctx.createRadialGradient(
        x + lean - rx * 0.34,
        y - ry * 0.48,
        0,
        x + lean - rx * 0.34,
        y - ry * 0.48,
        Math.max(1, rx * 0.44),
      );
      glint.addColorStop(
        0,
        `rgba(255, 255, 255, ${clamp(0.16 + rx * 0.008, 0.16, 0.38)})`,
      );
      glint.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = glint;
      ctx.fillRect(x - rx * 1.2, y - ry * 1.2, rx * 2.4, ry * 1.7);
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = alpha;
    this.traceLens(ctx, x, y, rx, ry, lean);
    ctx.strokeStyle = "rgba(211, 237, 247, 0.1)";
    ctx.lineWidth = Math.max(0.5, rx * 0.045);
    ctx.stroke();

    if (rx > 4) {
      ctx.strokeStyle = "rgba(0, 0, 0, 0.32)";
      ctx.lineWidth = Math.max(0.8, rx * 0.075);
      ctx.beginPath();
      ctx.ellipse(
        x + 0.5,
        y + ry * 0.08,
        rx * 0.82,
        ry * 0.84,
        0,
        Math.PI * 0.16,
        Math.PI * 0.84,
      );
      ctx.stroke();
    }
    ctx.restore();
  }
}
