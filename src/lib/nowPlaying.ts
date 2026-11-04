export interface MediaSession {
  appId: string;
  title: string;
  artist: string;
  album: string;
  status: string;
  position: number;
  duration: number;
  lastUpdatedAt: number;
}

export interface NowPlayingPayload {
  ok: boolean;
  supported: boolean;
  fetchedAt: number;
  sessions: MediaSession[];
  error?: string;
  cached?: boolean;
}

const BRIDGE_URL =
  (import.meta.env.VITE_BRIDGE_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://127.0.0.1:4319";

function toNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export async function fetchNowPlaying(timeoutMs = 4500): Promise<NowPlayingPayload> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${BRIDGE_URL}/nowplaying`, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Bridge responded with ${response.status}`);
    }

    const data = (await response.json()) as Partial<NowPlayingPayload>;
    const sessions = Array.isArray(data.sessions)
      ? data.sessions
          .map(
            (session): MediaSession => ({
              appId: toString(session.appId),
              title: toString(session.title),
              artist: toString(session.artist),
              album: toString(session.album),
              status: toString(session.status),
              position: Math.max(0, toNumber(session.position)),
              duration: Math.max(0, toNumber(session.duration)),
              lastUpdatedAt: toNumber(session.lastUpdatedAt),
            }),
          )
          .filter((session) => session.title)
      : [];

    return {
      ok: Boolean(data.ok),
      supported: Boolean(data.supported),
      fetchedAt: toNumber(data.fetchedAt, Date.now()),
      sessions,
      error: data.error,
    };
  } finally {
    window.clearTimeout(timer);
  }
}

export function sessionKey(session: MediaSession | null | undefined) {
  if (!session) return "";
  return [
    session.appId,
    session.title.trim().toLowerCase(),
    session.artist.trim().toLowerCase(),
    session.album.trim().toLowerCase(),
    Math.round(session.duration),
  ].join("|");
}

export function isPlaying(session: MediaSession | null | undefined) {
  return session?.status.toLowerCase() === "playing";
}

export function appLabel(appId: string) {
  if (!appId) return "Windows media";
  if (/spotify/i.test(appId)) return "Spotify";
  if (/chrome|msedge|firefox/i.test(appId)) return "Browser";
  return appId.replace(/\.exe$/i, "").replace(/[_-]+/g, " ");
}

export type SessionPick = (sessions: MediaSession[]) => MediaSession | null;

export function pickActiveSession(
  sessions: MediaSession[],
  preferredKey?: string,
  fallbackKey?: string,
) {
  if (sessions.length === 0) return null;
  if (preferredKey) {
    const preferred = sessions.find((session) => sessionKey(session) === preferredKey);
    if (preferred) return preferred;
  }
  const playing = sessions.filter(isPlaying);
  if (playing.length > 0) {
    return [...playing].sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt)[0];
  }
  if (fallbackKey) {
    const previous = sessions.find((session) => sessionKey(session) === fallbackKey);
    if (previous) return previous;
  }
  return [...sessions].sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt)[0];
}

interface LiveClockOptions {
  nowMs?: () => number;
  perfMs?: () => number;
}

export class LiveClock {
  private anchorPosition = 0;
  private anchorAt = 0;
  private playing = false;
  private initialized = false;
  private duration = 0;
  private key = "";
  private readonly nowMs: () => number;
  private readonly perfMs: () => number;

  constructor(options: LiveClockOptions = {}) {
    this.nowMs = options.nowMs ?? (() => Date.now());
    this.perfMs = options.perfMs ?? (() => performance.now());
  }

  apply(session: MediaSession, force = false) {
    const nowWall = this.nowMs();
    const nowPerf = this.perfMs();
    const key = sessionKey(session);
    const playing = session.status.toLowerCase() === "playing";
    const sinceUpdate = Math.max(0, nowWall - session.lastUpdatedAt) / 1000;
    const predicted = session.position + (playing ? sinceUpdate : 0);
    const safeDuration = session.duration > 0 ? session.duration : 0;
    const target = safeDuration > 0 ? Math.min(predicted, safeDuration) : predicted;

    const current = this.getTimeAt(nowPerf);
    const changed = key !== this.key;
    const drift = target - current;

    if (!this.initialized || changed || force || Math.abs(drift) > 0.8) {
      this.anchorPosition = target;
      this.anchorAt = nowPerf;
    } else {
      this.anchorPosition = Math.max(0, current + drift * 0.35);
      this.anchorAt = nowPerf;
    }

    this.playing = playing;
    this.duration = safeDuration;
    this.key = key;
    this.initialized = true;
    return { changed, target };
  }

  private getTimeAt(nowPerf: number) {
    const value =
      this.anchorPosition + (this.playing ? (nowPerf - this.anchorAt) / 1000 : 0);
    if (this.duration > 0) return Math.min(Math.max(0, value), this.duration);
    return Math.max(0, value);
  }

  getTime() {
    return this.getTimeAt(this.perfMs());
  }

  isPlaying() {
    return this.playing;
  }

  reset() {
    this.anchorPosition = 0;
    this.anchorAt = this.perfMs();
    this.playing = false;
    this.initialized = false;
    this.duration = 0;
    this.key = "";
  }
}
