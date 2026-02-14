"use client";

export default function DriverError() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center">
      <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
      <p className="text-white/50">Could not load driver profile.</p>
    </div>
  );
}
