import { clamp, lerp, mulberry32 } from "./random";

export interface GlitchEvent {
  start: number;
  duration: number;
  seed: number;
}

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export class GlitchRenderer {
  private channels: Array<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }> = [];
  private width = 0;
  private height = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.channels = ["#ff0000", "#00ff00", "#0000ff"].map((color) => {
      const canvas = makeCanvas(width, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("2D canvas unavailable");
      ctx.fillStyle = color;
      return { canvas, ctx };
    });
  }

  render(
    source: HTMLCanvasElement,
    target: HTMLCanvasElement,
    event: GlitchEvent,
    time: number,
    intensity: number,
  ) {
    const ctx = target.getContext("2d");
    if (!ctx) return;

    const progress = clamp((time - event.start) / Math.max(0.001, event.duration), 0, 1);
    const envelope = 1 - progress * 0.58;
    const frame = Math.floor(Math.max(0, time - event.start) * 60);
    const rng = mulberry32(event.seed + frame * 7919);
    const amplitude = (2.5 + intensity * 0.14) * envelope;

    const channelColors = ["#ff0000", "#00ff00", "#0000ff"];
    for (let index = 0; index < this.channels.length; index += 1) {
      const { ctx: channelCtx } = this.channels[index];
      channelCtx.setTransform(1, 0, 0, 1, 0, 0);
      channelCtx.globalCompositeOperation = "source-over";
      channelCtx.clearRect(0, 0, this.width, this.height);
      channelCtx.drawImage(source, 0, 0);
      channelCtx.globalCompositeOperation = "multiply";
      channelCtx.fillStyle = channelColors[index];
      channelCtx.fillRect(0, 0, this.width, this.height);
      channelCtx.globalCompositeOperation = "source-over";
    }

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, this.width, this.height);

    const direction = rng() > 0.5 ? 1 : -1;
    const redShift = direction * amplitude * (0.8 + rng() * 0.8);
    const greenShift = direction * amplitude * (rng() - 0.5) * 0.6;
    const blueShift = -direction * amplitude * (0.8 + rng() * 0.8);
    const yShift = (rng() - 0.5) * amplitude * 0.35;

    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(this.channels[0].canvas, redShift, yShift);
    ctx.drawImage(this.channels[1].canvas, greenShift, 0);
    ctx.drawImage(this.channels[2].canvas, blueShift, -yShift);

    ctx.globalCompositeOperation = "source-over";
    const sliceCount = 3 + Math.floor(intensity / 24 + rng() * 2);
    for (let index = 0; index < sliceCount; index += 1) {
      const sliceHeight = 8 + rng() * (40 + intensity * 0.9);
      const y = rng() * (this.height - sliceHeight);
      const dx = (rng() - 0.5) * 2 * (4 + intensity * 0.48) * envelope;
      const dy = (rng() - 0.5) * 5;

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y, this.width, sliceHeight);
      ctx.clip();
      ctx.drawImage(source, 0, y, this.width, sliceHeight, dx, y + dy, this.width, sliceHeight);
      ctx.restore();
    }

    const lineCount = 1 + Math.floor(rng() * 3);
    for (let index = 0; index < lineCount; index += 1) {
      const y = rng() * this.height;
      const height = 1 + rng() * 3;
      ctx.fillStyle = `rgba(255, 255, 255, ${lerp(0.02, 0.09, rng()) * envelope})`;
      ctx.fillRect(0, y, this.width, height);
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }
}
