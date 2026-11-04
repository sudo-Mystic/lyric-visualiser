import { useCallback, useEffect, useRef, useState } from "react";
import {
  LiveClock,
  fetchNowPlaying,
  isPlaying,
  pickActiveSession,
  sessionKey,
  type MediaSession,
} from "../lib/nowPlaying";

export type BridgeStatus = "checking" | "online" | "offline" | "unsupported";

export function useNowPlaying(enabled = true) {
  const clockRef = useRef<LiveClock>(new LiveClock());
  const preferredKeyRef = useRef<string>("");
  const activeKeyRef = useRef<string>("");
  const sessionsRef = useRef<MediaSession[]>([]);
  const failuresRef = useRef(0);
  const mountedRef = useRef(true);
  const hasConnectedRef = useRef(false);

  const [sessions, setSessions] = useState<MediaSession[]>([]);
  const [activeKey, setActiveKey] = useState("");
  const [status, setStatus] = useState<BridgeStatus>("checking");
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const activeSession =
    sessions.find((session) => sessionKey(session) === activeKey) ??
    (sessions.length > 0 ? sessions[0] : null);

  const applySessions = useCallback((nextSessions: MediaSession[], force = false) => {
    sessionsRef.current = nextSessions;
    const chosen = pickActiveSession(
      nextSessions,
      preferredKeyRef.current,
      activeKeyRef.current,
    );
    if (chosen) {
      clockRef.current.apply(chosen, force);
      const key = sessionKey(chosen);
      if (key !== activeKeyRef.current) {
        activeKeyRef.current = key;
        setActiveKey(key);
      }
    } else {
      clockRef.current.reset();
      activeKeyRef.current = "";
      setActiveKey("");
    }
    setSessions(nextSessions);
    setLastUpdate(Date.now());
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) {
      setStatus("offline");
      return () => {
        mountedRef.current = false;
      };
    }

    let timer: number | null = null;
    let cancelled = false;
    if (!hasConnectedRef.current) setStatus("checking");

    const poll = async () => {
      try {
        const payload = await fetchNowPlaying();
        if (cancelled || !mountedRef.current) return;

        if (!payload.supported) {
          failuresRef.current = 0;
          setStatus("unsupported");
          setError(payload.error || "Windows media API is unavailable.");
          applySessions([], false);
          return;
        }

        failuresRef.current = 0;
        hasConnectedRef.current = true;
        setStatus("online");
        setError(null);
        applySessions(payload.sessions, false);
      } catch (pollError) {
        if (cancelled || !mountedRef.current) return;
        failuresRef.current += 1;
        setError(
          pollError instanceof Error ? pollError.message : "Could not reach the local bridge.",
        );
        if (hasConnectedRef.current || failuresRef.current >= 2) {
          setStatus("offline");
        } else {
          setStatus("checking");
        }
      } finally {
        if (!cancelled && mountedRef.current) {
          timer = window.setTimeout(poll, failuresRef.current > 0 ? 1100 : 1900);
        }
      }
    };

    void poll();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void poll();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      mountedRef.current = false;
      document.removeEventListener("visibilitychange", onVisibility);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [enabled, refreshNonce, applySessions]);

  const chooseSession = useCallback(
    (session: MediaSession) => {
      preferredKeyRef.current = sessionKey(session);
      clockRef.current.apply(session, true);
      activeKeyRef.current = sessionKey(session);
      setActiveKey(activeKeyRef.current);
      setSessions((current) => [...current]);
    },
    [],
  );

  const refresh = useCallback(() => {
    setRefreshNonce((value) => value + 1);
  }, []);

  const getLiveTime = useCallback(() => clockRef.current.getTime(), []);

  return {
    sessions,
    activeSession,
    activeKey,
    status,
    error,
    lastUpdate,
    isPlaying: isPlaying(activeSession),
    chooseSession,
    refresh,
    getLiveTime,
    clock: clockRef.current,
  };
}

export type NowPlaying = ReturnType<typeof useNowPlaying>;
