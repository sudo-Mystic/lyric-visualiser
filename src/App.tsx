import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { ExportDialog } from "./components/ExportDialog";
import { Header } from "./components/Header";
import { LookPanel } from "./components/LookPanel";
import { LyricsPanel } from "./components/LyricsPanel";
import { LyricsSearchDialog } from "./components/LyricsSearchDialog";
import { PanelTabs, Sidebar } from "./components/Sidebar";
import { SourcePanel } from "./components/SourcePanel";
import { Stage } from "./components/Stage";
import { ToastStack, type ToastMessage, type ToastTone } from "./components/Toast";
import { TimingEditor } from "./components/TimingEditor";
import { Button } from "./components/ui";
import { useAudioPlayer } from "./hooks/useAudioPlayer";
import { useFontsReady } from "./hooks/useFonts";
import { useNowPlaying } from "./hooks/useNowPlaying";
import type { PanelTab } from "./lib/appTypes";
import { parseLrc, parsePlainLyrics } from "./lib/lrc";
import {
  chooseBestResult,
  guessTrackFromFilename,
  resultToDoc,
  searchLyricsSmart,
  type LyricsQuery,
} from "./lib/lyrics";
import { sessionKey } from "./lib/nowPlaying";
import { themePreset } from "./lib/render/themes";
import { getActiveWordIndex } from "./lib/timing";
import { REFERENCE_STYLE, type LyricsDoc, type StyleSettings } from "./lib/types";

type SourceMode = "live" | "file";

const STYLE_KEY = "raakh.style.v1";
const AUTO_KEY = "raakh.autofetch.v1";

function loadStyle(): StyleSettings {
  try {
    const raw = localStorage.getItem(STYLE_KEY);
    const stored = raw ? (JSON.parse(raw) as Partial<StyleSettings>) : {};
    const preset = themePreset(stored.theme ?? REFERENCE_STYLE.theme);
    return {
      ...REFERENCE_STYLE,
      ...preset,
      offsetMs: stored.offsetMs ?? REFERENCE_STYLE.offsetMs,
    };
  } catch {
    return REFERENCE_STYLE;
  }
}

function loadAutoFetch() {
  try {
    return localStorage.getItem(AUTO_KEY) !== "0";
  } catch {
    return true;
  }
}

function titleFromFile(fileName: string | null) {
  return fileName ? guessTrackFromFilename(fileName).title : "";
}

function artistFromFile(fileName: string | null) {
  return fileName ? guessTrackFromFilename(fileName).artist ?? "" : "";
}

export default function App() {
  const fontsReady = useFontsReady();
  const now = useNowPlaying();
  const audio = useAudioPlayer();

  const [style, setStyle] = useState<StyleSettings>(loadStyle);
  const [tab, setTab] = useState<PanelTab>("source");
  const [mode, setMode] = useState<SourceMode>("live");
  const [doc, setDoc] = useState<LyricsDoc | null>(null);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [autoFetch, setAutoFetch] = useState(loadAutoFetch);
  const [autoRetry, setAutoRetry] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [timingOpen, setTimingOpen] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [fetchingLyrics, setFetchingLyrics] = useState(false);
  const [displayTime, setDisplayTime] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const autoKeyRef = useRef("");
  const requestIdRef = useRef(0);
  const toastIdRef = useRef(0);

  const activeSession = now.activeSession;
  const offsetSec = style.offsetMs / 1000;

  const addToast = useCallback((text: string, tone: ToastTone = "info") => {
    const id = (toastIdRef.current += 1);
    setToasts((current) => [...current.slice(-2), { id, text, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 5400);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const readBaseTime = useCallback(() => {
    if (mode === "live") return Math.max(0, now.getLiveTime());
    return Math.max(0, audio.audioRef.current?.currentTime ?? 0);
  }, [mode, now.getLiveTime, audio.audioRef]);

  const getVisualTime = useCallback(
    () => Math.max(0, readBaseTime() + style.offsetMs / 1000),
    [readBaseTime, style.offsetMs],
  );

  useEffect(() => {
    const tick = () => setDisplayTime(readBaseTime());
    tick();
    const timer = window.setInterval(tick, 100);
    return () => window.clearInterval(timer);
  }, [readBaseTime]);

  useEffect(() => {
    try {
      localStorage.setItem(STYLE_KEY, JSON.stringify(style));
    } catch {
      // Persistence is optional.
    }
  }, [style]);

  useEffect(() => {
    try {
      localStorage.setItem(AUTO_KEY, autoFetch ? "1" : "0");
    } catch {
      // Persistence is optional.
    }
  }, [autoFetch]);

  const visualTime = Math.max(0, displayTime + offsetSec);
  const activeWordIndex = useMemo(
    () => getActiveWordIndex(doc?.words ?? [], visualTime),
    [doc, visualTime],
  );
  const activeLineIndex =
    doc && activeWordIndex >= 0 ? (doc.words[activeWordIndex]?.line ?? -1) : -1;

  const sessionDuration = activeSession?.duration ?? 0;
  const stageDuration =
    mode === "live"
      ? sessionDuration || audio.duration
      : audio.duration || sessionDuration || doc?.duration || 0;

  const fileKey = audio.fileName ? `file:${audio.fileName}` : "";
  const liveKey = activeSession ? sessionKey(activeSession) : "";
  const trackKey = mode === "live" ? liveKey : fileKey || doc?.trackKey || liveKey;

  const timingDuration = useMemo(() => {
    const lastWord = doc?.words[doc.words.length - 1];
    const docEnd = lastWord ? lastWord.end + 8 : 0;
    return Math.max(12, visualTime + 5, docEnd, stageDuration, audio.duration);
  }, [doc, visualTime, stageDuration, audio.duration]);

  const durationForImport =
    mode === "live"
      ? sessionDuration || audio.duration || doc?.duration || 0
      : audio.duration || doc?.duration || sessionDuration || 0;

  const searchQuery = useMemo<LyricsQuery>(() => {
    if (mode === "live" && activeSession) {
      return {
        title: activeSession.title,
        artist: activeSession.artist,
        album: activeSession.album,
        duration: activeSession.duration || audio.duration,
      };
    }
    if (audio.fileName) {
      return {
        ...guessTrackFromFilename(audio.fileName),
        duration: audio.duration || doc?.duration,
      };
    }
    if (doc?.title || doc?.artist) {
      return {
        title: doc.title,
        artist: doc.artist,
        duration: doc.duration || sessionDuration,
      };
    }
    if (activeSession) {
      return {
        title: activeSession.title,
        artist: activeSession.artist,
        album: activeSession.album,
        duration: activeSession.duration,
      };
    }
    return {};
  }, [
    mode,
    activeSession,
    audio.fileName,
    audio.duration,
    doc?.title,
    doc?.artist,
    doc?.duration,
    sessionDuration,
  ]);

  useEffect(() => {
    if (mode !== "live" || !autoFetch || now.status !== "online" || !activeSession) return;
    const key = sessionKey(activeSession);
    if (!key || autoKeyRef.current === key) return;

    if (doc?.trackKey === key) {
      autoKeyRef.current = key;
      return;
    }
    if (doc?.edited) {
      autoKeyRef.current = key;
      addToast("Kept your edited lyrics. Clear them to auto-load the next track.", "info");
      return;
    }

    autoKeyRef.current = key;
    const requestId = (requestIdRef.current += 1);
    const controller = new AbortController();
    setFetchingLyrics(true);

    const query: LyricsQuery = {
      title: activeSession.title,
      artist: activeSession.artist,
      duration: activeSession.duration || audio.duration,
    };

    void (async () => {
      try {
        const results = await searchLyricsSmart(query, controller.signal);
        if (requestId !== requestIdRef.current) return;
        const best = chooseBestResult(results, query);
        if (!best) {
          addToast(
            results.length > 0
              ? `No confident LRCLIB match for “${activeSession.title}”. Try Find lyrics.`
              : `No LRCLIB lyrics found for “${activeSession.title}”.`,
            "info",
          );
          return;
        }
        const next = resultToDoc(best, {
          trackKey: key,
          fallbackDuration: activeSession.duration,
        });
        if (!next) {
          addToast("The matching lyrics had no readable lines.", "info");
          return;
        }
        setDoc(next);
        setSelectedWordId(next.words[0]?.id ?? null);
        addToast(
          `${next.wordLevel ? "Synced" : "Estimated"} lyrics loaded for ${next.title ?? activeSession.title}.`,
          "success",
        );
      } catch (error) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) return;
        addToast(
          error instanceof Error ? error.message : "Could not fetch lyrics from LRCLIB.",
          "error",
        );
      } finally {
        if (requestId === requestIdRef.current) setFetchingLyrics(false);
      }
    })();

    return () => controller.abort();
  }, [
    mode,
    autoFetch,
    autoRetry,
    now.status,
    liveKey,
    doc?.trackKey,
    doc?.edited,
    audio.duration,
    addToast,
  ]);

  useEffect(() => {
    if (!doc) {
      setSelectedWordId(null);
      return;
    }
    if (selectedWordId && doc.words.some((word) => word.id === selectedWordId)) return;
    setSelectedWordId(doc.words[0]?.id ?? null);
  }, [doc, selectedWordId]);

  const openTab = useCallback((nextTab: PanelTab) => {
    setTab(nextTab);
    if (window.matchMedia("(max-width: 1023px)").matches) setMobilePanelOpen(true);
  }, []);

  const openSearch = useCallback(() => {
    setMobilePanelOpen(false);
    setSearchOpen(true);
  }, []);

  const openTiming = useCallback(
    (lineIndex?: number) => {
      if (!doc || doc.words.length === 0) {
        addToast("Load lyrics before opening the timing editor.", "info");
        setSearchOpen(true);
        setMobilePanelOpen(false);
        return;
      }

      let word =
        lineIndex !== undefined
          ? doc.lines[lineIndex]?.words[0]
          : doc.words.find((item) => item.id === selectedWordId);
      if (!word) {
        word = activeWordIndex >= 0 ? doc.words[activeWordIndex] : doc.words[0];
      }
      if (word) setSelectedWordId(word.id);
      setTimingOpen(true);
      setMobilePanelOpen(false);

      if (lineIndex !== undefined && word && mode === "file" && audio.hasAudio) {
        audio.seek(Math.max(0, word.start - offsetSec));
      }
    },
    [
      doc,
      selectedWordId,
      activeWordIndex,
      addToast,
      mode,
      audio.seek,
      audio.hasAudio,
      offsetSec,
    ],
  );

  const updateStyle = useCallback((patch: Partial<StyleSettings>) => {
    setStyle((current) => ({ ...current, ...patch }));
  }, []);

  const handleAudioLoaded = useCallback(
    (file: File) => {
      void audio.loadFile(file);
      setMode("file");
      setMobilePanelOpen(false);
      addToast("Audio loaded. Find lyrics to sync the visual.", "info");
    },
    [audio.loadFile, addToast],
  );

  const handleChangeDoc = useCallback((next: LyricsDoc) => {
    setDoc(next);
  }, []);

  const selectDocument = useCallback(
    (next: LyricsDoc) => {
      requestIdRef.current += 1;
      setFetchingLyrics(false);
      setDoc({
        ...next,
        trackKey: next.trackKey ?? (trackKey || undefined),
      });
      setSelectedWordId(next.words[0]?.id ?? null);
      setSearchOpen(false);
      setTab("lyrics");
      autoKeyRef.current = trackKey || next.trackKey || "";
      addToast(
        `${next.wordLevel ? "Word-timed" : "Line-timed"} lyrics loaded · ${next.lines.length} lines`,
        "success",
      );
    },
    [trackKey, addToast],
  );

  const importLyrics = useCallback(
    (text: string) => {
      const timed = /(?:\[\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?\]|<\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?>)/.test(
        text,
      );
      const parsed = timed
        ? parseLrc(text)
        : parsePlainLyrics(text, durationForImport || undefined);

      if (parsed.words.length === 0) {
        addToast("No readable lyric lines were found in that text.", "error");
        return;
      }

      const next: LyricsDoc = {
        ...parsed,
        source: "manual",
        sourceLabel: timed ? "Pasted LRC" : "Pasted lyrics",
        title:
          parsed.title ||
          activeSession?.title ||
          titleFromFile(audio.fileName) ||
          "Untitled",
        artist:
          parsed.artist ||
          activeSession?.artist ||
          artistFromFile(audio.fileName) ||
          undefined,
        trackKey: trackKey || undefined,
        duration: parsed.duration || durationForImport || undefined,
        approximate: !parsed.wordLevel,
        edited: false,
      };

      requestIdRef.current += 1;
      setFetchingLyrics(false);
      setDoc(next);
      setSelectedWordId(next.words[0]?.id ?? null);
      autoKeyRef.current = trackKey;
      setTab("lyrics");
      addToast(`${timed ? "Timed" : "Estimated"} lyrics imported · ${next.lines.length} lines`, "success");
    },
    [activeSession, audio.fileName, trackKey, durationForImport, addToast],
  );

  const clearLyrics = useCallback(() => {
    requestIdRef.current += 1;
    setFetchingLyrics(false);
    setDoc(null);
    setSelectedWordId(null);
    autoKeyRef.current = trackKey;
    addToast("Lyrics cleared from the canvas.", "info");
  }, [trackKey, addToast]);

  const refresh = useCallback(() => {
    autoKeyRef.current = "";
    setAutoRetry((value) => value + 1);
    now.refresh();
  }, [now.refresh]);

  const changeAutoFetch = useCallback((value: boolean) => {
    setAutoFetch(value);
    if (value) autoKeyRef.current = "";
  }, []);

  const togglePlay = useCallback(() => {
    if (mode === "file") void audio.toggle();
  }, [mode, audio.toggle]);

  const handleSeek = useCallback(
    (time: number) => {
      audio.seek(time);
      setDisplayTime(time);
    },
    [audio.seek],
  );

  useEffect(() => {
    if (!mobilePanelOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobilePanelOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobilePanelOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target
        ? /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName) || target.isContentEditable
        : false;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        if (searchOpen || exportOpen) return;
        event.preventDefault();
        openSearch();
        return;
      }
      if (typing || searchOpen || exportOpen) return;

      if (event.code === "Space") {
        if (mode === "file" && audio.hasAudio) {
          event.preventDefault();
          void audio.toggle();
        }
        return;
      }
      if (
        (event.key === "t" || event.key === "T") &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault();
        openTiming();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [
    searchOpen,
    exportOpen,
    mode,
    audio.hasAudio,
    audio.toggle,
    openSearch,
    openTiming,
  ]);

  const panelContent =
    tab === "source" ? (
      <SourcePanel
        bridgeStatus={now.status}
        bridgeError={now.error}
        sessions={now.sessions}
        activeSession={activeSession}
        activeKey={now.activeKey}
        mode={mode}
        onModeChange={setMode}
        onChooseSession={now.chooseSession}
        onRefresh={refresh}
        autoFetch={autoFetch}
        onAutoFetchChange={changeAutoFetch}
        onOpenSearch={openSearch}
        onGoLive={() => setMode("live")}
        audio={audio}
        displayTime={displayTime}
        onAudioLoaded={handleAudioLoaded}
      />
    ) : tab === "lyrics" ? (
      <LyricsPanel
        doc={doc}
        activeLineIndex={activeLineIndex}
        activeWordIndex={activeWordIndex}
        offsetMs={style.offsetMs}
        onOffsetChange={(offsetMs) => updateStyle({ offsetMs })}
        onOpenSearch={openSearch}
        onOpenTiming={openTiming}
        onImportText={importLyrics}
        onClear={clearLyrics}
        fetching={fetchingLyrics}
      />
    ) : (
      <LookPanel style={style} onChange={updateStyle} />
    );

  return (
    <div className="app-shell flex flex-col bg-ink text-bone">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-48 -top-52 size-[620px] rounded-full bg-blood/[0.055] blur-[130px]" />
        <div className="absolute -bottom-64 right-[-10%] size-[580px] rounded-full bg-blood/[0.035] blur-[140px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      <Header
        status={now.status}
        session={activeSession}
        onOpenSource={() => openTab("source")}
        onOpenStudio={() => setMobilePanelOpen(true)}
        onExport={() => {
          setMobilePanelOpen(false);
          setExportOpen(true);
        }}
        canExport={audio.hasAudio}
      />

      <div className="relative flex min-h-0 flex-1">
        <Sidebar tab={tab} onTabChange={setTab} canvasFormat={style.canvasFormat}>
          {panelContent}
        </Sidebar>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Stage
            canvasRef={canvasRef}
            doc={doc}
            style={style}
            fontsReady={fontsReady}
            getTime={getVisualTime}
            currentTime={displayTime}
            duration={stageDuration}
            playing={mode === "live" ? now.isPlaying : audio.isPlaying}
            mode={mode}
            session={activeSession}
            bridgeStatus={now.status}
            hasAudio={audio.hasAudio}
            fetchingLyrics={fetchingLyrics}
            audioLoading={audio.loadingPeaks}
            onOpenSource={() => openTab("source")}
            onOpenSearch={openSearch}
            onOpenTiming={() => openTiming()}
            onTogglePlay={togglePlay}
            onSeek={handleSeek}
          />
        </main>
      </div>

      {mobilePanelOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close studio"
            onClick={() => setMobilePanelOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className="sheet-up absolute inset-x-0 bottom-0 flex h-[90dvh] flex-col overflow-hidden rounded-t-2xl border-t border-edge bg-panel shadow-[0_-40px_100px_rgba(0,0,0,0.75)]">
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-edge/70 px-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Studio
                </span>
                <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-dim">
                  {tab}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobilePanelOpen(false)}
                className="flex size-7 items-center justify-center rounded text-muted hover:bg-white/5 hover:text-bone"
                aria-label="Close studio"
              >
                <X className="size-4" />
              </button>
            </div>
            <PanelTabs tab={tab} onChange={setTab} compact />
            <div className="panel-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {panelContent}
            </div>
            <div className="shrink-0 border-t border-edge/60 p-3">
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => setMobilePanelOpen(false)}
              >
                Back to canvas
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <LyricsSearchDialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        initialQuery={searchQuery}
        trackKey={trackKey || undefined}
        onSelectDoc={selectDocument}
      />

      <TimingEditor
        open={timingOpen}
        onClose={() => setTimingOpen(false)}
        doc={doc}
        style={style}
        selectedWordId={selectedWordId}
        onSelectWord={(word) => setSelectedWordId(word.id)}
        onChangeDoc={handleChangeDoc}
        currentTime={visualTime}
        duration={timingDuration}
        audioDuration={audio.duration}
        peaks={audio.peaks}
        canSeek={mode === "file" && audio.hasAudio}
        activeWordIndex={activeWordIndex}
        offsetMs={style.offsetMs}
        onSeek={handleSeek}
      />

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        canvasRef={canvasRef}
        audio={audio}
        doc={doc}
        canvasFormat={style.canvasFormat}
        currentTime={audio.currentTime}
        onBeforeExport={() => setMode("file")}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
