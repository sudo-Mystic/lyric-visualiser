import { useEffect, useRef, useState, type RefObject } from "react";
import {
  CheckCircle2,
  Clapperboard,
  Download,
  Film,
  Loader2,
  TriangleAlert,
  Video,
} from "lucide-react";
import type { AudioPlayer } from "../hooks/useAudioPlayer";
import type { CanvasFormat, LyricsDoc } from "../lib/types";
import { canvasFormatLabel, canvasSize } from "../lib/render/formats";
import { formatTime } from "../lib/timing";
import { Button, Dialog, Segmented } from "./ui";

type ExportFormat = "mp4" | "webm";
type RangeMode = "full" | "start30" | "playhead20";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  audio: AudioPlayer;
  doc: LyricsDoc | null;
  canvasFormat: CanvasFormat;
  currentTime: number;
  onBeforeExport: () => void;
}

interface ExportResult {
  url: string;
  name: string;
  format: ExportFormat;
  size: number;
}

const FORMAT_TYPES: Record<ExportFormat, string[]> = {
  mp4: ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4"],
  webm: [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9",
    "video/webm",
  ],
};

function pickMime(format: ExportFormat) {
  if (typeof MediaRecorder === "undefined") return null;
  return FORMAT_TYPES[format].find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ExportDialog({
  open,
  onClose,
  canvasRef,
  audio,
  doc,
  canvasFormat,
  currentTime,
  onBeforeExport,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>("webm");
  const [range, setRange] = useState<RangeMode>("full");
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const videoTracksRef = useRef<MediaStreamTrack[]>([]);
  const cancelledRef = useRef(false);
  const stoppedRef = useRef(false);
  const resultUrlRef = useRef<string | null>(null);

  const supportsMp4 = Boolean(pickMime("mp4"));
  const supportsWebm = Boolean(pickMime("webm"));
  const canRecord = supportsWebm || supportsMp4;
  const duration = audio.duration;
  const outputSize = canvasSize(canvasFormat);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setResult((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
    setProgress(0);
    setRecording(false);
    setFormat(supportsMp4 && !supportsWebm ? "mp4" : "webm");
  }, [open, supportsMp4, supportsWebm]);

  useEffect(() => {
    return () => {
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, []);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopRecording = () => {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    clearTimer();
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    audio.audioRef.current?.pause();
    setRecording(false);
  };

  const cancel = () => {
    cancelledRef.current = true;
    stopRecording();
    videoTracksRef.current.forEach((track) => track.stop());
    videoTracksRef.current = [];
  };

  const handleClose = () => {
    if (recording) cancel();
    onClose();
  };

  const start = async () => {
    if (!audio.hasAudio) {
      setError("Upload a song in the source panel before exporting.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setError("This browser does not support MediaRecorder.");
      return;
    }
    const canvas = canvasRef.current;
    const media = audio.audioRef.current;
    if (!canvas || !media) {
      setError("The preview or audio is not ready yet.");
      return;
    }

    const mimeType = pickMime(format);
    if (!mimeType) {
      setError("This browser cannot record the selected format. Try WebM.");
      return;
    }

    setError(null);
    setProgress(0);
    setResult((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
    cancelledRef.current = false;
    stoppedRef.current = false;
    chunksRef.current = [];

    const startAt = range === "full" ? 0 : range === "start30" ? 0 : Math.max(0, currentTime);
    const length =
      range === "full"
        ? Math.max(1, duration)
        : range === "start30"
          ? Math.min(30, Math.max(1, duration))
          : Math.min(20, Math.max(1, duration - startAt));

    onBeforeExport();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    try {
      media.pause();
      media.currentTime = Math.min(startAt, Math.max(0, duration - 0.05));
      const exportAudio = await audio.getExportAudio();
      if (!exportAudio) {
        throw new Error("The audio output is not ready yet.");
      }

      const videoStream = canvas.captureStream(30);
      videoTracksRef.current = videoStream.getVideoTracks();
      const stream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...exportAudio.stream.getAudioTracks(),
      ]);

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8_000_000,
        audioBitsPerSecond: 192_000,
      });
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        clearTimer();
        videoTracksRef.current.forEach((track) => track.stop());
        videoTracksRef.current = [];
        media.pause();
        if (cancelledRef.current) return;

        const blob = new Blob(chunksRef.current, { type: mimeType.split(";")[0] });
        chunksRef.current = [];
        if (blob.size === 0) {
          setError("The recorder produced an empty file. Try a shorter clip.");
          return;
        }
        if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
        const url = URL.createObjectURL(blob);
        resultUrlRef.current = url;
        const safeTitle = (doc?.title || "raakh-visualiser")
          .replace(/[^\p{L}\p{N}\s._-]/gu, "")
          .replace(/\s+/g, "-")
          .slice(0, 64);
        setResult({
          url,
          name: `${safeTitle || "raakh-visualiser"}.${format}`,
          format,
          size: blob.size,
        });
        setProgress(1);
      };

      recorder.start(1000);
      setRecording(true);
      await media.play();

      const startedAt = performance.now();
      timerRef.current = window.setInterval(() => {
        const elapsed = (performance.now() - startedAt) / 1000;
        const audioElapsed = Math.max(0, media.currentTime - startAt);
        setProgress(Math.min(1, Math.max(elapsed, audioElapsed) / length));
        if (elapsed >= length + 0.12 || media.ended) {
          stopRecording();
        }
      }, 120);
    } catch (recordError) {
      setRecording(false);
      clearTimer();
      videoTracksRef.current.forEach((track) => track.stop());
      videoTracksRef.current = [];
      setError(
        recordError instanceof Error
          ? recordError.message
          : "The recording could not be started.",
      );
    }
  };

  const remaining = range === "full" ? duration : range === "start30" ? Math.min(30, duration) : 20;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      eyebrow="Render"
      title="Export video"
      width="lg"
      footer={
        recording ? (
          <>
            <span className="mr-auto flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
              <span className="live-pulse size-1.5 rounded-full bg-blood" />
              Recording in real time · keep this tab visible
            </span>
            <Button variant="danger" size="sm" onClick={cancel}>
              Stop and discard
            </Button>
          </>
        ) : result ? (
          <>
            <span className="mr-auto font-mono text-[9px] uppercase tracking-[0.1em] text-dim">
              {formatBytes(result.size)} · {formatTime(remaining)} clip
            </span>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Close
            </Button>
            <a
              href={result.url}
              download={result.name}
              className="inline-flex h-8 items-center justify-center gap-2 rounded-md bg-blood px-3 text-[12px] font-medium text-black transition-colors hover:bg-[#ff454a]"
            >
              <Download className="size-3.5" />
              Download {result.format.toUpperCase()}
            </a>
          </>
        ) : (
          <>
            <span className="mr-auto hidden font-mono text-[9px] uppercase tracking-[0.1em] text-dim sm:inline">
              Real-time canvas capture · {formatTime(remaining)}
            </span>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => void start()}
              disabled={!canRecord || !audio.hasAudio || recording}
              icon={<Clapperboard className="size-3.5" />}
            >
              Start export
            </Button>
          </>
        )
      }
    >
      {recording ? (
        <div className="py-4">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-[13px] font-semibold text-bone">Rendering the canvas</div>
              <p className="mt-1 max-w-[400px] text-[11px] leading-relaxed text-muted">
                RAAKH records the visualiser and uploaded audio as they play. Avoid switching tabs
                or minimising the window while this runs.
              </p>
            </div>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-blood/30 bg-blood/10">
              <Video className="size-4 text-blood" />
            </div>
          </div>
          <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blood/60 to-blood transition-[width] duration-150"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.1em] text-dim">
            <span>{Math.round(progress * 100)}%</span>
            <span>{formatTime(remaining * progress)} / {formatTime(remaining)}</span>
          </div>
        </div>
      ) : result ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-2 text-[11px] text-emerald-200/90">
            <CheckCircle2 className="size-3.5" />
            Export complete · {result.name}
          </div>
          <div className="overflow-hidden rounded-md border border-edge bg-black">
            <video
              src={result.url}
              controls
              loop
              muted
              playsInline
              className="mx-auto max-h-[42vh] w-auto max-w-full"
            />
          </div>
          <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.1em] text-dim">
            <span>{formatBytes(result.size)}</span>
            <span>{result.format === "webm" ? "VP9 / WebM" : "H.264 / MP4"}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {!audio.hasAudio ? (
            <div className="flex items-start gap-2 rounded-md border border-amber-400/20 bg-amber-400/[0.05] px-3 py-2 text-[11px] leading-relaxed text-amber-200/90">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              Add a song file in the Source panel first. Browsers cannot capture streaming audio
              from Spotify or a browser tab.
            </div>
          ) : null}

          {!canRecord ? (
            <div className="flex items-start gap-2 rounded-md border border-blood/25 bg-blood/[0.05] px-3 py-2 text-[11px] leading-relaxed text-blood/90">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              This browser has no MediaRecorder video support. Try current Chrome or Edge.
            </div>
          ) : null}

          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-dim">
              Format
            </div>
            <Segmented
              value={format}
              onChange={(value) => {
                if (value === "mp4" && !supportsMp4) return;
                if (value === "webm" && !supportsWebm) return;
                setFormat(value);
              }}
              options={[
                { value: "webm", label: supportsWebm ? "WebM" : "WebM · unavailable", icon: <Film className="size-3" /> },
                {
                  value: "mp4",
                  label: supportsMp4 ? "MP4" : "MP4 · unavailable",
                  icon: <Video className="size-3" />,
                },
              ]}
            />
            <p className="mt-1.5 text-[10px] leading-relaxed text-dim">
              {format === "webm"
                ? "WebM is the most reliable capture format. Works directly in browsers and most editors."
                : "MP4 recording depends on the browser's native encoder. If unsupported, use WebM."}
            </p>
          </div>

          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-dim">
              Range
            </div>
            <Segmented
              value={range}
              onChange={setRange}
              options={[
                { value: "full", label: `Full · ${formatTime(duration)}` },
                { value: "start30", label: `30s intro` },
                { value: "playhead20", label: `20s @ ${formatTime(currentTime)}` },
              ]}
            />
          </div>

          <div className="rounded-md border border-edge/70 bg-white/[0.018] p-3">
            <div className="mb-1.5 flex items-center gap-2">
              <Clapperboard className="size-3.5 text-muted" />
              <span className="text-[11px] font-medium text-bone/90">Canvas output</span>
            </div>
            <div className="grid grid-cols-2 gap-y-1 font-mono text-[9px] uppercase tracking-[0.08em] text-dim">
              <span>Resolution</span>
              <span className="text-right text-muted">
                {outputSize.width} × {outputSize.height}
              </span>
              <span>Frame rate</span>
              <span className="text-right text-muted">30 fps</span>
              <span>Audio</span>
              <span className="text-right text-muted">192 kbps</span>
              <span>Style</span>
              <span className="text-right text-muted">{doc ? "Current look" : "Empty canvas"}</span>
              <span>Aspect</span>
              <span className="text-right text-muted">{canvasFormatLabel(canvasFormat)}</span>
            </div>
          </div>

          {error ? (
            <div className="flex items-start gap-2 rounded-md border border-blood/25 bg-blood/[0.05] px-3 py-2 text-[11px] leading-relaxed text-blood/90">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              {error}
            </div>
          ) : null}

          <div className="font-mono text-[9px] uppercase leading-relaxed tracking-[0.08em] text-dim/70">
            {recording ? (
              <Loader2 className="mr-1 inline size-2.5 animate-spin" />
            ) : null}
            Capture happens in real time. A 3-minute song takes 3 minutes to record.
          </div>
        </div>
      )}
    </Dialog>
  );
}
