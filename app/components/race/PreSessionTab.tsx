"use client";

import { useState, useEffect } from "react";
import type { Race } from "@/app/types";
import { CIRCUIT_TIMEZONES } from "@/app/lib/circuit-timezones";
import SessionTime from "../SessionTime";

interface SessionInfo {
  sessionKey: number;
  sessionType: string;
  sessionName: string;
  startDate: string | null;
  endDate: string | null;
  gmtOffset: string | null;
  totalLaps: number | null;
  ingestedAt: string | null;
  meetingKey: number;
  meetingName: string;
  round: number;
  location: string | null;
  country: string | null;
  circuit: string | null;
}

interface DriverResult {
  abbreviation: string;
  teamColor: string | null;
  gridPosition: number | null;
  finalPosition: number | null;
  bestLapTime: string | null;
  fullName: string | null;
}

interface PreSessionTabProps {
  race: Race | null;
  sessions: SessionInfo[];
  qualiSessionKey: number | null;
  year: number;
}

export default function PreSessionTab({ race, sessions, qualiSessionKey, year }: PreSessionTabProps) {
  const [qualiResults, setQualiResults] = useState<DriverResult[] | null>(null);
  const [practiceResults, setPracticeResults] = useState<Map<string, DriverResult[]>>(new Map());
  const [weather, setWeather] = useState<{
    airTemp: number | null;
    trackTemp: number | null;
    humidity: number | null;
    rainfall: boolean | number | null;
    windSpeed: number | null;
    windDirection: number | null;
    pressure: number | null;
  } | null>(null);

  const circuitTz = race ? CIRCUIT_TIMEZONES[race.Circuit.circuitId] : undefined;

  // Fetch qualifying results for starting grid
  useEffect(() => {
    if (!qualiSessionKey) return;
    const ac = new AbortController();
    fetch(`/api/sessions/${qualiSessionKey}`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (ac.signal.aborted) return;
        if (data?.drivers) {
          setQualiResults(
            [...data.drivers].sort(
              (a: DriverResult, b: DriverResult) =>
                (a.finalPosition ?? 99) - (b.finalPosition ?? 99),
            ),
          );
        }
      })
      .catch(() => {});
    return () => ac.abort();
  }, [qualiSessionKey]);

  // Fetch practice session top-5 results
  useEffect(() => {
    const ac = new AbortController();
    const practiceSessions = sessions.filter(
      (s) => s.sessionType.startsWith("Practice") && s.ingestedAt,
    );
    for (const ps of practiceSessions) {
      fetch(`/api/sessions/${ps.sessionKey}`, { signal: ac.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (ac.signal.aborted) return;
          if (data?.drivers) {
            setPracticeResults((prev) => {
              const next = new Map(prev);
              next.set(
                ps.sessionName,
                [...data.drivers]
                  .sort(
                    (a: DriverResult, b: DriverResult) =>
                      (a.finalPosition ?? 99) - (b.finalPosition ?? 99),
                  )
                  .slice(0, 5),
              );
              return next;
            });
          }
        })
        .catch(() => {});
    }
    return () => ac.abort();
  }, [sessions]);

  // Fetch latest weather
  useEffect(() => {
    const latestIngestedSession = [...sessions]
      .filter((s) => s.ingestedAt)
      .sort((a, b) => {
        const da = a.startDate ? new Date(a.startDate).getTime() : 0;
        const db = b.startDate ? new Date(b.startDate).getTime() : 0;
        return db - da;
      })[0];
    if (!latestIngestedSession) return;

    const ac = new AbortController();
    fetch(`/api/sessions/${latestIngestedSession.sessionKey}/weather`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (ac.signal.aborted) return;
        if (Array.isArray(data) && data.length > 0) {
          setWeather(data[data.length - 1]);
        }
      })
      .catch(() => {});
    return () => ac.abort();
  }, [sessions]);

  // Build session schedule from Jolpica data
  const schedule: { label: string; date: string; time: string }[] = [];
  if (race) {
    if (race.FirstPractice) schedule.push({ label: "FP1", ...race.FirstPractice });
    if (race.SecondPractice) schedule.push({ label: "FP2", ...race.SecondPractice });
    if (race.SprintQualifying) schedule.push({ label: "Sprint Qualifying", ...race.SprintQualifying });
    if (race.ThirdPractice) schedule.push({ label: "FP3", ...race.ThirdPractice });
    if (race.Sprint) schedule.push({ label: "Sprint", ...race.Sprint });
    if (race.Qualifying) schedule.push({ label: "Qualifying", ...race.Qualifying });
    schedule.push({ label: "Race", date: race.date, time: race.time });
  }

  return (
    <div className="space-y-6">
      {/* Circuit info */}
      {race && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
            Circuit
          </h3>
          <div className="space-y-1">
            <p className="text-white">{race.Circuit.circuitName}</p>
            <p className="text-sm text-white/40">
              {race.Circuit.Location.locality}, {race.Circuit.Location.country}
            </p>
          </div>
        </div>
      )}

      {/* Session schedule */}
      {schedule.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
            Session Schedule
          </h3>
          <div className="divide-y divide-white/5">
            {schedule.map((s) => (
              <SessionTime
                key={s.label}
                label={s.label}
                date={s.date}
                time={s.time}
                circuitTimezone={circuitTz}
              />
            ))}
          </div>
        </div>
      )}

      {/* Weather */}
      {weather && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
            Latest Conditions
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {weather.airTemp !== null && (
              <div>
                <p className="text-xs text-white/30">Air Temp</p>
                <p className="text-lg font-semibold text-white">{weather.airTemp.toFixed(1)}°C</p>
              </div>
            )}
            {weather.trackTemp !== null && (
              <div>
                <p className="text-xs text-white/30">Track Temp</p>
                <p className="text-lg font-semibold text-white">{weather.trackTemp.toFixed(1)}°C</p>
              </div>
            )}
            {weather.humidity !== null && (
              <div>
                <p className="text-xs text-white/30">Humidity</p>
                <p className="text-lg font-semibold text-white">{weather.humidity.toFixed(0)}%</p>
              </div>
            )}
            <div>
              <p className="text-xs text-white/30">Rainfall</p>
              <p className="text-lg font-semibold text-white">
                {weather.rainfall ? "Yes" : "No"}
              </p>
            </div>
            {weather.windSpeed !== null && (
              <div>
                <p className="text-xs text-white/30">Wind</p>
                <p className="text-lg font-semibold text-white">
                  {weather.windSpeed.toFixed(1)} km/h
                  {weather.windDirection !== null && (
                    <span className="ml-1 text-xs text-white/40">{weather.windDirection}°</span>
                  )}
                </p>
              </div>
            )}
            {weather.pressure !== null && (
              <div>
                <p className="text-xs text-white/30">Pressure</p>
                <p className="text-lg font-semibold text-white">{weather.pressure.toFixed(0)} hPa</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Starting Grid (from qualifying) */}
      {qualiResults && qualiResults.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
            Starting Grid
          </h3>
          <div className="space-y-1">
            {qualiResults.map((d, i) => (
              <div key={d.abbreviation} className="flex items-center gap-3 py-1">
                <span className="w-6 text-right font-mono text-xs text-white/30">
                  {i + 1}
                </span>
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: d.teamColor ? `#${d.teamColor}` : "#666" }}
                />
                <span className="font-medium text-white">{d.abbreviation}</span>
                <span className="text-sm text-white/30">
                  {d.bestLapTime ?? ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Practice results summary */}
      {practiceResults.size > 0 && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
            Practice Results (Top 5)
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from(practiceResults.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([name, drivers]) => (
                <div key={name}>
                  <h4 className="mb-2 text-xs font-semibold text-white/60">{name}</h4>
                  <div className="space-y-1">
                    {drivers.map((d, i) => (
                      <div key={d.abbreviation} className="flex items-center gap-2 text-sm">
                        <span className="w-4 text-right font-mono text-xs text-white/30">
                          {i + 1}
                        </span>
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: d.teamColor ? `#${d.teamColor}` : "#666" }}
                        />
                        <span className="text-white/70">{d.abbreviation}</span>
                        <span className="ml-auto font-mono text-xs text-white/30">
                          {d.bestLapTime ?? "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!race && sessions.length === 0 && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-sm text-white/40">
            No pre-session data available for this race yet.
          </p>
        </div>
      )}
    </div>
  );
}
