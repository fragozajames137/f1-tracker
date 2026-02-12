"use client";

import { useState, useEffect, useMemo, useRef, startTransition } from "react";
import type {
  OpenF1Session,
  OpenF1Driver,
  OpenF1Position,
  OpenF1Lap,
  OpenF1Pit,
  OpenF1Interval,
  OpenF1RaceControl,
  OpenF1Weather,
  OpenF1Stint,
  DriverWithDetails,
} from "@/app/types/openf1";
import {
  getSessions,
  getSessionDrivers,
  getPositions,
  getLaps,
  getPitStops,
  getIntervals,
  getRaceControl,
  getWeather,
  getStints,
} from "@/app/lib/openf1";

import SessionSelector from "./SessionSelector";
import PositionTable from "./PositionTable";
import LapTimesPanel from "./LapTimesPanel";
import PitStopsPanel from "./PitStopsPanel";
import RaceControlFeed from "./RaceControlFeed";
import WeatherBar from "./WeatherBar";

const CURRENT_YEAR = 2026;
const FAST_POLL_MS = 5_000;
const SLOW_POLL_MS = 15_000;

export default function LiveDashboard() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [sessions, setSessions] = useState<OpenF1Session[]>([]);
  const [selectedSessionKey, setSelectedSessionKey] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drivers, setDrivers] = useState<OpenF1Driver[]>([]);
  const [positions, setPositions] = useState<OpenF1Position[]>([]);
  const [laps, setLaps] = useState<OpenF1Lap[]>([]);
  const [pitStops, setPitStops] = useState<OpenF1Pit[]>([]);
  const [intervals, setIntervals] = useState<OpenF1Interval[]>([]);
  const [raceControl, setRaceControl] = useState<OpenF1RaceControl[]>([]);
  const [weather, setWeather] = useState<OpenF1Weather[]>([]);
  const [stints, setStints] = useState<OpenF1Stint[]>([]);

  const [selectedDriverNumber, setSelectedDriverNumber] = useState<number | null>(null);
  const [driverLaps, setDriverLaps] = useState<OpenF1Lap[]>([]);

  // Refs for polling guards
  const fastPollingRef = useRef(false);
  const slowPollingRef = useRef(false);

  // Load sessions for selected year
  useEffect(() => {
    const abortController = new AbortController();
    setLoading(true);
    setError(null);

    getSessions(year, { signal: abortController.signal })
      .then((data) => {
        const sorted = [...data].sort(
          (a, b) =>
            new Date(b.date_start).getTime() -
            new Date(a.date_start).getTime(),
        );
        setSessions(sorted);
        setSelectedSessionKey(sorted.length > 0 ? sorted[0].session_key : null);
        setLoading(false);
      })
      .catch((err) => {
        if (abortController.signal.aborted) return;
        setError(err.message);
        setLoading(false);
      });

    return () => abortController.abort();
  }, [year]);

  // Load full session data + set up polling when session changes
  useEffect(() => {
    if (!selectedSessionKey) return;

    const abortController = new AbortController();
    const signal = abortController.signal;
    let fastTimer: ReturnType<typeof setInterval> | null = null;
    let slowTimer: ReturnType<typeof setInterval> | null = null;

    // Initial full load of all 8 endpoints
    async function loadInitialData() {
      try {
        const [
          driversData,
          positionsData,
          lapsData,
          pitsData,
          intervalsData,
          rcData,
          weatherData,
          stintsData,
        ] = await Promise.all([
          getSessionDrivers(selectedSessionKey!, { signal }),
          getPositions(selectedSessionKey!, { signal }),
          getLaps(selectedSessionKey!, undefined, { signal }),
          getPitStops(selectedSessionKey!, { signal }),
          getIntervals(selectedSessionKey!, { signal }).catch(() => []),
          getRaceControl(selectedSessionKey!, { signal }).catch(() => []),
          getWeather(selectedSessionKey!, { signal }).catch(() => []),
          getStints(selectedSessionKey!, { signal }),
        ]);

        if (signal.aborted) return;

        setDrivers(driversData);
        setPositions(positionsData);
        setLaps(lapsData);
        setPitStops(pitsData);
        setIntervals(intervalsData);
        setRaceControl(rcData);
        setWeather(weatherData);
        setStints(stintsData);
      } catch (err) {
        if (signal.aborted) return;
        console.error("Failed to fetch session data:", err);
      }
    }

    // Fast polling: positions, laps, intervals, stints (every 5s)
    async function fetchFastUpdates() {
      if (fastPollingRef.current || signal.aborted) return;
      fastPollingRef.current = true;
      try {
        const [positionsData, lapsData, intervalsData, stintsData] =
          await Promise.all([
            getPositions(selectedSessionKey!, { signal }),
            getLaps(selectedSessionKey!, undefined, { signal }),
            getIntervals(selectedSessionKey!, { signal }).catch(() => []),
            getStints(selectedSessionKey!, { signal }),
          ]);
        if (signal.aborted) return;
        startTransition(() => {
          setPositions(positionsData);
          setLaps(lapsData);
          setIntervals(intervalsData);
          setStints(stintsData);
        });
      } catch {
        // Silently fail on polling errors (including abort)
      } finally {
        fastPollingRef.current = false;
      }
    }

    // Slow polling: race control, weather, pit stops (every 15s)
    async function fetchSlowUpdates() {
      if (slowPollingRef.current || signal.aborted) return;
      slowPollingRef.current = true;
      try {
        const [rcData, weatherData, pitsData] = await Promise.all([
          getRaceControl(selectedSessionKey!, { signal }).catch(() => []),
          getWeather(selectedSessionKey!, { signal }).catch(() => []),
          getPitStops(selectedSessionKey!, { signal }),
        ]);
        if (signal.aborted) return;
        startTransition(() => {
          setRaceControl(rcData);
          setWeather(weatherData);
          setPitStops(pitsData);
        });
      } catch {
        // Silently fail
      } finally {
        slowPollingRef.current = false;
      }
    }

    // Load initial data, then start polling only after it completes
    loadInitialData().then(() => {
      if (signal.aborted) return;

      // Only poll for current year's latest session
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
    // Only re-run when the primitive values change, not on function/object identity
  }, [selectedSessionKey, year, sessions]);

  // Fetch laps for selected driver
  useEffect(() => {
    if (!selectedSessionKey || selectedDriverNumber === null) {
      setDriverLaps([]);
      return;
    }

    const abortController = new AbortController();

    getLaps(selectedSessionKey, selectedDriverNumber, {
      signal: abortController.signal,
    })
      .then(setDriverLaps)
      .catch(() => {
        if (!abortController.signal.aborted) setDriverLaps([]);
      });

    return () => abortController.abort();
  }, [selectedSessionKey, selectedDriverNumber]);

  // Memoize the combined driver data to avoid re-filtering on every render
  const driversWithDetails = useMemo((): DriverWithDetails[] => {
    const combined = drivers.map((driver) => {
      const driverPositions = positions.filter(
        (p) => p.driver_number === driver.driver_number,
      );
      const latestPosition =
        driverPositions.length > 0
          ? driverPositions[driverPositions.length - 1]
          : null;

      const driverIntervals = intervals.filter(
        (i) => i.driver_number === driver.driver_number,
      );
      const latestInterval =
        driverIntervals.length > 0
          ? driverIntervals[driverIntervals.length - 1]
          : null;

      const driverLapsAll = laps.filter(
        (l) => l.driver_number === driver.driver_number,
      );
      const latestLap =
        driverLapsAll.length > 0
          ? driverLapsAll[driverLapsAll.length - 1]
          : null;

      const driverStints = stints.filter(
        (s) => s.driver_number === driver.driver_number,
      );
      const currentStint =
        driverStints.length > 0
          ? driverStints[driverStints.length - 1]
          : null;

      return {
        driver,
        position: latestPosition,
        interval: latestInterval,
        lastLap: latestLap,
        currentStint,
      };
    });

    combined.sort((a, b) => {
      const posA = a.position?.position ?? 999;
      const posB = b.position?.position ?? 999;
      return posA - posB;
    });

    return combined;
  }, [drivers, positions, intervals, laps, stints]);

  const latestWeather = weather.length > 0 ? weather[weather.length - 1] : null;
  const selectedDriver =
    selectedDriverNumber !== null
      ? drivers.find((d) => d.driver_number === selectedDriverNumber) ?? null
      : null;

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-sm text-white/40">Loading sessions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={() => {
            setError(null);
            setLoading(true);
            getSessions(year)
              .then((data) => {
                const sorted = [...data].sort(
                  (a, b) =>
                    new Date(b.date_start).getTime() -
                    new Date(a.date_start).getTime(),
                );
                setSessions(sorted);
                setSelectedSessionKey(
                  sorted.length > 0 ? sorted[0].session_key : null,
                );
                setLoading(false);
              })
              .catch((err) => {
                setError(err.message);
                setLoading(false);
              });
          }}
          className="mt-4 cursor-pointer rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SessionSelector
        year={year}
        sessions={sessions}
        selectedSessionKey={selectedSessionKey}
        onYearChange={setYear}
        onSessionChange={setSelectedSessionKey}
      />

      {sessions.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-lg font-medium text-white/60">
            No sessions yet for {year}
          </p>
          <p className="mt-2 text-sm text-white/30">
            Try selecting a previous year, or check the{" "}
            <a
              href="/schedule"
              className="text-white/60 underline hover:text-white"
            >
              race schedule
            </a>{" "}
            for upcoming events.
          </p>
        </div>
      ) : (
        <>
          <WeatherBar weather={latestWeather} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                  Positions
                </h3>
                <PositionTable
                  drivers={driversWithDetails}
                  selectedDriverNumber={selectedDriverNumber}
                  onSelectDriver={setSelectedDriverNumber}
                />
              </div>
            </div>

            <div className="space-y-6">
              <LapTimesPanel laps={driverLaps} driver={selectedDriver} />
              <PitStopsPanel
                pitStops={pitStops}
                stints={stints}
                drivers={drivers}
              />
              <RaceControlFeed messages={raceControl} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
