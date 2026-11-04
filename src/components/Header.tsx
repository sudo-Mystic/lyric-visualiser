import { Download, PanelLeft, Radio, WifiOff } from "lucide-react";
import type { BridgeStatus } from "../hooks/useNowPlaying";
import { appLabel, isPlaying, type MediaSession } from "../lib/nowPlaying";
import { Button, cn, Spinner } from "./ui";

interface HeaderProps {
  status: BridgeStatus;
  session: MediaSession | null;
  onOpenSource: () => void;
  onOpenStudio: () => void;
  onExport: () => void;
  canExport: boolean;
}

export function Header({
  status,
  session,
  onOpenSource,
  onOpenStudio,
  onExport,
  canExport,
}: HeaderProps) {
  const playing = isPlaying(session);
  const online = status === "online";
  const showTrack = online && session;

  return (
    <header className="relative z-30 flex h-[60px] shrink-0 items-center justify-between border-b border-edge/80 bg-ink/80 px-4 backdrop-blur-xl sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-[5px] bg-blood shadow-[0_0_28px_rgba(255,42,48,0.2)]">
          <span className="text-devanagari -mt-0.5 text-[18px] font-black leading-none text-black">
            र
          </span>
        </div>
        <div className="flex min-w-0 items-baseline gap-2.5">
          <span className="text-[15px] font-bold tracking-[0.18em] text-bone">RAAKH</span>
          <span className="hidden text-[9px] font-semibold uppercase tracking-[0.2em] text-dim sm:inline">
            Lyric Visualiser
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenSource}
        className="group absolute left-1/2 hidden max-w-[42vw] -translate-x-1/2 items-center gap-2.5 rounded-full border border-edge/80 bg-white/[0.025] py-1.5 pl-2.5 pr-3.5 text-left transition-colors hover:border-white/20 hover:bg-white/[0.05] lg:flex"
        title="Open the source panel"
      >
        {showTrack ? (
          <>
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                playing ? "live-pulse bg-blood" : "bg-amber-400",
              )}
            />
            <span className="shrink-0 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
              {appLabel(session.appId)}
            </span>
            <span className="min-w-0 truncate text-[11px] font-medium text-bone/90">
              {session.title}
              <span className="text-dim"> · {session.artist || "Unknown artist"}</span>
            </span>
            {!playing ? (
              <span className="shrink-0 font-mono text-[9px] uppercase text-amber-300/80">Paused</span>
            ) : null}
          </>
        ) : online ? (
          <>
            <Radio className="size-3 text-dim" />
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
              No media playing
            </span>
          </>
        ) : status === "checking" ? (
          <>
            <Spinner className="text-muted" />
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
              Looking for Windows media
            </span>
          </>
        ) : status === "unsupported" ? (
          <>
            <WifiOff className="size-3 text-amber-400/70" />
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
              Windows media API unavailable
            </span>
          </>
        ) : (
          <>
            <span className="size-1.5 rounded-full bg-dim" />
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
              Local bridge offline
            </span>
            <span className="font-mono text-[9px] text-dim">· open setup</span>
          </>
        )}
      </button>

      <div className="flex shrink-0 items-center gap-2">
        <div className="mr-1 hidden items-center gap-1.5 sm:flex">
          <span
            className={cn(
              "size-1.5 rounded-full",
              online ? "bg-emerald-400" : status === "checking" ? "bg-amber-400" : "bg-dim",
            )}
          />
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-dim">
            {online ? "Bridge live" : status === "checking" ? "Connecting" : "Bridge off"}
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenStudio}
          className="flex size-8 items-center justify-center rounded-md border border-edge text-muted transition-colors hover:border-white/25 hover:text-bone lg:hidden"
          aria-label="Open studio panels"
        >
          <PanelLeft className="size-3.5" />
        </button>
        <Button
          variant="primary"
          size="sm"
          icon={<Download className="size-3.5" />}
          onClick={onExport}
          disabled={!canExport}
          title={canExport ? "Export the uploaded audio as video" : "Upload audio to export"}
        >
          Export
        </Button>
      </div>
    </header>
  );
}
