import type { StyleSettings, VisualTheme } from "../lib/types";
import { canvasFormatLabel } from "../lib/render/formats";
import { VISUAL_THEMES, themePreset, visualTheme } from "../lib/render/themes";
import { cn } from "./ui";

const THEME_SWATCH: Record<VisualTheme, string> = {
  "obsidian": "linear-gradient(135deg, #050505 0%, #191919 58%, #3a0507 100%)",
  "neon-monsoon": "linear-gradient(135deg, #08151c 0%, #0c2a36 58%, #1a6675 100%)",
  "papyrus": "linear-gradient(135deg, #e8dcc8 0%, #d9c49d 58%, #a42318 130%)",
  "aurora": "linear-gradient(135deg, #020608 0%, #063033 58%, #15966a 115%)",
  "ember-dusk": "linear-gradient(135deg, #130609 0%, #431014 58%, #8e2517 100%)",
  "ink-signal": "linear-gradient(135deg, #040710 0%, #10255d 58%, #00e5ff 125%)",
};

const FONT_SAMPLE: Record<VisualTheme, string> = {
  "obsidian": '"Noto Sans Devanagari Variable", sans-serif',
  "neon-monsoon": '"JetBrains Mono Variable", monospace',
  "papyrus": '"Rozha One", serif',
  "aurora": '"Kalam", sans-serif',
  "ember-dusk": '"Yatra One", sans-serif',
  "ink-signal": '"JetBrains Mono Variable", monospace',
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
            Six finished worlds
          </h2>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-dim">
          {VISUAL_THEMES.length} / no sliders
        </span>
      </div>

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
                    color: theme.colorB,
                    fontFamily: FONT_SAMPLE[theme.value],
                    textTransform: theme.value === "neon-monsoon" ? "uppercase" : undefined,
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
                    {theme.lyricsMode}
                  </span>
                  <span className="rounded-sm bg-white/[0.04] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] text-dim">
                    {theme.animation}
                  </span>
                  <span className="rounded-sm bg-white/[0.04] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] text-dim">
                    rain {theme.rain}%
                  </span>
                  <span className="rounded-sm bg-white/[0.04] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] text-dim">
                    grit {theme.grit}%
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
