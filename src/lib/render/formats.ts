import type { CanvasFormat } from "../types";

export interface CanvasFormatInfo {
  value: CanvasFormat;
  label: string;
  shortLabel: string;
  width: number;
  height: number;
  aspect: string;
}

export const CANVAS_FORMATS: readonly CanvasFormatInfo[] = [
  {
    value: "story",
    label: "Story",
    shortLabel: "9:16",
    width: 1080,
    height: 1920,
    aspect: "9 / 16",
  },
  {
    value: "portrait",
    label: "Portrait",
    shortLabel: "4:5",
    width: 1080,
    height: 1350,
    aspect: "4 / 5",
  },
  {
    value: "square",
    label: "Square",
    shortLabel: "1:1",
    width: 1080,
    height: 1080,
    aspect: "1 / 1",
  },
  {
    value: "landscape",
    label: "Wide",
    shortLabel: "16:9",
    width: 1920,
    height: 1080,
    aspect: "16 / 9",
  },
];

const FALLBACK = CANVAS_FORMATS[0];

export function canvasFormatInfo(format: CanvasFormat): CanvasFormatInfo {
  return CANVAS_FORMATS.find((item) => item.value === format) ?? FALLBACK;
}

export function canvasSize(format: CanvasFormat) {
  const info = canvasFormatInfo(format);
  return { width: info.width, height: info.height };
}

export function canvasFormatLabel(format: CanvasFormat) {
  const info = canvasFormatInfo(format);
  return `${info.width} × ${info.height} · ${info.shortLabel}`;
}
