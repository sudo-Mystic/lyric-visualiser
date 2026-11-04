import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Minus,
  Plus,
  RotateCcw,
  Scissors,
  Spline,
  Type,
  X,
} from "lucide-react";
import { normalizeDocEnds } from "../lib/lrc";
import {
  formatTime,
  formatTimeShort,
  redistributeLine,
  updateWordColor,
  updateWordStart,
} from "../lib/timing";
import type { LyricsDoc, StyleSettings, TimedWord } from "../lib/types";
import { getWordColor } from "../lib/render/palette";
import { Badge, Button, cn } from "./ui";

interface TimingEditorProps {
  open: boolean;
  onClose: () => void;
  doc: LyricsDoc | null;
  style: StyleSettings;
  selectedWordId: string | null;
  onSelectWord: (word: TimedWord) => void;
  onChangeDoc: (doc: LyricsDoc) => void;
  currentTime: number;
  duration: number;
  audioDuration: number;
  peaks: Float32Array | null;
  canSeek: boolean;
  activeWordIndex: number;
  offsetMs: number;
  onSeek: (time: number) => void;
}

const LANE_HEIGHT = 196;
const WAVE_TOP = 26;
const WAVE_HEIGHT = 70;

function shiftLine(doc: LyricsDoc, lineIndex: number, delta: number): LyricsDoc {
  const line = doc.lines[lineIndex];
  if (!line) return doc;
  const nextLine = doc.lines[lineIndex + 1];
  const first = line.words[0];
  const last = line.words[line.words.length - 1];
  if (!first || !last) return doc;

  let applied = delta;
  if (first.start + applied < 0.01) applied = 0.01 - first.start;
  if (nextLine && last.start + applied > nextLine.start - 0.05) {
    applied = nextLine.start - 0.05 - last.start;
  }
  if (!Number.isFinite(applied) || Math.abs(applied) < 0.0001) return doc;

  const ids = new Set(line.words.map((word) => word.id));
  const words = doc.words.map((word) =>
    ids.has(word.id) ? { ...word, start: Math.max(0, word.start + applied) } : word,
  );
  return normalizeDocEnds({ ...doc, words, edited: true });
}

function wavePath(
  peaks: Float32Array,
  audioDuration: number,
  pxPerSec: number,
  width: number,
) {
  if (peaks.length === 0) return "";
  const audioWidth = Math.min(width, Math.max(1, audioDuration * pxPerSec));
  const count = Math.min(900, peaks.length);
  const stride = Math.max(1, Math.floor(peaks.length / count));
  const center = WAVE_HEIGHT / 2;
  const amplitude = WAVE_HEIGHT / 2 - 4;
  const top: Array<[number, number]> = [];
  const bottom: Array<[number, number]> = [];

  for (let index = 0; index < peaks.length; index += stride) {
    const x = (index / peaks.length) * audioWidth;
    const value = Math.min(1, Math.abs(peaks[index])) * amplitude;
    top.push([x, center - value]);
    bottom.push([x, center + value]);
  }

  if (top.length === 0) return "";
  const points = [...top, ...bottom.reverse()];
  return `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)} ${points
    .slice(1)
    .map(([x, y]) => `L ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ")} Z`;
}

function StartEditor({
  word,
  onCommit,
}: {
  word: TimedWord;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(word.start.toFixed(3));

  useEffect(() => {
    setDraft(word.start.toFixed(3));
  }, [word.id, word.start]);

  const commit = () => {
    const parsed = Number(draft);
    if (Number.isFinite(parsed)) {
      onCommit(parsed);
    } else {
      setDraft(word.start.toFixed(3));
    }
  };

  return (
    <input
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
      inputMode="decimal"
      className="h-8 w-full rounded border border-edge bg-black/50 px-2 font-mono text-[11px] text-bone outline-none focus:border-white/30"
      aria-label="Word start time in seconds"
    />
  );
}

export function TimingEditor({
  open,
  onClose,
  doc,
  style,
  selectedWordId,
  onSelectWord,
  onChangeDoc,
  currentTime,
  duration,
  audioDuration,
  peaks,
  canSeek,
  activeWordIndex,
  offsetMs,
  onSeek,
}: TimingEditorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const wordRefs = useRef(new Map<string, HTMLButtonElement>());
  const [pxPerSec, setPxPerSec] = useState(84);
  const [follow, setFollow] = useState(true);

  const timelineDuration = Math.max(4, duration || 0);
  const width = Math.max(320, timelineDuration * pxPerSec);

  const word = useMemo(
    () => doc?.words.find((item) => item.id === selectedWordId) ?? null,
    [doc, selectedWordId],
  );
  const wordIndex = doc && word ? doc.words.findIndex((item) => item.id === word.id) : -1;
  const line = doc && word ? doc.lines[word.line] : null;
  const nextWord = doc && wordIndex >= 0 ? doc.words[wordIndex + 1] : null;
  const resolvedColor = word ? getWordColor(word, wordIndex, style) : style.colorA;

  useEffect(() => {
    if (!open || !follow) return;
    const element = scrollRef.current;
    if (!element) return;
    const x = currentTime * pxPerSec;
    const left = element.scrollLeft;
    const right = left + element.clientWidth;
    if (x < left + 36 || x > right - 72) {
      element.scrollLeft = Math.max(0, x - element.clientWidth * 0.32);
    }
  }, [open, follow, currentTime, pxPerSec]);

  useEffect(() => {
    if (!open || !selectedWordId) return;
    wordRefs.current.get(selectedWordId)?.scrollIntoView({ block: "nearest" });
  }, [open, selectedWordId]);

  useEffect(() => {
    if (!open || !word) return;
    const element = scrollRef.current;
    if (!element) return;
    const x = word.start * pxPerSec;
    const left = element.scrollLeft;
    const right = left + element.clientWidth;
    if (x < left + 24 || x > right - 48) {
      element.scrollLeft = Math.max(0, x - element.clientWidth * 0.4);
    }
  }, [open, selectedWordId, pxPerSec, word]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (!word || !doc) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const step = (event.shiftKey ? 0.01 : 0.05) * (event.key === "ArrowLeft" ? -1 : 1);
        onChangeDoc(updateWordStart(doc, word.id, word.start + step));
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, word, doc, onClose, onChangeDoc]);

  if (!open) return null;

  const seekToAudio = (lyricTime: number) => {
    if (!canSeek) return;
    onSeek(Math.max(0, lyricTime - offsetMs / 1000));
  };

  const selectWord = (item: TimedWord, seek = true) => {
    onSelectWord(item);
    if (seek) seekToAudio(item.start);
  };

  const seekFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!canSeek) return;
    const element = innerRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    seekToAudio((x / Math.max(1, rect.width)) * timelineDuration);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!canSeek) return;
    if ((event.target as HTMLElement).closest("[data-marker]")) return;
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setFollow(true);
    seekFromPointer(event);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    seekFromPointer(event);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const tickStep = pxPerSec >= 150 ? 1 : pxPerSec >= 60 ? 2 : pxPerSec >= 28 ? 5 : 10;
  const ticks: number[] = [];
  for (let tick = 0; tick <= timelineDuration + 0.001; tick += tickStep) {
    ticks.push(tick);
    if (ticks.length > 800) break;
  }

  const zoom = (direction: 1 | -1) => {
    setPxPerSec((value) => Math.min(220, Math.max(8, Math.round(value * (direction > 0 ? 1.35 : 0.74)))));
  };

  const fit = () => {
    const element = scrollRef.current;
    if (!element || timelineDuration <= 0) return;
    const next = element.clientWidth / timelineDuration;
    setPxPerSec(Math.min(220, Math.max(8, next)));
    element.scrollLeft = 0;
    setFollow(true);
  };

  const seekToPlayhead = () => {
    if (!canSeek || !word) return;
    seekToAudio(word.start);
  };

  const stampStart = () => {
    if (!doc || !word) return;
    onChangeDoc(updateWordStart(doc, word.id, currentTime));
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close timing editor"
        className="fixed inset-0 z-30 bg-black/35 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <section className="sheet-up fixed inset-x-0 bottom-0 z-40 flex h-[92dvh] flex-col border-t border-edge bg-panel shadow-[0_-40px_100px_rgba(0,0,0,0.7)] lg:h-[min(62vh,620px)] lg:min-h-[420px]">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-edge/80 px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded border border-blood/25 bg-blood/[0.08] text-blood">
              <Scissors className="size-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-bone">
                  Timing editor
                </h2>
                <Badge tone={doc?.wordLevel ? "green" : "amber"}>
                  {doc?.wordLevel ? "Word level" : "Estimated"}
                </Badge>
              </div>
              <div className="truncate font-mono text-[9px] uppercase tracking-[0.1em] text-dim">
                {doc ? `${doc.title || "Untitled"} · ${doc.words.length} words` : "No lyrics loaded"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden font-mono text-[10px] tabular-nums text-muted sm:inline">
              {formatTime(currentTime, true)}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded border border-edge text-muted transition-colors hover:border-white/25 hover:text-bone"
              aria-label="Close timing editor"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[220px_minmax(0,1fr)_250px]">
          <aside className="hidden min-h-0 flex-col border-r border-edge/70 lg:flex">
            <div className="flex h-10 shrink-0 items-center justify-between border-b border-edge/60 px-3">
              <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-dim">
                Lines
              </span>
              <span className="font-mono text-[9px] text-dim">{doc?.lines.length ?? 0}</span>
            </div>
            <div className="panel-scroll min-h-0 flex-1 overflow-y-auto p-1.5">
              {doc?.lines.map((item) => (
                <div key={item.index} className="mb-1 rounded px-1.5 py-1 hover:bg-white/[0.025]">
                  <button
                    type="button"
                    onClick={() => {
                      const first = item.words[0];
                      if (first) selectWord(first);
                    }}
                    className="mb-1 flex w-full items-center gap-2 text-left"
                  >
                    <span className="font-mono text-[8px] tabular-nums text-dim/70">
                      {formatTimeShort(item.start)}
                    </span>
                    <span className="font-mono text-[8px] uppercase tracking-wider text-dim/50">
                      L{item.index + 1}
                    </span>
                  </button>
                  <div className="flex flex-wrap gap-x-1 gap-y-0.5">
                    {item.words.map((itemWord) => {
                      const absolute = doc.words.findIndex((candidate) => candidate.id === itemWord.id);
                      return (
                        <button
                          key={itemWord.id}
                          type="button"
                          ref={(node) => {
                            if (node) wordRefs.current.set(itemWord.id, node);
                            else wordRefs.current.delete(itemWord.id);
                          }}
                          onClick={() => selectWord(itemWord)}
                          className={cn(
                            "rounded px-0.5 text-[11px] leading-relaxed transition-colors",
                            itemWord.id === selectedWordId
                              ? "bg-bone text-black"
                              : absolute === activeWordIndex
                                ? "text-blood"
                                : "text-muted hover:text-bone",
                          )}
                        >
                          {itemWord.text}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="flex h-10 shrink-0 items-center justify-between border-b border-edge/60 px-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => zoom(-1)}
                  className="flex size-6 items-center justify-center rounded text-muted hover:bg-white/5 hover:text-bone"
                  aria-label="Zoom out"
                >
                  <Minus className="size-3" />
                </button>
                <span className="w-9 text-center font-mono text-[9px] text-dim">
                  {Math.round(pxPerSec)}px
                </span>
                <button
                  type="button"
                  onClick={() => zoom(1)}
                  className="flex size-6 items-center justify-center rounded text-muted hover:bg-white/5 hover:text-bone"
                  aria-label="Zoom in"
                >
                  <Plus className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={fit}
                  className="ml-1 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-dim hover:bg-white/5 hover:text-bone"
                >
                  Fit
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                {!canSeek ? (
                  <span className="hidden font-mono text-[8px] uppercase tracking-[0.1em] text-dim sm:inline">
                    Playhead follows live clock
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => setFollow((value) => !value)}
                  className={cn(
                    "flex items-center gap-1 rounded px-1.5 py-1 font-mono text-[9px] uppercase tracking-wider transition-colors",
                    follow ? "bg-blood/10 text-blood" : "text-dim hover:bg-white/5 hover:text-bone",
                  )}
                  title="Keep the playhead in view"
                >
                  <Crosshair className="size-2.5" />
                  Follow
                </button>
              </div>
            </div>

            <div
              ref={scrollRef}
              className="panel-scroll relative min-h-0 flex-1 overflow-x-auto overflow-y-hidden bg-[#080809]"
              onWheel={() => setFollow(false)}
            >
              <div
                ref={innerRef}
                className={cn(
                  "relative h-full select-none",
                  canSeek ? "cursor-crosshair" : "cursor-default",
                )}
                style={{ width: `${width}px`, minHeight: LANE_HEIGHT }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                {ticks.map((tick) => (
                  <div
                    key={tick}
                    className="absolute top-0 h-[26px] border-l border-white/[0.08]"
                    style={{ left: tick * pxPerSec }}
                  >
                    <span className="absolute left-1 top-1 font-mono text-[8px] tabular-nums text-dim/70">
                      {formatTimeShort(tick)}
                    </span>
                  </div>
                ))}

                <div
                  className="absolute inset-x-0"
                  style={{ top: WAVE_TOP, height: WAVE_HEIGHT }}
                >
                  <div className="absolute inset-0 border-y border-white/[0.05] bg-white/[0.012]" />
                  {peaks && audioDuration > 0 ? (
                    <svg
                      className="absolute inset-0 h-full w-full text-bone/30"
                      viewBox={`0 0 ${width} ${WAVE_HEIGHT}`}
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      <path
                        d={wavePath(peaks, audioDuration, pxPerSec, width)}
                        fill="currentColor"
                        opacity="0.45"
                      />
                    </svg>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center font-mono text-[8px] uppercase tracking-[0.16em] text-dim/50">
                      {canSeek ? "Waveform unavailable" : "No audio · live timing"}
                    </div>
                  )}
                  <div
                    className="absolute inset-y-0 left-0 bg-blood/[0.07]"
                    style={{ width: `${(Math.min(currentTime, timelineDuration) / timelineDuration) * 100}%` }}
                  />
                  <div
                    className="absolute inset-y-0 w-px bg-blood/45"
                    style={{ left: `${(Math.min(currentTime, timelineDuration) / timelineDuration) * 100}%` }}
                  />
                </div>

                <div className="absolute inset-x-0" style={{ top: WAVE_TOP + WAVE_HEIGHT + 3, height: 58 }}>
                  {doc?.lines.map((item) => (
                    <div
                      key={item.index}
                      className="absolute h-1.5 rounded-sm bg-white/[0.09]"
                      style={{
                        left: item.start * pxPerSec,
                        width: Math.max(2, (item.end - item.start) * pxPerSec),
                      }}
                    >
                      <span className="absolute -top-3.5 left-0 font-mono text-[7px] uppercase tracking-wider text-dim/60">
                        {item.index + 1}
                      </span>
                    </div>
                  ))}

                  {doc?.words.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      data-marker
                      title={`${item.text} · ${formatTime(item.start, true)}`}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        selectWord(item);
                      }}
                      className={cn(
                        "marker-dot absolute w-[3px] rounded-full transition-all",
                        item.id === selectedWordId
                          ? "z-20 h-9 bg-bone"
                          : index === activeWordIndex
                            ? "z-10 h-7 bg-blood"
                            : "h-4 bg-white/25 hover:h-6 hover:bg-white/60",
                      )}
                      style={{ left: item.start * pxPerSec, top: 18 }}
                    />
                  ))}
                </div>

                <div
                  className="pointer-events-none absolute inset-y-0 z-20 w-px bg-blood"
                  style={{ left: currentTime * pxPerSec }}
                >
                  <div className="absolute -left-[3px] top-0 size-[7px] rounded-b-sm bg-blood" />
                </div>
              </div>
            </div>

            <div className="flex h-8 shrink-0 items-center justify-between border-t border-edge/50 px-3 font-mono text-[8px] uppercase tracking-[0.1em] text-dim/70">
              <span>Click a marker to edit</span>
              <span className="hidden sm:inline">
                {canSeek ? "Drag anywhere to scrub" : "Live playhead · timing edits stamp instantly"}
              </span>
            </div>
          </div>

          <aside className="panel-scroll max-h-[42%] shrink-0 overflow-y-auto border-t border-edge/70 bg-white/[0.012] lg:max-h-none lg:border-l lg:border-t-0">
            {doc && word ? (
              <div className="p-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-dim">
                    Word {wordIndex + 1} / {doc.words.length} · L{word.line + 1}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        const previous = doc.words[wordIndex - 1];
                        if (previous) selectWord(previous);
                      }}
                      disabled={wordIndex <= 0}
                      className="flex size-6 items-center justify-center rounded text-muted hover:bg-white/5 hover:text-bone disabled:opacity-30"
                      aria-label="Previous word"
                    >
                      <ChevronLeft className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = doc.words[wordIndex + 1];
                        if (next) selectWord(next);
                      }}
                      disabled={wordIndex >= doc.words.length - 1}
                      className="flex size-6 items-center justify-center rounded text-muted hover:bg-white/5 hover:text-bone disabled:opacity-30"
                      aria-label="Next word"
                    >
                      <ChevronRight className="size-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="break-words text-[18px] font-bold leading-tight text-bone">
                      {word.text}
                    </div>
                    <div className="mt-0.5 truncate text-[10px] text-dim">
                      {line?.words.map((item) => item.text).join(" ")}
                    </div>
                  </div>
                  <div
                    className="mt-1 size-5 shrink-0 rounded-sm border border-white/20"
                    style={{ backgroundColor: resolvedColor }}
                  />
                </div>

                <div className="mb-2 grid grid-cols-[1fr_auto] gap-1.5">
                  <div>
                    <div className="mb-1 text-[9px] uppercase tracking-[0.12em] text-dim">Start (s)</div>
                    <StartEditor
                      word={word}
                      onCommit={(value) => onChangeDoc(updateWordStart(doc, word.id, value))}
                    />
                  </div>
                  <div className="w-[72px]">
                    <div className="mb-1 text-[9px] uppercase tracking-[0.12em] text-dim">Ends</div>
                    <div className="flex h-8 items-center rounded border border-edge/60 bg-white/[0.02] px-2 font-mono text-[10px] text-muted">
                      {formatTime(word.end, true)}
                    </div>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  className="mb-2 w-full"
                  onClick={stampStart}
                  icon={<Crosshair className="size-3.5" />}
                >
                  Stamp start at {formatTime(currentTime, true)}
                </Button>

                <div className="mb-3 grid grid-cols-4 gap-1">
                  {[-0.1, -0.01, 0.01, 0.1].map((delta) => (
                    <button
                      key={delta}
                      type="button"
                      onClick={() => onChangeDoc(updateWordStart(doc, word.id, word.start + delta))}
                      className="h-7 rounded border border-edge bg-black/25 font-mono text-[9px] text-muted transition-colors hover:border-white/20 hover:text-bone"
                    >
                      {delta > 0 ? "+" : ""}
                      {delta.toFixed(2)}
                    </button>
                  ))}
                </div>

                <div className="mb-3">
                  <div className="mb-1.5 text-[9px] uppercase tracking-[0.12em] text-dim">Word colour</div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={resolvedColor}
                      onChange={(event) =>
                        onChangeDoc(updateWordColor(doc, word.id, event.target.value))
                      }
                      className="size-7"
                      aria-label="Word colour"
                    />
                    <button
                      type="button"
                      onClick={() => onChangeDoc(updateWordColor(doc, word.id, undefined))}
                      disabled={!word.color}
                      className="flex h-7 flex-1 items-center justify-center gap-1 rounded border border-edge bg-black/25 text-[9px] text-muted transition-colors hover:border-white/20 hover:text-bone disabled:opacity-35"
                    >
                      <RotateCcw className="size-2.5" />
                      Theme default
                    </button>
                  </div>
                </div>

                <div className="space-y-1 border-t border-edge/60 pt-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full justify-start text-[10px]"
                    onClick={() => onChangeDoc(redistributeLine(doc, word.line))}
                    icon={<Spline className="size-3" />}
                  >
                    Redistribute this line
                  </Button>
                  <div className="grid grid-cols-2 gap-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-[10px]"
                      onClick={() => onChangeDoc(shiftLine(doc, word.line, -0.1))}
                    >
                      Line −0.1s
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-[10px]"
                      onClick={() => onChangeDoc(shiftLine(doc, word.line, 0.1))}
                    >
                      Line +0.1s
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-[10px]"
                    onClick={seekToPlayhead}
                    disabled={!canSeek}
                    icon={<Crosshair className="size-3" />}
                  >
                    Seek to this word
                  </Button>
                </div>

                <div className="mt-3 border-t border-edge/60 pt-2 font-mono text-[8px] leading-relaxed text-dim/70">
                  Ends at the next word. Winners are written by start time. Edits mark the document
                  as manually timed.
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <Type className="mb-2 size-4 text-dim" />
                <div className="text-[11px] font-medium text-muted">No word selected</div>
                <p className="mt-1 max-w-[180px] text-[10px] leading-relaxed text-dim">
                  Pick a marker on the timeline or a word in the lyrics list to edit its timing.
                </p>
              </div>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}
