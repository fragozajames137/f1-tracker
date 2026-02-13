import { useEffect, useRef, startTransition } from "react";
import { useLiveSessionStore } from "@/app/stores/liveSession";
import { liveProvider } from "@/app/lib/live-timing-provider";

const CURRENT_YEAR = 2026;
const FAST_POLL_MS = 5_000;
const SLOW_POLL_MS = 15_000;

export function useLivePolling() {
  const fastPollingRef = useRef(false);
  const slowPollingRef = useRef(false);

  const year = useLiveSessionStore((s) => s.year);
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

  // Load sessions for selected year
  useEffect(() => {
    const abortController = new AbortController();
    loadSessions(year, abortController.signal);
    return () => abortController.abort();
  }, [year, loadSessions]);

  // Load full session data + set up polling when session changes
  useEffect(() => {
    if (!selectedSessionKey) return;

    const abortController = new AbortController();
    const signal = abortController.signal;
    let fastTimer: ReturnType<typeof setInterval> | null = null;
    let slowTimer: ReturnType<typeof setInterval> | null = null;

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

    loadSessionData(selectedSessionKey, signal).then(() => {
      if (signal.aborted) return;

      const isCurrentYear = year === CURRENT_YEAR;
      const isLatestSession =
        sessions.length > 0 &&
        sessions[0].session_key === selectedSessionKey;

      if (isCurrentYear && isLatestSession) {
        fastTimer = setInterval(fetchFastUpdates, FAST_POLL_MS);
        slowTimer = setInterval(fetchSlowUpdates, SLOW_POLL_MS);
      }
    });

    return () => {
      abortController.abort();
      if (fastTimer) clearInterval(fastTimer);
      if (slowTimer) clearInterval(slowTimer);
      fastPollingRef.current = false;
      slowPollingRef.current = false;
    };
  }, [
    selectedSessionKey,
    year,
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
