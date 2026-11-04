import { useEffect, useMemo, useRef, useState } from "react";
import {
  Clock3,
  FileText,
  ListMusic,
  Search,
  Trash2,
  Wand2,
} from "lucide-react";
import type { LyricsDoc } from "../lib/types";
import { formatTimeShort } from "../lib/timing";
import {
  Badge,
  Button,
  cn,
  Dialog,
  SectionLabel,
  Slider,
} from "./ui";

interface LyricsPanelProps {
  doc: LyricsDoc | null;
  activeLineIndex: number;
  activeWordIndex: number;
  offsetMs: number;
  onOffsetChange: (offsetMs: number) => void;
  onOpenSearch: () => void;
  onOpenTiming: (lineIndex?: number) => void;
  onImportText: (text: string) => void;
  onClear: () => void;
  fetching: boolean;
}

export function LyricsPanel({
  doc,
  activeLineIndex,
  activeWordIndex,
  offsetMs,
  onOffsetChange,
  onOpenSearch,
  onOpenTiming,
  onImportText,
  onClear,
  fetching,
}: LyricsPanelProps) {
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const lineRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const lastActiveRef = useRef(-1);

  const activeWord = doc && activeWordIndex >= 0 ? doc.words[activeWordIndex] : null;

  const stats = useMemo(() => {
    if (!doc) return null;
    const timed = doc.words.filter((word) => word.start > 0).length;
    return {
      lines: doc.lines.length,
      words: doc.words.length,
      timed,
    };
  }, [doc]);

  useEffect(() => {
    if (!doc || activeLineIndex < 0) return;
    if (activeLineIndex === lastActiveRef.current) return;
    lastActiveRef.current = activeLineIndex;
    const node = lineRefs.current[activeLineIndex];
    node?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeLineIndex, doc]);

  const importText = () => {
    const value = pasteText.trim();
    if (!value) return;
    onImportText(value);
    setPasteText("");
    setPasteOpen(false);
  };

  const hasTimeTags = /\[\d{1,3}:\d{1,2}/.test(pasteText);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionLabel>
          Lyrics
          {doc ? (
            <span className="ml-2 font-mono text-[9px] font-normal tracking-normal text-dim">
              {doc.sourceLabel}
            </span>
          ) : null}
        </SectionLabel>
        <div className="mb-3 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPasteOpen(true)}
            className="rounded px-1.5 py-1 text-[10px] text-dim transition-colors hover:bg-white/5 hover:text-bone"
            title="Paste lyrics"
          >
            Paste
          </button>
          {doc ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Remove the current lyrics document?")) onClear();
              }}
              className="rounded px-1.5 py-1 text-[10px] text-dim transition-colors hover:bg-blood/10 hover:text-blood"
              title="Clear lyrics"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {!doc ? (
        <div className="rounded-md border border-dashed border-edge bg-white/[0.015] px-4 py-7 text-center">
          <ListMusic className="mx-auto mb-2.5 size-5 text-dim" />
          <div className="text-[12px] font-medium text-muted">No lyrics loaded</div>
          <p className="mx-auto mt-1 max-w-[240px] text-[10px] leading-relaxed text-dim">
            Search LRCLIB for time-synced lyrics, or paste an LRC file.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenSearch}
              icon={<Search className="size-3.5" />}
            >
              Find lyrics
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setPasteOpen(true)}>
              Paste
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-md border border-edge bg-white/[0.02] p-3">
            <div className="truncate text-[12px] font-semibold text-bone">
              {doc.title || "Untitled"}
            </div>
            <div className="mt-0.5 truncate text-[10px] text-muted">
              {doc.artist || "Unknown artist"}
              {doc.album ? <span className="text-dim"> · {doc.album}</span> : null}
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {doc.wordLevel ? (
                <Badge tone="green">Word timed</Badge>
              ) : (
                <Badge tone="amber">{doc.approximate ? "Estimated timing" : "Line timed"}</Badge>
              )}
              <Badge>{stats?.lines ?? 0} lines</Badge>
              <Badge>{stats?.words ?? 0} words</Badge>
              {doc.edited ? <Badge tone="red">Edited</Badge> : null}
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => onOpenTiming()}
                icon={<Clock3 className="size-3.5" />}
              >
                Timing editor
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenSearch}
                disabled={fetching}
                icon={<Search className="size-3.5" />}
              >
                Replace
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-edge/80 bg-black/20 px-3 py-2.5">
            <Slider
              label="Sync offset"
              value={offsetMs}
              min={-3000}
              max={3000}
              step={50}
              onChange={onOffsetChange}
              formatValue={(value) => `${value > 0 ? "+" : ""}${(value / 1000).toFixed(2)}s`}
            />
            <div className="mt-1 text-[9px] leading-relaxed text-dim">
              Positive values bring lyrics forward. The live player clock is read from Windows.
            </div>
          </div>

          <div className="relative -mx-1">
            <div className="panel-scroll max-h-[min(46vh,440px)] overflow-y-auto px-1">
              <div className="space-y-1 pb-4">
                {doc.lines.map((line) => {
                  const active = line.index === activeLineIndex;
                  const hasWordCursor =
                    active && activeWord && activeWord.line === line.index;
                  return (
                    <button
                      key={line.index}
                      ref={(node) => {
                        lineRefs.current[line.index] = node;
                      }}
                      type="button"
                      onClick={() => onOpenTiming(line.index)}
                      className={cn(
                        "group flex w-full items-start gap-2.5 rounded px-2 py-1.5 text-left transition-colors",
                        active
                          ? "bg-blood/[0.09] shadow-[inset_2px_0_0_#ff2a30]"
                          : "hover:bg-white/[0.04]",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-[2px] w-8 shrink-0 text-right font-mono text-[9px] tabular-nums",
                          active ? "text-blood/80" : "text-dim/70",
                        )}
                      >
                        {formatTimeShort(line.start)}
                      </span>
                      <span
                        className={cn(
                          "min-w-0 flex-1 text-[12px] leading-relaxed",
                          active ? "text-bone" : "text-muted/80 group-hover:text-bone/90",
                        )}
                      >
                        {line.words.map((word, wordIndex) => {
                          const absoluteIndex = doc.words.indexOf(word);
                          const spoken =
                            hasWordCursor && activeWord && absoluteIndex <= activeWordIndex;
                          const current = activeWord && absoluteIndex === activeWordIndex;
                          return (
                            <span
                              key={word.id}
                              className={cn(
                                "transition-colors",
                                current
                                  ? "font-semibold text-blood"
                                  : spoken
                                    ? "text-bone"
                                    : undefined,
                              )}
                            >
                              {word.text}
                              {wordIndex < line.words.length - 1 ? " " : ""}
                            </span>
                          );
                        })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-ink to-transparent" />
          </div>

          <div className="flex items-start gap-2 rounded border border-edge/60 bg-white/[0.015] px-2.5 py-2">
            <FileText className="mt-0.5 size-3 shrink-0 text-dim" />
            <p className="text-[10px] leading-relaxed text-dim">
              Search results are line-timed. RAAKH distributes words inside each line; use the
              timing editor for exact word cuts.
            </p>
          </div>
        </>
      )}

      <Dialog
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        title="Paste lyrics"
        eyebrow="Import"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setPasteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={importText}
              disabled={!pasteText.trim()}
              icon={<Wand2 className="size-3.5" />}
            >
              {hasTimeTags ? "Import timed lyrics" : "Import as plain text"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-[11px] leading-relaxed text-muted">
            Paste an LRC file with <span className="font-mono text-bone/80">[mm:ss.xx]</span> stamps
            for accurate sync, or plain lyrics to estimate timings.
          </p>
          <textarea
            value={pasteText}
            onChange={(event) => setPasteText(event.target.value)}
            placeholder={"[00:12.40]First line of the song\n[00:16.20]Second line…"}
            spellCheck={false}
            className="panel-scroll h-56 w-full resize-none rounded-md border border-edge bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-bone outline-none transition-colors placeholder:text-dim/60 focus:border-white/25"
          />
          <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-dim">
            {hasTimeTags ? "Time tags detected" : "No time tags · timings will be estimated"}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
