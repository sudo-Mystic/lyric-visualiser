import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Music2, Search, TriangleAlert } from "lucide-react";
import {
  chooseBestResult,
  resultToDoc,
  searchLyricsSmart,
  type LyricsQuery,
} from "../lib/lyrics";
import { formatTimeShort } from "../lib/timing";
import type { LyricsDoc, SearchResult } from "../lib/types";
import { Badge, Button, cn, Dialog, inputClass, Label } from "./ui";

interface LyricsSearchDialogProps {
  open: boolean;
  onClose: () => void;
  initialQuery: LyricsQuery;
  trackKey?: string;
  onSelectDoc: (doc: LyricsDoc) => void;
}

export function LyricsSearchDialog({
  open,
  onClose,
  initialQuery,
  trackKey,
  onSelectDoc,
}: LyricsSearchDialogProps) {
  const [title, setTitle] = useState(initialQuery.title ?? "");
  const [artist, setArtist] = useState(initialQuery.artist ?? "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const wasOpenRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialTitle = initialQuery.title ?? "";
  const initialArtist = initialQuery.artist ?? "";

  const runSearch = useCallback(async (query: LyricsQuery) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    setResults([]);
    setSearched(true);

    try {
      const found = await searchLyricsSmart(query, controller.signal);
      if (controller.signal.aborted) return;
      setResults(found);
    } catch (searchError) {
      if (controller.signal.aborted) return;
      setError(
        searchError instanceof Error ? searchError.message : "The lyrics search failed.",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      abortRef.current?.abort();
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;

    setTitle(initialTitle);
    setArtist(initialArtist);
    setError(null);
    setResults([]);
    setSearched(false);
    inputRef.current?.focus();

    if (initialTitle.trim() || initialArtist.trim()) {
      void runSearch({
        title: initialTitle,
        artist: initialArtist,
        duration: initialQuery.duration,
      });
    }
  }, [open, initialTitle, initialArtist, initialQuery.duration, runSearch]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [open]);

  const submit = () => {
    if (!title.trim() && !artist.trim()) {
      setError("Enter a track title or artist.");
      return;
    }
    void runSearch({ title, artist, duration: initialQuery.duration });
  };

  const query: LyricsQuery = {
    title,
    artist,
    duration: initialQuery.duration,
  };
  const best = chooseBestResult(results, query);

  const useResult = (result: SearchResult) => {
    const doc = resultToDoc(result, {
      trackKey,
      fallbackDuration: initialQuery.duration,
    });
    if (!doc) {
      setError("That result has no usable lyric text. Try another version.");
      return;
    }
    onSelectDoc(doc);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      eyebrow="LRCLIB"
      title="Find synced lyrics"
      width="lg"
      footer={
        <>
          <span className="mr-auto hidden font-mono text-[9px] uppercase tracking-[0.1em] text-dim sm:inline">
            Community library · no API key
          </span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.72fr)_auto]"
        >
          <div>
            <Label htmlFor="search-title">Track</Label>
            <input
              id="search-title"
              ref={inputRef}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Arz Kiya Hai"
              className={inputClass}
              spellCheck={false}
            />
          </div>
          <div>
            <Label htmlFor="search-artist">Artist</Label>
            <input
              id="search-artist"
              value={artist}
              onChange={(event) => setArtist(event.target.value)}
              placeholder="Anuv Jain"
              className={inputClass}
              spellCheck={false}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="submit"
              variant="primary"
              className="h-9 w-full sm:w-auto"
              disabled={loading || (!title.trim() && !artist.trim())}
              icon={loading ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
            >
              Search
            </Button>
          </div>
        </form>

        {initialQuery.duration ? (
          <div className="flex items-center gap-2 rounded border border-edge/60 bg-white/[0.02] px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-dim">
            <span className="size-1 rounded-full bg-blood/60" />
            Matching against {formatTimeShort(initialQuery.duration)} reference duration
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-400/20 bg-amber-400/[0.05] px-3 py-2 text-[11px] leading-relaxed text-amber-200/90">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-1.5">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="h-[62px] animate-pulse rounded-md border border-edge/60 bg-white/[0.02]"
                style={{ animationDelay: `${index * 80}ms` }}
              />
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-1.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-dim">
                {results.length} result{results.length === 1 ? "" : "s"}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-dim">
                Synced preferred
              </span>
            </div>
            {results.map((result) => {
              const isBest = best?.id === result.id;
              const hasLyrics = Boolean(result.syncedLyrics || result.plainLyrics);
              return (
                <div
                  key={result.id}
                  className={cn(
                    "flex items-center gap-3 rounded-md border px-3 py-2.5 transition-colors",
                    isBest
                      ? "border-blood/25 bg-blood/[0.045]"
                      : "border-edge/70 bg-white/[0.02] hover:border-white/20",
                  )}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded bg-white/[0.04] text-muted">
                    <Music2 className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[12px] font-semibold text-bone">
                        {result.trackName}
                      </span>
                      {isBest ? <Badge tone="red">Best</Badge> : null}
                    </div>
                    <div className="truncate text-[10px] text-muted">
                      {result.artistName}
                      {result.albumName ? (
                        <span className="text-dim"> · {result.albumName}</span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {result.syncedLyrics ? (
                        <Badge tone="green">Synced</Badge>
                      ) : result.plainLyrics ? (
                        <Badge tone="amber">Plain</Badge>
                      ) : (
                        <Badge>No text</Badge>
                      )}
                      {result.instrumental ? <Badge>Instrumental</Badge> : null}
                      <span className="ml-1 font-mono text-[9px] tabular-nums text-dim">
                        {formatTimeShort(result.duration)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant={isBest ? "primary" : "secondary"}
                    size="sm"
                    disabled={!hasLyrics}
                    onClick={() => useResult(result)}
                  >
                    Use
                  </Button>
                </div>
              );
            })}
          </div>
        ) : searched ? (
          <div className="rounded-md border border-dashed border-edge px-4 py-8 text-center">
            <Music2 className="mx-auto mb-2 size-4 text-dim" />
            <div className="text-[11px] font-medium text-muted">No matches found</div>
            <p className="mx-auto mt-1 max-w-[300px] text-[10px] leading-relaxed text-dim">
              Try a shorter title, remove the artist, or paste an LRC file from the lyrics panel.
            </p>
          </div>
        ) : (
          <div className="rounded-md border border-edge/60 bg-white/[0.015] px-4 py-7 text-center">
            <Search className="mx-auto mb-2 size-4 text-dim" />
            <div className="text-[11px] font-medium text-muted">Search the LRCLIB library</div>
            <p className="mx-auto mt-1 max-w-[320px] text-[10px] leading-relaxed text-dim">
              Results with synced lines keep the visual locked to the song. Plain lyrics are
              distributed into estimated timings.
            </p>
          </div>
        )}
      </div>
    </Dialog>
  );
}
