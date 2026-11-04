import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import {
  AudioLines,
  Clock3,
  Loader2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Radio,
  Search,
  Upload,
} from "lucide-react";
import type { BridgeStatus } from "../hooks/useNowPlaying";
import {
  appLabel,
  isPlaying,
  type MediaSession,
} from "../lib/nowPlaying";
import { formatTime, formatTimeShort } from "../lib/timing";
import type { LyricsDoc, StyleSettings } from "../lib/types";
import { canvasFormatInfo, canvasFormatLabel } from "../lib/render/formats";
import { Visualizer } from "../lib/render/Visualizer";
import { Button, cn, Spinner } from "./ui";

type SourceMode = "live" | "file";

interface StageProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  doc: LyricsDoc | null;
  style: StyleSettings;
  fontsReady: boolean;
  getTime: () => number;
  currentTime: number;
  duration: number;
  playing: boolean;
  mode: SourceMode;
  session: MediaSession | null;
  bridgeStatus: BridgeStatus;
  hasAudio: boolean;
  fetchingLyrics: boolean;
  audioLoading: boolean;
  onOpenSource: () => void;
  onOpenSearch: () => void;
  onOpenTiming: () => void;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
}

export function Stage({
  canvasRef,
  doc,
  style,
  fontsReady,
  getTime,
  currentTime,
  duration,
  playing,
  mode,
  session,
  bridgeStatus,
  hasAudio,
  fetchingLyrics,
  audioLoading,
  onOpenSource,
  onOpenSearch,
  onOpenTiming,
  onTogglePlay,
  onSeek,
}: StageProps) {
  const stageRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const visualizerRef = useRef<Visualizer | null>(null);
  const getTimeRef = useRef(getTime);
  const docRef = useRef(doc);
  const styleRef = useRef(style);
  const [fullscreen, setFullscreen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  getTimeRef.current = getTime;
  docRef.current = doc;
  styleRef.current = style;

  const format = canvasFormatInfo(style.canvasFormat);

  useEffect(() => {
    if (!fontsReady) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const visualizer = new Visualizer(canvas, format.value);
    visualizerRef.current = visualizer;
    let frame = 0;

    const loop = () => {
      visualizer.render(getTimeRef.current(), docRef.current, styleRef.current);
      frame = requestAnimationFrame(loop);
    };

    visualizer.render(getTimeRef.current(), docRef.current, styleRef.current);
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      visualizerRef.current = null;
    };
  }, [fontsReady, canvasRef, format.value]);

  useLayoutEffect(() => {
    const element = viewportRef.current;
    if (!element) return;

    const measure = () => {
      const rect = element.getBoundingClientRect();
      setViewport({ width: rect.width, height: rect.height });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    visualizerRef.current?.clearCaches();
  }, [doc]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "f" || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName) || target.isContentEditable)
      ) {
        return;
      }
      if (document.querySelector('[role="dialog"]')) return;
      event.preventDefault();
      if (document.fullscreenElement) {
        void document.exitFullscreen();
      } else {
        void stageRef.current?.requestFullscreen().catch(() => undefined);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await stageRef.current?.requestFullscreen();
      }
    } catch {
      setFullscreen(false);
    }
  };

  const live = mode === "live";
  const sessionPlaying = isPlaying(session);
  const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
  const docProgress =
    doc && doc.words.length > 0
      ? Math.min(
          1,
          Math.max(
            0,
            (currentTime - doc.words[0].start) /
              Math.max(
                1,
                (doc.words[doc.words.length - 1]?.end ?? 1) - doc.words[0].start,
              ),
          ),
        )
      : 0;

  const showEmpty = !doc;
  const statusLabel = fontsReady ? null : "Preparing type";

  const inset = fullscreen ? 0 : 28;
  const availableWidth = Math.max(0, viewport.width - inset);
  const availableHeight = Math.max(0, viewport.height - inset);
  const scale =
    availableWidth > 0 && availableHeight > 0
      ? Math.min(availableWidth / format.width, availableHeight / format.height)
      : 0;
  const frameWidth = scale > 0 ? Math.max(1, Math.floor(format.width * scale)) : 0;
  const frameHeight = scale > 0 ? Math.max(1, Math.floor(format.height * scale)) : 0;
  const chromeWidth = frameWidth > 0 ? Math.min(Math.max(frameWidth, 360), 980) : 760;

  return (
    <section
      ref={stageRef}
      className="stage relative flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-3 lg:py-4"
    >
      <div
        className="stage-meta mb-2.5 flex w-full items-center justify-between px-0.5"
        style={{ width: chromeWidth }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em]",
              live
                ? "border-blood/30 bg-blood/[0.08] text-blood"
                : "border-edge bg-white/[0.03] text-muted",
            )}
          >
            {live ? (
              <span
                className={cn(
                  "size-1 rounded-full",
                  sessionPlaying ? "live-pulse bg-blood" : "bg-amber-400",
                )}
              />
            ) : (
              <AudioLines className="size-2.5" />
            )}
            {live ? (sessionPlaying ? "Live" : session ? "Paused" : "Live") : "File preview"}
          </span>
          <span className="truncate font-mono text-[9px] uppercase tracking-[0.1em] text-dim">
            {live
              ? session
                ? `${appLabel(session.appId)} · ${session.title}`
                : bridgeStatus === "online"
                  ? "Waiting for Windows media"
                  : "Windows bridge"
              : hasAudio
                ? "Uploaded audio"
                : "No audio loaded"}
          </span>
        </div>
        <span className="flex shrink-0 items-center gap-2 font-mono text-[9px] tracking-[0.1em] text-dim">
          <span className="uppercase">{style.lyricsMode}</span>
          <span className="size-0.5 rounded-full bg-dim/60" />
          <span className="hidden sm:inline">{canvasFormatLabel(style.canvasFormat)}</span>
        </span>
      </div>

      <div ref={viewportRef} className="stage-viewport w-full min-h-0">
        <div
          className="preview-frame relative shrink-0"
          style={{
            width: frameWidth || undefined,
            height: frameHeight || undefined,
            aspectRatio: frameWidth ? undefined : format.aspect,
          }}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        >
          <div
            className="preview-glow pointer-events-none absolute -inset-6 rounded-[24px] blur-2xl"
            style={{
              background: `radial-gradient(closest-side, ${style.colorA}26, transparent 72%)`,
            }}
          />
          <div className="canvas-shell relative size-full overflow-hidden rounded-[3px] border border-white/[0.14] bg-black shadow-[0_30px_100px_rgba(0,0,0,0.85),0_0_0_1px_rgba(0,0,0,0.6)]">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 size-full"
              role="img"
              aria-label="Lyric visualiser preview"
            />

          {statusLabel ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
              <Spinner className="size-5 text-blood" />
              <div className="mt-3 text-[11px] font-medium text-muted">{statusLabel}</div>
            </div>
          ) : null}

          {fontsReady && showEmpty ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(10,10,10,0.55),rgba(0,0,0,0.92))] px-7 text-center">
              {fetchingLyrics ? (
                <>
                  <Loader2 className="size-5 animate-spin text-blood" />
                  <div className="mt-4 text-[13px] font-semibold text-bone">Finding lyrics</div>
                  <p className="mt-1 max-w-[240px] truncate text-[11px] text-muted">
                    {session?.title ?? "Searching LRCLIB…"}
                  </p>
                  <div className="mt-3 font-mono text-[9px] uppercase tracking-[0.16em] text-dim">
                    Matching synced lines
                  </div>
                </>
              ) : live && !session ? (
                <>
                  <Radio className="size-5 text-dim" />
                  <div className="mt-4 text-[13px] font-semibold text-bone">Waiting for a song</div>
                  <p className="mt-1.5 max-w-[250px] text-[11px] leading-relaxed text-muted">
                    Press play in Spotify, a browser, or any Windows media app. RAAKH listens to
                    the system media session.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-4"
                    onClick={onOpenSource}
                  >
                    Open source setup
                  </Button>
                </>
              ) : live && session ? (
                <>
                  <AudioLines className="size-5 text-blood/80" />
                  <div className="mt-4 text-[13px] font-semibold text-bone">No lyrics yet</div>
                  <p className="mt-1.5 max-w-[250px] text-[11px] leading-relaxed text-muted">
                    {`${session.title} is playing. Search LRCLIB for its synced lyrics.`}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={onOpenSearch}
                      icon={<Search className="size-3.5" />}
                    >
                      Find lyrics
                    </Button>
                    <Button variant="secondary" size="sm" onClick={onOpenSource}>
                      Source
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Upload className="size-5 text-dim" />
                  <div className="mt-4 text-[13px] font-semibold text-bone">
                    {hasAudio ? "Add lyrics to picture the song" : "Load a song or find lyrics"}
                  </div>
                  <p className="mt-1.5 max-w-[250px] text-[11px] leading-relaxed text-muted">
                    {hasAudio
                      ? "Search LRCLIB or paste an LRC to begin the visual."
                      : "Live detection needs no file. Upload audio when you want sound and an exported video."}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={onOpenSearch}
                      icon={<Search className="size-3.5" />}
                    >
                      Find lyrics
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={onOpenSource}
                      icon={<Upload className="size-3.5" />}
                    >
                      Audio
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {fontsReady && doc ? (
            <div
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between px-3 pb-2.5 pt-8 font-mono text-[8px] uppercase tracking-[0.14em] text-white/30 transition-opacity duration-300",
                hovering || !live ? "opacity-100" : "opacity-0",
              )}
            >
              <span>{live ? "Live clock" : "Local preview"}</span>
              <span className="truncate pl-4 text-white/20">
                {doc.title || doc.sourceLabel}
              </span>
            </div>
          ) : null}
          </div>
        </div>
      </div>

      <div
        className="stage-foot mt-3 w-full shrink-0"
        style={{ width: chromeWidth }}
      >
        {live ? (
          <div className="mb-2">
            <div className="h-[2px] overflow-hidden rounded-full bg-white/[0.09]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blood/60 to-blood transition-[width] duration-500"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between font-mono text-[9px] tabular-nums text-dim">
              <span>{session ? formatTimeShort(currentTime) : "--:--"}</span>
              <span>{session?.duration ? formatTimeShort(session.duration) : "--:--"}</span>
            </div>
          </div>
        ) : (
          <div className="mb-2">
            <input
              type="range"
              min={0}
              max={Math.max(0.1, duration)}
              step={0.05}
              value={Math.min(currentTime, duration || 0)}
              onChange={(event) => onSeek(Number(event.target.value))}
              disabled={!hasAudio}
              className="raakh-range w-full disabled:opacity-30"
              style={{ "--range-progress": `${progress * 100}%` } as CSSProperties}
              aria-label="Preview position"
            />
            <div className="mt-1 flex items-center justify-between font-mono text-[9px] tabular-nums text-dim">
              <span>{formatTime(currentTime)}</span>
              <span>{hasAudio ? formatTime(duration) : "--:--"}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {live ? (
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border",
                    sessionPlaying
                      ? "border-blood/30 bg-blood/10 text-blood"
                      : "border-edge bg-white/[0.03] text-muted",
                  )}
                >
                  {bridgeStatus === "checking" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : sessionPlaying ? (
                    <span className="size-2 rounded-[1px] bg-blood" />
                  ) : (
                    <Pause className="size-3.5" />
                  )}
                </div>
                <div className="hidden min-w-0 sm:block">
                  <div className="truncate text-[10px] font-medium text-bone/80">
                    {session ? session.title : "No Windows session"}
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-dim">
                    {session
                      ? sessionPlaying
                        ? "Following system clock"
                        : "Playback paused"
                      : "Bridge listening"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onTogglePlay}
                  disabled={!hasAudio}
                  className="flex size-9 items-center justify-center rounded-full bg-bone text-black transition-transform hover:scale-105 disabled:opacity-25"
                  aria-label={playing ? "Pause" : "Play"}
                >
                  {playing ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
                </button>
                {!hasAudio ? (
                  <button
                    type="button"
                    onClick={onOpenSource}
                    className="flex items-center gap-1.5 text-[10px] text-dim transition-colors hover:text-bone"
                  >
                    <Upload className="size-3" />
                    Add audio for sound
                  </button>
                ) : (
                  <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-dim">
                    {audioLoading ? "Analysing waveform" : "Synced to audio"}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {doc ? (
              <div className="mr-1 hidden items-center gap-2 font-mono text-[9px] text-dim md:flex">
                <span>{Math.round(docProgress * 100)}%</span>
                <span className="h-2.5 w-px bg-edge" />
                <span>{doc.lines.length} lines</span>
              </div>
            ) : null}
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenTiming}
              disabled={!doc}
              icon={<Clock3 className="size-3.5" />}
            >
              Timing
            </Button>
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              className="flex size-8 items-center justify-center rounded-md border border-edge text-muted transition-colors hover:border-white/25 hover:text-bone"
              aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen preview"}
              title={fullscreen ? "Exit fullscreen" : "Fullscreen preview"}
            >
              {fullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </button>
          </div>
        </div>

        <div className="mt-2.5 hidden items-center justify-center gap-3 font-mono text-[8px] uppercase tracking-[0.14em] text-dim/70 lg:flex">
          <span>Space play</span>
          <span className="size-0.5 rounded-full bg-dim/50" />
          <span>T timing</span>
          <span className="size-0.5 rounded-full bg-dim/50" />
          <span>F fullscreen</span>
          <span className="size-0.5 rounded-full bg-dim/50" />
          <span>⌘K search</span>
        </div>
      </div>
    </section>
  );
}
