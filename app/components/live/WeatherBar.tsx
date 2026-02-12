"use client";

import { OpenF1Weather } from "@/app/types/openf1";

interface WeatherBarProps {
  weather: OpenF1Weather | null;
}

export default function WeatherBar({ weather }: WeatherBarProps) {
  if (!weather) {
    return (
      <div className="h-10 rounded-lg border border-white/10 bg-white/5" />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm sm:flex sm:flex-wrap sm:items-center sm:gap-4 sm:py-2">
      <div>
        <span className="text-white/40">Track </span>
        <span className="font-medium text-white">
          {weather.track_temperature.toFixed(1)}°C
        </span>
      </div>
      <div>
        <span className="text-white/40">Air </span>
        <span className="font-medium text-white">
          {weather.air_temperature.toFixed(1)}°C
        </span>
      </div>
      <div>
        <span className="text-white/40">Humidity </span>
        <span className="font-medium text-white">{weather.humidity}%</span>
      </div>
      <div>
        <span className="text-white/40">Wind </span>
        <span className="font-medium text-white">
          {weather.wind_speed.toFixed(1)} km/h
        </span>
      </div>
      {weather.rainfall > 0 && (
        <div className="col-span-2 sm:col-span-1">
          <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-400">
            Rain
          </span>
        </div>
      )}
    </div>
  );
}
