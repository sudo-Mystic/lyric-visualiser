import { useCallback, useEffect, useRef, useState } from "react";

interface ExportAudio {
  stream: MediaStream;
  context: AudioContext;
}

interface PeaksResult {
  peaks: Float32Array;
  sourceDuration: number;
}

function computePeaks(buffer: AudioBuffer, buckets = 2400): PeaksResult {
  const channel = buffer.getChannelData(0);
  const peaks = new Float32Array(buckets);
  const bucketSize = Math.max(1, Math.floor(channel.length / buckets));

  for (let bucket = 0; bucket < buckets; bucket += 1) {
    const from = bucket * bucketSize;
    const to = Math.min(channel.length, from + bucketSize);
    let peak = 0;
    for (let index = from; index < to; index += 1) {
      const value = Math.abs(channel[index]);
      if (value > peak) peak = value;
    }
    peaks[bucket] = peak;
  }

  return { peaks, sourceDuration: buffer.duration };
}

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const graphRef = useRef<{
    context: AudioContext;
    source: MediaElementAudioSourceNode;
    destination: MediaStreamAudioDestinationNode;
    gain: GainNode;
  } | null>(null);
  const decodeContextRef = useRef<AudioContext | null>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  const [loadingPeaks, setLoadingPeaks] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    const onLoaded = () => setReady(true);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("durationchange", onDuration);
    audio.addEventListener("loadedmetadata", onDuration);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("canplay", onLoaded);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("durationchange", onDuration);
      audio.removeEventListener("loadedmetadata", onDuration);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("canplay", onLoaded);
      audio.src = "";
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      if (graphRef.current) void graphRef.current.context.close();
      if (decodeContextRef.current) void decodeContextRef.current.close();
    };
  }, []);

  const loadFile = useCallback(async (nextFile: File) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(nextFile);
    urlRef.current = url;

    setFile(nextFile);
    setFileName(nextFile.name);
    setPeaks(null);
    setCurrentTime(0);
    setDuration(0);
    setReady(false);

    audio.src = url;
    audio.load();

    await new Promise<void>((resolve) => {
      if (audio.readyState >= 1) {
        resolve();
        return;
      }
      const onMetadata = () => {
        audio.removeEventListener("loadedmetadata", onMetadata);
        resolve();
      };
      audio.addEventListener("loadedmetadata", onMetadata);
      window.setTimeout(() => {
        audio.removeEventListener("loadedmetadata", onMetadata);
        resolve();
      }, 8000);
    });

    setLoadingPeaks(true);
    void (async () => {
      try {
        const buffer = await nextFile.arrayBuffer();
        const context = new AudioContext();
        decodeContextRef.current = context;
        const decoded = await context.decodeAudioData(buffer);
        const result = computePeaks(decoded);
        setPeaks(result.peaks);
        if (!Number.isFinite(audio.duration) || audio.duration === 0) {
          setDuration(result.sourceDuration);
        }
      } catch {
        // Waveform is optional; playback still works.
      } finally {
        setLoadingPeaks(false);
        if (decodeContextRef.current) {
          void decodeContextRef.current.close();
          decodeContextRef.current = null;
        }
      }
    })();
  }, []);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      await audio.play();
    } catch {
      setIsPlaying(false);
    }
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) await play();
    else audio.pause();
  }, [play]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const max = Number.isFinite(audio.duration) ? audio.duration : time;
    audio.currentTime = Math.min(Math.max(0, time), max);
    setCurrentTime(audio.currentTime);
  }, []);

  const reset = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setCurrentTime(0);
  }, []);

  const remove = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setFile(null);
    setFileName(null);
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setPeaks(null);
    setReady(false);
  }, []);

  const getExportAudio = useCallback(async (): Promise<ExportAudio | null> => {
    const audio = audioRef.current;
    if (!audio) return null;

    if (!graphRef.current) {
      const context = new AudioContext();
      await context.resume();
      const source = context.createMediaElementSource(audio);
      const gain = context.createGain();
      const destination = context.createMediaStreamDestination();
      source.connect(gain);
      gain.connect(context.destination);
      gain.connect(destination);
      graphRef.current = { context, source, destination, gain };
    }

    await graphRef.current.context.resume();
    return {
      stream: graphRef.current.destination.stream,
      context: graphRef.current.context,
    };
  }, []);

  return {
    audioRef,
    file,
    fileName,
    duration,
    currentTime,
    isPlaying,
    peaks,
    loadingPeaks,
    ready,
    hasAudio: Boolean(fileName),
    loadFile,
    play,
    pause,
    toggle,
    seek,
    reset,
    remove,
    getExportAudio,
  };
}

export type AudioPlayer = ReturnType<typeof useAudioPlayer>;
