import { RotateCcw } from "lucide-react";
import type {
  CanvasFormat,
  ColorMode,
  FontWeight,
  LyricsMode,
  StyleSettings,
  VisualTheme,
  WordAnimation,
} from "../lib/types";
import { CANVAS_FORMATS, canvasFormatLabel } from "../lib/render/formats";
import { VISUAL_THEMES, themePreset, visualTheme } from "../lib/render/themes";
import { Button, cn, SectionLabel, Segmented, Slider } from "./ui";

const LYRICS_MODE_HINT: Record<LyricsMode, string> = {
  word: "One word at a time, custom-fitted to the frame.",
  line: "The whole line holds the frame while the current word takes the accent.",
  stack: "Previous, current and next lines sit like a lyric sheet.",
};

const THEME_SWATCH: Record<VisualTheme, string> = {
  obsidian: "linear-gradient(135deg, #050505 0%, #191919 58%, #3a0507 100%)",
  "neon-monsoon": "linear-gradient(135deg, #08151c 0%, #0c2a36 58%, #1a6675 100%)",
  papyrus: "linear-gradient(135deg, #e8dcc8 0%, #d9c49d 58%, #a42318 130%)",
  aurora: "linear-gradient(135deg, #020608 0%, #063033 58%, #15966a 115%)",
  "ember-dusk": "linear-gradient(135deg, #130609 0%, #431014 58%, #8e2517 100%)",
  "ink-signal": "linear-gradient(135deg, #040710 0%, #10255d 58%, #00e5ff 125%)",
};

function ThemePicker({
  value,
  onChange,
}: {
  value: VisualTheme;
  onChange: (value: VisualTheme) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {VISUAL_THEMES.map((theme) => {
        const active = theme.value === value;
        return (
          <button
            key={theme.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(theme.value)}
            className={cn(
              "group min-h-[64px] rounded-md border p-1.5 text-left transition-colors",
              active
                ? "border-blood/40 bg-blood/[0.05]"
                : "border-edge/80 bg-white/[0.018] hover:border-white/20 hover:bg-white/[0.035]",
            )}
          >
            <span
              className="mb-1.5 flex h-9 items-center justify-center overflow-hidden rounded-sm border border-white/10"
              style={{ background: THEME_SWATCH[theme.value] }}
            >
              <span
                className="text-[11px] font-bold uppercase tracking-[0.12em]"
                style={{ color: theme.colorB }}
              >
                <span style={{ color: theme.colorA }}>रा</span>ख़
              </span>
            </span>
            <span
              className={cn(
                "block truncate text-[11px] font-medium",
                active ? "text-bone" : "text-muted",
              )}
            >
              {theme.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const BACKGROUNDS: Array<{ value: StyleSettings["background"]; label: string }> = [
  { value: "black", label: "Black" },
  { value: "blood", label: "Blood" },
  { value: "paper", label: "Paper" },
  { value: "monsoon", label: "Monsoon" },
  { value: "aurora", label: "Aurora" },
  { value: "dusk", label: "Dusk" },
  { value: "signal", label: "Signal" },
];

function BackgroundPicker({
  value,
  onChange,
}: {
  value: StyleSettings["background"];
  onChange: (value: StyleSettings["background"]) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-1">
      {BACKGROUNDS.map((item) => (
        <button
          key={item.value}
          type="button"
          aria-pressed={item.value === value}
          onClick={() => onChange(item.value)}
          className={cn(
            "h-7 rounded-[4px] border px-1 text-[10px] font-medium transition-colors",
            item.value === value
              ? "border-white/25 bg-white/[0.09] text-bone"
              : "border-edge/70 bg-black/25 text-dim hover:text-muted",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function FormatPicker({
  value,
  onChange,
}: {
  value: CanvasFormat;
  onChange: (value: CanvasFormat) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {CANVAS_FORMATS.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "group flex items-center gap-2.5 rounded-md border px-2.5 py-2 text-left transition-colors",
              active
                ? "border-blood/35 bg-blood/[0.06]"
                : "border-edge/80 bg-white/[0.018] hover:border-white/20 hover:bg-white/[0.035]",
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] border",
                active ? "border-blood/30" : "border-edge/80",
              )}
            >
              <span
                className={cn(
                  "block rounded-[1px] border",
                  active ? "border-blood/70 bg-blood/15" : "border-dim/50 bg-white/[0.03]",
                )}
                style={{
                  width: item.width >= item.height ? 12 : 8,
                  height: item.height >= item.width ? 12 : 8,
                  aspectRatio: item.aspect,
                }}
              />
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  "block text-[11px] font-medium",
                  active ? "text-bone" : "text-muted",
                )}
              >
                {item.label}
              </span>
              <span className="block font-mono text-[9px] tracking-[0.04em] text-dim">
                {item.shortLabel}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface LookPanelProps {
  style: StyleSettings;
  onChange: (patch: Partial<StyleSettings>) => void;
  onReset: () => void;
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-1 items-center gap-2 rounded-md border border-edge bg-black/25 p-1.5">
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="size-7 shrink-0"
        aria-label={label}
      />
      <span className="min-w-0">
        <span className="block text-[9px] font-medium uppercase tracking-[0.1em] text-dim">
          {label}
        </span>
        <span className="block font-mono text-[10px] uppercase text-muted">{value}</span>
      </span>
    </label>
  );
}

export function LookPanel({ style, onChange, onReset }: LookPanelProps) {
  return (
    <div className="space-y-7">
      <div>
        <SectionLabel>Visual theme</SectionLabel>
        <ThemePicker value={style.theme} onChange={(theme) => onChange(themePreset(theme))} />
        <p className="mt-2 text-[10px] leading-relaxed text-dim">
          {visualTheme(style.theme).caption}
        </p>
      </div>

      <div>
        <SectionLabel
          action={
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 text-[10px] text-dim transition-colors hover:text-bone"
            >
              <RotateCcw className="size-2.5" />
              Reset
            </button>
          }
        >
          Frame
        </SectionLabel>
        <FormatPicker
          value={style.canvasFormat}
          onChange={(canvasFormat) => onChange({ canvasFormat })}
        />
        <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.08em] text-dim">
          {canvasFormatLabel(style.canvasFormat)}
        </p>
      </div>

      <div>
        <SectionLabel>Lyrics layout</SectionLabel>
        <Segmented
          compact
          value={style.lyricsMode}
          onChange={(value: LyricsMode) => onChange({ lyricsMode: value })}
          options={[
            { value: "word", label: "Word" },
            { value: "line", label: "Line" },
            { value: "stack", label: "Stack" },
          ]}
        />
        <p className="mt-2 text-[10px] leading-relaxed text-dim">
          {LYRICS_MODE_HINT[style.lyricsMode]}
        </p>
      </div>

      <div>
        <SectionLabel>Palette</SectionLabel>
        <Segmented
          value={style.colorMode}
          onChange={(value: ColorMode) => onChange({ colorMode: value })}
          options={[
            { value: "alternate", label: "Alternate" },
            { value: "red", label: "Red" },
            { value: "white", label: "Bone" },
          ]}
        />
        <div className="mt-2 flex gap-2">
          <ColorField
            label="Word A"
            value={style.colorA}
            onChange={(colorA) => onChange({ colorA })}
          />
          <ColorField
            label="Word B"
            value={style.colorB}
            onChange={(colorB) => onChange({ colorB })}
          />
        </div>
        <p className="mt-2 text-[9px] leading-relaxed text-dim">
          Alternate cycles A / B per word. Individual word colours can be set in the timing
          editor.
        </p>
      </div>

      <div>
        <SectionLabel>Type</SectionLabel>
        <div className="space-y-4 rounded-md border border-edge/80 bg-white/[0.018] p-3">
          <Slider
            label="Type size"
            value={style.fontSize}
            min={120}
            max={340}
            step={2}
            suffix="px"
            onChange={(fontSize) => onChange({ fontSize })}
          />
          <div>
            <div className="mb-2 text-[11px] font-medium text-muted">Weight</div>
            <Segmented
              compact
              value={String(style.fontWeight)}
              onChange={(value) => onChange({ fontWeight: Number(value) as FontWeight })}
              options={[
                { value: "400", label: "Regular" },
                { value: "700", label: "Bold" },
                { value: "800", label: "Heavy" },
                { value: "900", label: "Black" },
              ]}
            />
          </div>
          <div>
            <div className="mb-2 text-[11px] font-medium text-muted">Word entrance</div>
            <Segmented
              compact
              value={style.animation}
              onChange={(value: WordAnimation) => onChange({ animation: value })}
              options={[
                { value: "cut", label: "Cut" },
                { value: "pop", label: "Pop" },
                { value: "fade", label: "Fade" },
              ]}
            />
          </div>
        </div>
      </div>

      <div>
        <SectionLabel>Atmosphere</SectionLabel>
        <div className="space-y-4 rounded-md border border-edge/80 bg-white/[0.018] p-3">
          <div>
            <div className="mb-2 text-[11px] font-medium text-muted">Backdrop</div>
            <BackgroundPicker
              value={style.background}
              onChange={(background) => onChange({ background })}
            />
          </div>
          <Slider
            label="Rain"
            value={style.rain}
            min={0}
            max={100}
            onChange={(rain) => onChange({ rain })}
            formatValue={(value) => (value === 0 ? "Off" : `${value}%`)}
          />
          <Slider
            label="Glitch"
            value={style.glitch}
            min={0}
            max={100}
            onChange={(glitch) => onChange({ glitch })}
            formatValue={(value) => (value === 0 ? "Off" : `${value}%`)}
          />
          <Slider
            label="Grit"
            value={style.grit}
            min={0}
            max={100}
            onChange={(grit) => onChange({ grit })}
            formatValue={(value) => (value === 0 ? "Clean" : `${value}%`)}
          />
        </div>
      </div>

      <div className="rounded-md border border-edge/60 bg-black/20 p-3">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-dim">
          Canvas
        </div>
        <p className="text-[10px] leading-relaxed text-muted">
          {canvasFormatLabel(style.canvasFormat)} · distressed Devanagari-capable type ·
          deterministic rain and glitch seeded per word.
        </p>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-[11px]"
        onClick={onReset}
        icon={<RotateCcw className="size-3.5" />}
      >
        Restore reference look
      </Button>
    </div>
  );
}
