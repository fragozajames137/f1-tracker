"use client";

import { memo, useRef, useState, useCallback } from "react";
import type { OpenF1TeamRadio, OpenF1Driver } from "@/app/types/openf1";

interface TeamRadioFeedProps {
  messages: OpenF1TeamRadio[];
  drivers: OpenF1Driver[];
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function RadioMessage({
  msg,
  driver,
}: {
  msg: OpenF1TeamRadio;
  driver: OpenF1Driver | undefined;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const animRef = useRef<number>(0);

  const teamColor = driver ? `#${driver.team_colour}` : "#666";
  const abbreviation = driver?.name_acronym ?? `#${msg.driver_number}`;

  const updateProgress = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.duration > 0) {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    }
    if (!audio.paused) {
      animRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play().then(() => {
        setPlaying(true);
        animRef.current = requestAnimationFrame(updateProgress);
      }).catch(() => {
        // Autoplay blocked — ignore
      });
    } else {
      audio.pause();
      setPlaying(false);
      cancelAnimationFrame(animRef.current);
    }
  }, [updateProgress]);

  const handleEnded = useCallback(() => {
    setPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    cancelAnimationFrame(animRef.current);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <div className="flex items-center gap-2">
        {/* Play/Pause button */}
        <button
          onClick={togglePlay}
          className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-white/10"
          style={{ border: `1.5px solid ${teamColor}` }}
        >
          {playing ? (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect x="1.5" y="1" width="2.5" height="8" rx="0.5" fill={teamColor} />
              <rect x="6" y="1" width="2.5" height="8" rx="0.5" fill={teamColor} />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M2.5 1 L8.5 5 L2.5 9 Z" fill={teamColor} />
            </svg>
          )}
        </button>

        {/* Driver + time */}
        <span
          className="shrink-0 text-xs font-semibold"
          style={{ color: teamColor }}
        >
          {abbreviation}
        </span>

        {/* Progress bar */}
        <div
          className="relative h-1.5 flex-1 cursor-pointer overflow-hidden rounded-full bg-white/10"
          onClick={(e) => {
            const audio = audioRef.current;
            if (!audio || !audio.duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            audio.currentTime = pct * audio.duration;
            setProgress(pct * 100);
            setCurrentTime(pct * audio.duration);
          }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-100"
            style={{
              width: `${progress}%`,
              backgroundColor: teamColor,
              opacity: 0.7,
            }}
          />
        </div>

        {/* Duration */}
        <span className="shrink-0 text-[10px] tabular-nums text-white/30" style={{ fontFamily: "'Space Mono', ui-monospace, monospace" }}>
          {duration > 0
            ? `${formatDuration(currentTime)}/${formatDuration(duration)}`
            : formatTime(msg.date)}
        </span>
      </div>

      <audio
        ref={audioRef}
        src={msg.recording_url}
        preload="none"
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMetadata}
      />
    </div>
  );
}

export default memo(function TeamRadioFeed({
  messages,
  drivers,
}: TeamRadioFeedProps) {
  const recent = [...messages].reverse().slice(0, 30);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
        Team Radio
      </h3>
      {recent.length === 0 ? (
        <p className="text-sm text-white/30">No radio messages</p>
      ) : (
        <div className="max-h-[300px] space-y-2 overflow-y-auto">
          {recent.map((msg, i) => (
            <RadioMessage
              key={`${msg.date}-${msg.driver_number}-${i}`}
              msg={msg}
              driver={drivers.find(
                (d) => d.driver_number === msg.driver_number,
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
});
