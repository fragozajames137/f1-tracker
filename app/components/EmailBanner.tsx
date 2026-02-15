"use client";

import { useState, useEffect } from "react";
import { usePreferencesStore } from "@/app/stores/preferences";

const SESSION_KEY = "f1-email-banner-dismissed";

export default function EmailBanner() {
  const hasCompleted = usePreferencesStore((s) => s.hasCompletedWelcome);
  const hasEmail = usePreferencesStore((s) => s.hasEmailSubscribed);
  const markEmailSubscribed = usePreferencesStore((s) => s.markEmailSubscribed);

  const [hydrated, setHydrated] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(SESSION_KEY)) {
      setDismissed(true);
    }
  }, []);

  // Only show if: hydrated, completed welcome, didn't give email, not dismissed this session
  if (!hydrated || !hasCompleted || hasEmail || dismissed || success) return null;

  function handleDismiss() {
    setDismissed(true);
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
  }

  async function handleSubmit() {
    if (!email.trim()) return;
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email.trim())) {
      setError("Enter a valid email");
      return;
    }
    setSubmitting(true);
    try {
      await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      markEmailSubscribed();
      setSuccess(true);
    } catch {
      // fail silently
    }
    setSubmitting(false);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#1a1a1a]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white/80">
            Get race alerts for your favorite drivers
          </p>
          <p className="hidden text-xs text-white/40 sm:block">
            Race results, breaking news & qualifying updates — no spam.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            placeholder="you@example.com"
            className="w-40 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none sm:w-52"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="cursor-pointer shrink-0 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15 disabled:opacity-50"
          >
            {submitting ? "..." : "Subscribe"}
          </button>
          <button
            onClick={handleDismiss}
            className="cursor-pointer shrink-0 rounded-full p-1.5 text-white/30 transition-colors hover:text-white/60"
            aria-label="Dismiss"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      {error && (
        <p className="mx-auto max-w-3xl px-4 pb-2 text-xs text-red-400 sm:px-6">{error}</p>
      )}
    </div>
  );
}
