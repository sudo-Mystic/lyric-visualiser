import { parseLrc, parsePlainLyrics } from "./lrc";
import type { LyricsDoc, SearchResult } from "./types";

export interface LyricsQuery {
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
}

const searchCache = new Map<string, { at: number; results: SearchResult[] }>();
const CACHE_TTL = 5 * 60 * 1000;

function decodeEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num: string) => String.fromCodePoint(Number(num)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function normalizeResult(raw: Partial<SearchResult>): SearchResult | null {
  if (typeof raw.id !== "number") return null;
  return {
    id: raw.id,
    trackName: decodeEntities(String(raw.trackName ?? "")),
    artistName: decodeEntities(String(raw.artistName ?? "")),
    albumName: decodeEntities(String(raw.albumName ?? "")),
    duration: Number(raw.duration) || 0,
    instrumental: Boolean(raw.instrumental),
    plainLyrics: raw.plainLyrics ? decodeEntities(String(raw.plainLyrics)) : null,
    syncedLyrics: raw.syncedLyrics ? decodeEntities(String(raw.syncedLyrics)) : null,
  };
}

function queryKey(query: LyricsQuery) {
  return JSON.stringify({
    title: query.title?.trim().toLowerCase() ?? "",
    artist: query.artist?.trim().toLowerCase() ?? "",
    album: query.album?.trim().toLowerCase() ?? "",
  });
}

export class LyricsApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LyricsApiError";
  }
}

async function requestSearch(params: URLSearchParams, signal?: AbortSignal) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 12000);
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });

  try {
    const response = await fetch(`https://lrclib.net/api/search?${params.toString()}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (response.status === 429) {
      throw new LyricsApiError("LRCLIB is rate limiting requests. Try again in a moment.");
    }
    if (!response.ok) {
      throw new LyricsApiError(`LRCLIB returned ${response.status}.`);
    }

    const data = (await response.json()) as unknown;
    if (!Array.isArray(data)) return [];
    return data
      .map((item) => normalizeResult(item as Partial<SearchResult>))
      .filter((item): item is SearchResult => item !== null);
  } catch (error) {
    if (error instanceof LyricsApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError" && signal?.aborted) {
      throw error;
    }
    throw new LyricsApiError(
      error instanceof Error ? error.message : "Could not reach LRCLIB.",
    );
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

export async function searchLyrics(query: LyricsQuery, signal?: AbortSignal) {
  const cacheKey = queryKey(query);
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return cached.results;
  }

  const params = new URLSearchParams();
  if (query.title?.trim()) params.set("track_name", query.title.trim());
  if (query.artist?.trim()) params.set("artist_name", query.artist.trim());
  if (query.album?.trim()) params.set("album_name", query.album.trim());

  if (!params.has("track_name") && !params.has("artist_name")) {
    throw new LyricsApiError("Enter a song title or artist to search.");
  }

  let results = await requestSearch(params, signal);

  if (results.length === 0 && query.title?.trim()) {
    const fallback = new URLSearchParams({ q: query.title.trim() });
    results = await requestSearch(fallback, signal);
  }

  results = results.sort((a, b) => scoreResult(b, query) - scoreResult(a, query));
  searchCache.set(cacheKey, { at: Date.now(), results });
  return results;
}

export function cleanTrackTitle(title: string) {
  return title
    .split(/\s*[|｜]\s*/)[0]
    .replace(
      /\s*\((?:feat\.?|ft\.?|with|from|remaster(?:ed)?|live|version|official|music video)[^)]*\)/gi,
      "",
    )
    .replace(/\s*\[[^\]]*\]/g, "")
    .trim();
}

export async function searchLyricsSmart(query: LyricsQuery, signal?: AbortSignal) {
  const results = await searchLyrics(query, signal);
  if (results.length > 0) return results;

  const title = query.title?.trim() ?? "";
  const cleaned = cleanTrackTitle(title);
  if (!cleaned || cleaned.toLowerCase() === title.toLowerCase()) return results;
  return searchLyrics({ ...query, title: cleaned }, signal);
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\((?:feat|ft|with|remaster|version|live|from)[^)]*\)/g, " ")
    .replace(/\b(feat|ft)\.?\s+.+$/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(value: string) {
  return new Set(normalizeText(value).split(" ").filter(Boolean));
}

function overlapScore(a: string, b: string) {
  const left = tokenSet(a);
  const right = tokenSet(b);
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  return shared / Math.max(left.size, right.size);
}

export function scoreResult(result: SearchResult, query: LyricsQuery) {
  let score = 0;
  const title = normalizeText(query.title || "");
  const resultTitle = normalizeText(result.trackName);
  const artist = normalizeText(query.artist || "");
  const resultArtist = normalizeText(result.artistName);

  if (title) {
    if (resultTitle === title) score += 58;
    else if (resultTitle.includes(title) || title.includes(resultTitle)) score += 41;
    else score += Math.round(overlapScore(title, resultTitle) * 38);
  }

  if (artist) {
    if (resultArtist === artist) score += 28;
    else if (resultArtist.includes(artist) || artist.includes(resultArtist)) score += 20;
    else score += Math.round(overlapScore(artist, resultArtist) * 16);
  }

  if (query.duration && result.duration) {
    const diff = Math.abs(query.duration - result.duration);
    if (diff <= 1.5) score += 20;
    else if (diff <= 4) score += 14;
    else if (diff <= 9) score += 7;
    else if (diff <= 20) score += 2;
    else score -= 8;
  }

  if (result.syncedLyrics) score += 9;
  if (result.plainLyrics) score += 2;
  if (result.instrumental) score -= 12;
  return score;
}

export function chooseBestResult(results: SearchResult[], query: LyricsQuery) {
  if (results.length === 0) return null;
  const ranked = [...results].sort((a, b) => scoreResult(b, query) - scoreResult(a, query));
  const best = ranked[0];
  const score = scoreResult(best, query);

  const title = normalizeText(query.title || "");
  const resultTitle = normalizeText(best.trackName);
  const titleMatches =
    !title || resultTitle === title || resultTitle.includes(title) || title.includes(resultTitle);
  const durationOk =
    !query.duration ||
    !best.duration ||
    Math.abs(best.duration - query.duration) <= 12;

  if (score < 40 || !titleMatches || !durationOk) return null;
  if (!best.syncedLyrics && !best.plainLyrics) {
    return ranked.find((result) => result.syncedLyrics || result.plainLyrics) ?? null;
  }
  return best;
}

export function resultToDoc(
  result: SearchResult,
  options: { trackKey?: string; fallbackDuration?: number } = {},
): LyricsDoc | null {
  const duration = result.duration || options.fallbackDuration;
  let doc: LyricsDoc | null = null;

  if (result.syncedLyrics?.trim()) {
    doc = parseLrc(result.syncedLyrics);
    doc.sourceLabel = doc.wordLevel ? "LRCLIB · word timing" : "LRCLIB · line timing";
  } else if (result.plainLyrics?.trim()) {
    doc = parsePlainLyrics(result.plainLyrics, duration);
    doc.sourceLabel = "LRCLIB · estimated timing";
  }

  if (!doc || doc.words.length === 0) return null;

  return {
    ...doc,
    title: result.trackName || doc.title,
    artist: result.artistName || doc.artist,
    album: result.albumName || doc.album,
    source: "lrclib",
    trackKey: options.trackKey,
    duration,
    lrclibId: result.id,
    approximate: !doc.wordLevel,
  };
}

export function guessTrackFromFilename(filename: string): LyricsQuery {
  const name = filename
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[_]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  const parts = name.split(/\s+-\s+/);
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), title: parts.slice(1).join(" - ").trim() };
  }
  return { title: name };
}

export function describeTiming(doc: LyricsDoc | null) {
  if (!doc || doc.words.length === 0) return "No lyrics loaded";
  if (doc.wordLevel) return "Word-level timing";
  if (doc.source === "lrc") return "Line timing · words distributed";
  if (doc.source === "plain") return "Estimated timing";
  return "Line timing · words distributed";
}
