"use client";

import { useState } from "react";

interface LazyChartProps {
  title: string;
  children: React.ReactNode;
}

export default function LazyChart({ title, children }: LazyChartProps) {
  const [loaded, setLoaded] = useState(false);

  if (!loaded) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
          {title}
        </h3>
        <div className="flex items-center justify-center py-12">
          <button
            onClick={() => setLoaded(true)}
            className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/50 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white/80"
          >
            Load Chart
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
