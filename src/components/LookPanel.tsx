import type { StyleSettings, VisualTheme } from "../lib/types";
import { canvasFormatLabel } from "../lib/render/formats";
import { VISUAL_THEMES, themePreset, visualTheme } from "../lib/render/themes";
import { cn } from "./ui";

const THEME_SWATCH: Record<VisualTheme, string> = {
  "raakh-grunge": "linear-gradient(135deg, #000000 0%, #1a0505 58%, #ff252b 130%)",
  "karaoke-stage": "linear-gradient(135deg, #0a0f1e 0%, #101828 58%, #ffd60a 130%)",
  "kinetic-collage": "linear-gradient(135deg, #f2ead8 0%, #e8ddc2 58%, #e8001d 130%)",
  "terminal-scroll": "linear-gradient(135deg, #030805 0%, #0a2412 58%, #4dff88 130%)",
  "neon-sign": "linear-gradient(135deg, #0b0221 0%, #1b0b3a 58%, #00e5ff 130%)",
  "comic-pop": "linear-gradient(135deg, #ffcf00 0%, #ffbf00 58%, #e8001d 130%)",
};

const FONT_SAMPLE: Record<VisualTheme, string> = {
  "raakh-grunge": '"Noto Sans Devanagari Variable", sans-serif',
  "karaoke-stage": '"Noto Sans Devanagari Variable", sans-serif',
  "kinetic-collage": '"Noto Sans Devanagari Variable", sans-serif',
  "terminal-scroll": '"JetBrains Mono Variable", monospace',
  "neon-sign": '"Noto Sans Devanagari Variable", sans-serif',
  "comic-pop": '"Noto Sans Devanagari Variable", sans-serif',
};

const SAMPLE_COLOR: Record<VisualTheme, string> = {
  "raakh-grunge": "#f4f1e8",
  "karaoke-stage": "#ffd60a",
  "kinetic-collage": "#111111",
  "terminal-scroll": "#4dff88",
  "neon-sign": "#00e5ff",
  "comic-pop": "#111111",
};

interface LookPanelProps {
  style: StyleSettings;
  onChange: (patch: Partial<StyleSettings>) => void;
}

export function LookPanel({ style, onChange }: LookPanelProps) {
  const active = visualTheme(style.theme);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-dim">
            Presets
          </div>
          <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-bone">
            Six different engines
          </h2>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-dim">
          {VISUAL_THEMES.length} / no sliders
        </span>
      </div>

      <p className="text-[11px] leading-relaxed text-muted">
        Each preset is a different way of reading a song, not a different
        colour on the same layout. Layout, reading unit and motion all
        change when you switch.
      </p>

      <div className="space-y-2">
        {VISUAL_THEMES.map((theme) => {
          const selected = theme.value === style.theme;
          return (
            <button
              key={theme.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(themePreset(theme.value))}
              className={cn(
                "group block w-full overflow-hidden rounded-md border text-left transition-colors",
                selected
                  ? "border-blood/45 bg-blood/[0.05]"
                  : "border-edge/80 bg-white/[0.018] hover:border-white/20 hover:bg-white/[0.035]",
              )}
            >
              <div
                className="relative flex h-[76px] items-center justify-center overflow-hidden border-b border-white/[0.07]"
                style={{ background: THEME_SWATCH[theme.value] }}
              >
                <span
                  className="select-none text-[26px] font-bold tracking-[0.18em]"
                  style={{
                    color: SAMPLE_COLOR[theme.value],
                    fontFamily: FONT_SAMPLE[theme.value],
                  }}
                >
                  <span style={{ color: theme.colorA }}>रा</span>ख़
                </span>
                {selected ? (
                  <span className="absolute right-2 top-2 rounded-sm border border-white/15 bg-black/45 px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-bone">
                    Active
                  </span>
                ) : null}
              </div>

              <div className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div
                      className={cn(
                        "text-[13px] font-semibold",
                        selected ? "text-bone" : "text-muted",
                      )}
                    >
                      {theme.label}
                    </div>
                    <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-dim">
                      {theme.fontLabel}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-sm border border-edge/80 bg-black/25 px-1.5 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-dim">
                    {canvasFormatLabel(theme.canvasFormat)}
                  </span>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted">
                  {theme.caption}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-sm bg-white/[0.04] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] text-dim">
                    Layout: {theme.layout}
                  </span>
                  <span className="rounded-sm bg-white/[0.04] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] text-dim">
                    Reading: {theme.reading}
                  </span>
                  <span className="rounded-sm bg-white/[0.04] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] text-dim">
                    Motion: {theme.motion}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-md border border-edge/60 bg-black/20 p-3">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-dim">
          Current preset
        </div>
        <p className="text-[11px] leading-relaxed text-muted">{active.caption}</p>
        <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-dim">
          {active.fontLabel} · {canvasFormatLabel(active.canvasFormat)} · {active.lyricsMode}
        </p>
      </div>
    </div>
  );
}
