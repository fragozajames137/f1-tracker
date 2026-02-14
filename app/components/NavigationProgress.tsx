"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevUrl = useRef(pathname + searchParams.toString());

  const start = useCallback(() => {
    setProgress(0);
    setVisible(true);

    // Animate progress from 0 → ~90% over time
    let p = 0;
    timerRef.current = setInterval(() => {
      p += (90 - p) * 0.1;
      setProgress(p);
    }, 100);
  }, []);

  const done = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setProgress(100);
    setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 200);
  }, []);

  // Detect route changes
  useEffect(() => {
    const url = pathname + searchParams.toString();
    if (url !== prevUrl.current) {
      done();
      prevUrl.current = url;
    }
  }, [pathname, searchParams, done]);

  // Intercept link clicks to start the bar immediately
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("http") ||
        anchor.target === "_blank"
      ) return;

      const currentUrl = pathname + searchParams.toString();
      if (href !== currentUrl && href !== pathname) {
        start();
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname, searchParams, start]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 z-[9999] h-[3px] transition-opacity duration-200"
      style={{
        width: `${progress}%`,
        opacity: visible ? 1 : 0,
        background: "linear-gradient(to right, #ef4444, #f97316)",
        transition: "width 100ms ease-out, opacity 200ms ease-out",
      }}
    />
  );
}
