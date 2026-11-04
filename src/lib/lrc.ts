import type { LyricLine, LyricsDoc, TimedWord } from "./types";

const TIME_TAG = /^(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?$/;
const WORD_TAG = /<(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?>/g;
const EDGE_PUNCTUATION =
  /^[\s"'“”‘’`.,;:!?—–\-–()\[\]{}<>/\\|।॥]+|[\s"'“”‘’`.,;:!?—–\-–()\[\]{}<>/\\|।॥]+$/gu;
const HAS_LETTER = /[\p{L}\p{M}]/u;

let graphemeSegmenter: Intl.Segmenter | null = null;

function graphemeCount(text: string) {
  if (!graphemeSegmenter) {
    graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  }
  return Array.from(graphemeSegmenter.segment(text)).length;
}

function parseTagTime(minutes: string, seconds: string, fraction?: string) {
  const fractionMs = fraction ? Number(fraction.padEnd(3, "0").slice(0, 3)) : 0;
  return Number(minutes) * 60 + Number(seconds) + fractionMs / 1000;
}

export function parseTimeTag(inside: string) {
  const match = inside.trim().match(TIME_TAG);
  if (!match) return null;
  const value = parseTagTime(match[1], match[2], match[3]);
  return Number.isFinite(value) ? value : null;
}

function cleanToken(text: string) {
  const cleaned = text.replace(EDGE_PUNCTUATION, "").trim();
  if (!cleaned || !HAS_LETTER.test(cleaned)) return "";
  return cleaned;
}

export function splitDisplayWords(text: string) {
  return text
    .split(/\s+/)
    .map(cleanToken)
    .filter(Boolean);
}

function tokenWeight(text: string) {
  return Math.max(2, graphemeCount(text));
}

function distributeStarts(tokens: string[], start: number, end: number) {
  if (tokens.length === 0) return [];
  if (tokens.length === 1) return [start];

  const available = Math.max(0.16, end - start);
  const usable = Math.max(0.1, available - Math.min(0.16, available * 0.1));
  const weights = tokens.map(tokenWeight);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let consumed = 0;

  return tokens.map((_, index) => {
    const value = start + (consumed / total) * usable;
    consumed += weights[index];
    return value;
  });
}

interface ParsedEntry {
  start: number;
  text: string;
}

interface RawEntry {
  start: number;
  text: string;
}

interface Segment {
  start: number | null;
  text: string;
}

function extractSegments(text: string, lineStart: number, offset: number) {
  const segments: Segment[] = [];
  let cursor = 0;
  let currentStart: number | null = null;
  let found = false;

  WORD_TAG.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = WORD_TAG.exec(text))) {
    found = true;
    const before = text.slice(cursor, match.index);
    if (before.trim()) {
      segments.push({ start: currentStart ?? lineStart, text: before });
    }
    currentStart = Math.max(0, parseTagTime(match[1], match[2], match[3]) + offset);
    cursor = match.index + match[0].length;
  }

  const tail = text.slice(cursor);
  if (tail.trim()) {
    segments.push({ start: currentStart ?? lineStart, text: tail });
  }

  return { segments, found };
}

function makeLineWords(
  lineIndex: number,
  tokens: string[],
  starts: number[],
): TimedWord[] {
  return tokens.map((text, index) => ({
    id: `w-${lineIndex}-${index}`,
    text,
    start: Math.max(0, starts[index] ?? 0),
    end: 0,
    line: lineIndex,
  }));
}

function buildDocFromEntries(
  entries: ParsedEntry[],
  meta: Record<string, string>,
  wordLevel: boolean,
  sourceLabel: string,
  source: LyricsDoc["source"] = "lrc",
  offset = 0,
): LyricsDoc {
  const lines: LyricLine[] = [];
  const flat: TimedWord[] = [];

  for (let lineIndex = 0; lineIndex < entries.length; lineIndex += 1) {
    const entry = entries[lineIndex];
    const nextStart = entries[lineIndex + 1]?.start;
    const { segments, found } = extractSegments(entry.text, entry.start, offset);

    let lineWords: TimedWord[] = [];

    if (found && segments.length > 0) {
      for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
        const segment = segments[segmentIndex];
        const segmentStart = Math.max(0, segment.start ?? entry.start);
        const nextSegment = segments[segmentIndex + 1];
        const segmentEnd = nextSegment?.start ?? nextStart ?? segmentStart + 3;
        const tokens = splitDisplayWords(segment.text);
        const starts = distributeStarts(
          tokens,
          segmentStart,
          Math.max(segmentStart + 0.12, segmentEnd),
        );
        const words = makeLineWords(lineIndex, tokens, starts);
        lineWords.push(...words);
      }
    } else {
      const tokens = splitDisplayWords(entry.text);
      const estimatedEnd =
        entry.start + Math.max(1.4, tokens.length * 0.62);
      const end = nextStart
        ? Math.min(nextStart - 0.02, estimatedEnd)
        : estimatedEnd;
      const starts = distributeStarts(tokens, entry.start, Math.max(entry.start + 0.12, end));
      lineWords = makeLineWords(lineIndex, tokens, starts);
    }

    if (lineWords.length === 0) continue;

    const line: LyricLine = {
      index: lines.length,
      start: lineWords[0].start,
      end: 0,
      words: lineWords,
    };
    for (const word of line.words) {
      word.line = line.index;
      word.id = `w-${line.index}-${flat.length}`;
      flat.push(word);
    }
    lines.push(line);
  }

  for (let index = 0; index < flat.length; index += 1) {
    const word = flat[index];
    const next = flat[index + 1];
    word.end = next ? Math.max(word.start + 0.04, next.start) : word.start + 4;
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const next = lines[index + 1];
    line.start = line.words[0].start;
    line.end = next ? next.start : line.words[line.words.length - 1].end;
  }

  return {
    title: meta.ti,
    artist: meta.ar,
    album: meta.al,
    source,
    sourceLabel,
    words: flat,
    lines,
    wordLevel,
    approximate: !wordLevel,
    edited: false,
    lrclibId: meta.id ? Number(meta.id) : undefined,
  };
}

export function parseLrc(text: string): LyricsDoc {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const rawEntries: RawEntry[] = [];
  const meta: Record<string, string> = {};

  for (const rawLine of normalized.split("\n")) {
    let rest = rawLine.trim();
    if (!rest) continue;

    const times: number[] = [];

    while (rest.startsWith("[")) {
      const close = rest.indexOf("]");
      if (close === -1) break;
      const inside = rest.slice(1, close);

      const time = parseTimeTag(inside);
      if (time !== null) {
        times.push(time);
        rest = rest.slice(close + 1).trimStart();
        continue;
      }

      const colon = inside.indexOf(":");
      if (colon > 0) {
        const key = inside.slice(0, colon).trim().toLowerCase();
        if (key && !/^\d+$/.test(key)) {
          meta[key] = inside.slice(colon + 1).trim();
          rest = rest.slice(close + 1).trimStart();
          continue;
        }
      }
      break;
    }

    if (times.length === 0) continue;
    if (!HAS_LETTER.test(rest)) continue;

    for (const start of times) {
      rawEntries.push({ start, text: rest });
    }
  }

  const offsetMs = Number(meta.offset || 0);
  const offset = Number.isFinite(offsetMs) ? offsetMs / 1000 : 0;

  const entries = rawEntries
    .map((entry) => ({ ...entry, start: Math.max(0, entry.start + offset) }))
    .sort((a, b) => a.start - b.start);

  const enhanced = entries.some((entry) => {
    WORD_TAG.lastIndex = 0;
    return WORD_TAG.test(entry.text);
  });

  return buildDocFromEntries(entries, meta, enhanced, "LRC file", "lrc", offset);
}

function formatLrcStamp(seconds: number) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const centis = Math.floor((safe - Math.floor(safe)) * 100);
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
}

export function parsePlainLyrics(text: string, duration?: number): LyricsDoc {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const rawLines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && HAS_LETTER.test(line));

  if (rawLines.length === 0) {
    return buildDocFromEntries([], {}, false, "Pasted lyrics", "plain");
  }

  const lineWeights = rawLines.map((line) => {
    const words = Math.max(1, splitDisplayWords(line).length);
    return words * 0.72 + 0.55;
  });
  const totalWeight = lineWeights.reduce((sum, weight) => sum + weight, 0);
  const estimatedDuration =
    duration && Number.isFinite(duration) && duration > 2
      ? duration * 0.94
      : totalWeight + rawLines.length * 0.35;
  const usable = Math.max(2, estimatedDuration);

  let cursor = 0.35;
  const lrcLines = rawLines.map((line, index) => {
    const share = (lineWeights[index] / totalWeight) * usable;
    const stamp = formatLrcStamp(cursor);
    cursor += share + 0.25;
    return `[${stamp}]${line}`;
  });

  const doc = parseLrc(lrcLines.join("\n"));
  return {
    ...doc,
    source: "plain",
    sourceLabel: "Pasted lyrics",
    approximate: true,
    wordLevel: false,
  };
}

export function emptyDocument(): LyricsDoc {
  return {
    source: "manual",
    sourceLabel: "No lyrics",
    words: [],
    lines: [],
    wordLevel: false,
    approximate: false,
    edited: false,
  };
}

export function normalizeDocEnds(doc: LyricsDoc): LyricsDoc {
  const words = [...doc.words];
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    const next = words[index + 1];
    word.end = next ? Math.max(word.start + 0.04, next.start) : word.start + 4;
  }

  const lines = doc.lines.map((line, index) => {
    const lineWords = words.filter((word) => word.line === index);
    return {
      ...line,
      index,
      words: lineWords,
      start: lineWords[0]?.start ?? line.start,
      end:
        lineWords[lineWords.length - 1]?.end ??
        doc.lines[index + 1]?.start ??
        line.end,
    };
  });

  return { ...doc, words, lines };
}
