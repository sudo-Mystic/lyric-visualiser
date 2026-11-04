import { useRef, useState } from "react";
import {
  AudioLines,
  Check,
  FileAudio2,
  Loader2,
  MonitorSpeaker,
  Play,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import type { BridgeStatus } from "../hooks/useNowPlaying";
import {
  appLabel,
  sessionKey,
  type MediaSession,
} from "../lib/nowPlaying";
import { formatTimeShort } from "../lib/timing";
import type { AudioPlayer } from "../hooks/useAudioPlayer";
import {
  Badge,
  Button,
  cn,
  SectionLabel,
  Segmented,
  Toggle,
} from "./ui";

type SourceMode = "live" | "file";

interface SourcePanelProps {
  bridgeStatus: BridgeStatus;
  bridgeError: string | null;
  sessions: MediaSession[];
  activeSession: MediaSession | null;
  activeKey: string;
  mode: SourceMode;
  onModeChange: (mode: SourceMode) => void;
  onChooseSession: (session: MediaSession) => void;
  onRefresh: () => void;
  autoFetch: boolean;
  onAutoFetchChange: (value: boolean) => void;
  onOpenSearch: () => void;
  onGoLive: () => void;
  audio: AudioPlayer;
  displayTime: number;
  onAudioLoaded: (file: File) => void;
}

function BridgeSetup() {
  const [copied, setCopied] = useState(false);
  const command = "npm run bridge";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="rounded-md border border-amber-400/20 bg-amber-400/[0.035] p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-amber-400" />
        <span className="text-[11px] font-medium text-amber-200">Local bridge not connected</span>
      </div>
      <p className="mb-2.5 text-[11px] leading-relaxed text-dim">
        Live detection runs through a loopback helper on your PC. Start it once, then leave it
        running.
      </p>
      <button
        type="button"
        onClick={copy}
        className="flex w-full items-center justify-between rounded border border-edge bg-black/50 px-2.5 py-2 font-mono text-[11px] text-bone/80 transition-colors hover:border-white/20"
      >
        {command}
        <span className="text-[9px] uppercase tracking-wider text-dim">
          {copied ? "Copied" : "Copy"}
        </span>
      </button>
    </div>
  );
}

export function SourcePanel({
  bridgeStatus,
  bridgeError,
  sessions,
  activeSession,
  activeKey,
  mode,
  onModeChange,
  onChooseSession,
  onRefresh,
  autoFetch,
  onAutoFetchChange,
  onOpenSearch,
  onGoLive,
  audio,
  displayTime,
  onAudioLoaded,
}: SourcePanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const browse = () => inputRef.current?.click();

  const acceptFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("audio/") && !/\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(file.name)) {
      return;
    }
    onAudioLoaded(file);
  };

  const liveOnline = bridgeStatus === "online";
  const duration = activeSession?.duration || 0;
  const progress = duration > 0 ? Math.min(1, Math.max(0, displayTime / duration)) : 0;

  return (
    <div className="space-y-6">
      <div>
        <SectionLabel action={<Badge tone={liveOnline ? "green" : "amber"}>{liveOnline ? "Bridge live" : "Offline"}</Badge>}>
          Input
        </SectionLabel>
        <Segmented
          value={mode}
          onChange={onModeChange}
          options={[
            { value: "live", label: "Windows live", icon: <MonitorSpeaker className="size-3" /> },
            { value: "file", label: "Audio file", icon: <FileAudio2 className="size-3" /> },
          ]}
        />
      </div>

      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn("size-1.5 rounded-full", liveOnline ? "live-pulse bg-blood" : "bg-dim")} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Now playing
            </span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center gap-1 text-[10px] text-dim transition-colors hover:text-bone"
          >
            <RefreshCw className="size-3" />
            Rescan
          </button>
        </div>

        {bridgeStatus === "checking" ? (
          <div className="flex items-center gap-2 rounded-md border border-edge bg-white/[0.025] px-3 py-4 text-[11px] text-dim">
            <Loader2 className="size-3.5 animate-spin" />
            Reading the Windows media session…
          </div>
        ) : !liveOnline ? (
          <BridgeSetup />
        ) : activeSession ? (
          <div className="overflow-hidden rounded-md border border-edge bg-gradient-to-b from-white/[0.045] to-white/[0.015]">
            <div className="p-3.5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded bg-blood/[0.12] text-blood">
                    <AudioLines className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold leading-snug text-bone">
                      {activeSession.title}
                    </div>
                    <div className="truncate text-[11px] text-muted">
                      {activeSession.artist || "Unknown artist"}
                    </div>
                  </div>
                </div>
                <span className="mt-1 flex shrink-0 items-center gap-1 font-mono text-[9px] uppercase tracking-[0.1em] text-dim">
                  {activeSession.status === "Playing" ? (
                    <>
                      <span className="size-1 rounded-full bg-emerald-400" />
                      Playing
                    </>
                  ) : (
                    activeSession.status || "Paused"
                  )}
                </span>
              </div>

              <div className="mb-1 h-[2px] overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-blood/80 transition-[width] duration-500"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <div className="mb-3 flex items-center justify-between font-mono text-[9px] text-dim">
                <span>{formatTimeShort(displayTime)}</span>
                <span>{duration ? formatTimeShort(duration) : "--:--"}</span>
              </div>

              {activeSession.album ? (
                <div className="mb-3 truncate text-[10px] text-dim">{activeSession.album}</div>
              ) : null}

              <div className="flex gap-2">
                <Button
                  variant={mode === "live" ? "secondary" : "primary"}
                  size="sm"
                  className="flex-1"
                  onClick={onGoLive}
                  icon={mode === "live" ? <Check className="size-3.5" /> : <Play className="size-3.5" />}
                >
                  {mode === "live" ? "Visualiser live" : "Go live"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onOpenSearch}
                  icon={<Search className="size-3.5" />}
                >
                  Lyrics
                </Button>
              </div>

              {sessions.length > 1 ? (
                <select
                  value={activeKey}
                  onChange={(event) => {
                    const session = sessions.find(
                      (item) => sessionKey(item) === event.target.value,
                    );
                    if (session) onChooseSession(session);
                  }}
                  className="mt-3 h-8 w-full rounded border border-edge bg-black/40 px-2 text-[11px] text-muted outline-none focus:border-white/25"
                >
                  {sessions.map((session) => (
                    <option key={sessionKey(session)} value={sessionKey(session)}>
                      {appLabel(session.appId)} · {session.title} — {session.artist}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-dim">
                  Source · {appLabel(activeSession.appId)}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-edge bg-white/[0.015] px-3.5 py-5 text-center">
            <AudioLines className="mx-auto mb-2 size-4 text-dim" />
            <div className="text-[11px] font-medium text-muted">Nothing playing</div>
            <p className="mx-auto mt-1 max-w-[230px] text-[10px] leading-relaxed text-dim">
              Start a song in Spotify, a browser, or any Windows media app. RAAKH will pick it up.
            </p>
          </div>
        )}

        {bridgeError && liveOnline ? (
          <div className="mt-2 text-[10px] text-amber-300/70">{bridgeError}</div>
        ) : null}

        <div className="mt-2.5">
          <Toggle
            checked={autoFetch}
            onChange={onAutoFetchChange}
            label="Find lyrics automatically"
            description="Search LRCLIB whenever the Windows track changes."
          />
        </div>
      </div>

      <div>
        <SectionLabel>Song audio</SectionLabel>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
          className="hidden"
          onChange={(event) => {
            acceptFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />

        {audio.fileName ? (
          <div className="rounded-md border border-edge bg-white/[0.025] p-3">
            <div className="flex items-start gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded bg-white/[0.05] text-muted">
                <FileAudio2 className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-medium text-bone">{audio.fileName}</div>
                <div className="mt-0.5 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.08em] text-dim">
                  <span>{formatTimeShort(audio.duration)}</span>
                  <span>·</span>
                  <span>{audio.loadingPeaks ? "Reading waveform" : "Ready"}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={audio.remove}
                className="text-dim transition-colors hover:text-blood"
                title="Remove audio"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
            <div className="mt-2.5 flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => onModeChange("file")} icon={<Play className="size-3" />}>
                Use for preview
              </Button>
              <Button variant="ghost" size="sm" onClick={browse}>
                Replace
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={browse}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              acceptFile(event.dataTransfer.files?.[0]);
            }}
            className={cn(
              "flex w-full flex-col items-center rounded-md border border-dashed px-4 py-5 text-center transition-colors",
              dragging
                ? "border-blood/60 bg-blood/[0.06]"
                : "border-edge bg-white/[0.012] hover:border-white/25 hover:bg-white/[0.03]",
            )}
          >
            <Upload className="mb-2 size-4 text-dim" />
            <span className="text-[11px] font-medium text-muted">Drop MP3 or WAV</span>
            <span className="mt-1 text-[10px] leading-relaxed text-dim">
              Needed only for export. Live preview needs no file.
            </span>
          </button>
        )}
      </div>

      <div className="rounded-md border border-edge/70 bg-black/20 p-3">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-dim">
          How live works
        </div>
        <p className="text-[10px] leading-relaxed text-muted">
          RAAKH reads the Windows media session title, artist and playback clock. The lyrics follow
          your player. Audio cannot be captured from Spotify or the browser; upload the song when
          you want an exported file.
        </p>
      </div>
    </div>
  );
}
