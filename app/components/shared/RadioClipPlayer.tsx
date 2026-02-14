"use client";

import { memo, useRef, useState, useCallback } from "react";

interface RadioClipPlayerProps {
  audioUrl: string;
  abbreviation: string;
  teamColor: string;
  label?: string;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default memo(function RadioClipPlayer({
  audioUrl,
  abbreviation,
  teamColor,
  label,
}: RadioClipPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play().then(() => {
        setPlaying(true);
      }).catch(() => {
        // Autoplay blocked
      });
    } else {
      audio.pause();
      setPlaying(false);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    setCurrentTime(audio.currentTime);
    setProgress((audio.currentTime / audio.duration) * 100);
  }, []);

  const handleEnded = useCallback(() => {
    setPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * audio.duration;
    setProgress(pct * 100);
    setCurrentTime(pct * audio.duration);
  }, []);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        {/* Play/Pause button */}
        <button
          onClick={togglePlay}
          aria-label={`${playing ? "Pause" : "Play"} radio from ${abbreviation}`}
          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-white/10"
          style={{ border: `1.5px solid ${teamColor}` }}
        >
          {playing ? (
            <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10">
              <rect x="1.5" y="1" width="2.5" height="8" rx="0.5" fill={teamColor} />
              <rect x="6" y="1" width="2.5" height="8" rx="0.5" fill={teamColor} />
            </svg>
          ) : (
            <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10">
              <path d="M2.5 1 L8.5 5 L2.5 9 Z" fill={teamColor} />
            </svg>
          )}
        </button>

        {/* Driver abbreviation */}
        <span
          className="w-9 shrink-0 text-xs font-semibold"
          style={{ color: teamColor }}
        >
          {abbreviation}
        </span>

        {/* Progress bar */}
        <div
          className="group relative h-2 flex-1 cursor-pointer overflow-hidden rounded-full bg-white/10"
          onClick={handleSeek}
        >
          {/* Filled progress */}
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${progress}%`,
              backgroundColor: teamColor,
            }}
          />
          {/* Thumb indicator */}
          {(playing || progress > 0) && (
            <div
              className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full shadow-sm shadow-black/50 opacity-0 transition-opacity group-hover:opacity-100"
              style={{
                left: `calc(${progress}% - 6px)`,
                backgroundColor: teamColor,
              }}
            />
          )}
        </div>

        {/* Time / label */}
        <span className="shrink-0 text-[10px] tabular-nums text-white/30 font-mono">
          {duration > 0
            ? `${formatDuration(currentTime)}/${formatDuration(duration)}`
            : label ?? "—"}
        </span>
      </div>

      <audio
        ref={audioRef}
        src={audioUrl}
        preload="none"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMetadata}
      />
    </div>
  );
});
