import { useEffect, useRef, startTransition } from "react";
import { useLiveSessionStore } from "@/app/stores/liveSession";
import { liveProvider } from "@/app/lib/live-timing-provider";

const FAST_POLL_MS = 5_000;
const SLOW_POLL_MS = 15_000;

export function useLivePolling() {
  const fastPollingRef = useRef(false);
  const slowPollingRef = useRef(false);
  const fastTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slowTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchFastRef = useRef<(() => void) | null>(null);
  const fetchSlowRef = useRef<(() => void) | null>(null);
  const isLiveRef = useRef(false);

  const sessions = useLiveSessionStore((s) => s.sessions);
  const selectedSessionKey = useLiveSessionStore((s) => s.selectedSessionKey);
  const selectedDriverNumber = useLiveSessionStore(
    (s) => s.selectedDriverNumber,
  );
  const loadSessions = useLiveSessionStore((s) => s.loadSessions);
  const loadSessionData = useLiveSessionStore((s) => s.loadSessionData);
  const loadDriverLaps = useLiveSessionStore((s) => s.loadDriverLaps);
  const clearDriverLaps = useLiveSessionStore((s) => s.clearDriverLaps);
  const setFastPollData = useLiveSessionStore((s) => s.setFastPollData);
  const setSlowPollData = useLiveSessionStore((s) => s.setSlowPollData);

  // Load available sessions on mount
  useEffect(() => {
    const abortController = new AbortController();
    loadSessions(abortController.signal);
    return () => abortController.abort();
  }, [loadSessions]);

  // Load full session data + set up polling when session changes
  useEffect(() => {
    if (!selectedSessionKey) return;

    const abortController = new AbortController();
    const signal = abortController.signal;

    async function fetchFastUpdates() {
      if (fastPollingRef.current || signal.aborted) return;
      fastPollingRef.current = true;
      try {
        const [positionsData, lapsData, intervalsData, stintsData] =
          await Promise.all([
            liveProvider.getPositions(selectedSessionKey!, { signal }),
            liveProvider.getLaps(selectedSessionKey!, undefined, { signal }),
            liveProvider.getIntervals(selectedSessionKey!, { signal }).catch(() => []),
            liveProvider.getStints(selectedSessionKey!, { signal }),
          ]);
        if (signal.aborted) return;
        startTransition(() => {
          setFastPollData({
            positions: positionsData,
            laps: lapsData,
            intervals: intervalsData,
            stints: stintsData,
          });
        });
      } catch {
        // Silently fail on polling errors
      } finally {
        fastPollingRef.current = false;
      }
    }

    async function fetchSlowUpdates() {
      if (slowPollingRef.current || signal.aborted) return;
      slowPollingRef.current = true;
      try {
        const [rcData, radioData, weatherData, pitsData] = await Promise.all([
          liveProvider.getRaceControl(selectedSessionKey!, { signal }).catch(() => []),
          liveProvider.getTeamRadio(selectedSessionKey!, undefined, { signal }).catch(
            () => [],
          ),
          liveProvider.getWeather(selectedSessionKey!, { signal }).catch(() => []),
          liveProvider.getPitStops(selectedSessionKey!, { signal }),
        ]);
        if (signal.aborted) return;
        startTransition(() => {
          setSlowPollData({
            raceControl: rcData,
            teamRadio: radioData,
            weather: weatherData,
            pitStops: pitsData,
          });
        });
      } catch {
        // Silently fail
      } finally {
        slowPollingRef.current = false;
      }
    }

    // Store fetch functions in refs so visibility handler can access them
    fetchFastRef.current = fetchFastUpdates;
    fetchSlowRef.current = fetchSlowUpdates;

    function startTimers() {
      if (fastTimerRef.current) clearInterval(fastTimerRef.current);
      if (slowTimerRef.current) clearInterval(slowTimerRef.current);
      fastTimerRef.current = setInterval(fetchFastUpdates, FAST_POLL_MS);
      slowTimerRef.current = setInterval(fetchSlowUpdates, SLOW_POLL_MS);
    }

    function stopTimers() {
      if (fastTimerRef.current) { clearInterval(fastTimerRef.current); fastTimerRef.current = null; }
      if (slowTimerRef.current) { clearInterval(slowTimerRef.current); slowTimerRef.current = null; }
    }

    loadSessionData(selectedSessionKey, signal).then(() => {
      if (signal.aborted) return;

      const currentSession = sessions.find(
        (s) => s.session_key === selectedSessionKey,
      );

      // Only poll if session is currently live (started but not ended)
      const now = Date.now();
      const sessionStart = currentSession
        ? new Date(currentSession.date_start).getTime()
        : 0;
      const sessionEnd = currentSession?.date_end
        ? new Date(currentSession.date_end).getTime()
        : sessionStart + 4 * 60 * 60 * 1000; // default 4h window
      const isLive = now >= sessionStart && now <= sessionEnd;
      isLiveRef.current = isLive;

      if (isLive && !document.hidden) {
        startTimers();
      }
    });

    // Pause polling when tab is hidden, resume when visible
    function handleVisibilityChange() {
      if (signal.aborted || !isLiveRef.current) return;
      if (document.hidden) {
        stopTimers();
      } else {
        startTimers();
        // Fetch immediately on resume to catch up
        fetchFastUpdates();
        fetchSlowUpdates();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      abortController.abort();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopTimers();
      isLiveRef.current = false;
      fastPollingRef.current = false;
      slowPollingRef.current = false;
    };
  }, [
    selectedSessionKey,
    sessions,
    loadSessionData,
    setFastPollData,
    setSlowPollData,
  ]);

  // Fetch laps for selected driver
  useEffect(() => {
    if (!selectedSessionKey || selectedDriverNumber === null) {
      clearDriverLaps();
      return;
    }

    const abortController = new AbortController();
    loadDriverLaps(
      selectedSessionKey,
      selectedDriverNumber,
      abortController.signal,
    );

    return () => abortController.abort();
  }, [selectedSessionKey, selectedDriverNumber, loadDriverLaps, clearDriverLaps]);
}
