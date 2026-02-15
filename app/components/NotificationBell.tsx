"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type NotifStatus = "loading" | "unsupported" | "denied" | "prompt" | "subscribed" | "unsubscribed";

interface Preferences {
  reminders: boolean;
  liveEvents: boolean;
  reminderMinutes: number;
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

export default function NotificationBell() {
  const [status, setStatus] = useState<NotifStatus>("loading");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [prefs, setPrefs] = useState<Preferences>({
    reminders: true,
    liveEvents: true,
    reminderMinutes: 15,
  });
  const panelRef = useRef<HTMLDivElement>(null);

  // Check notification support and current permission
  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }

    // Check if already subscribed
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setStatus(sub ? "subscribed" : "unsubscribed");
      });
    });
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  // Close on Escape
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDropdownOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [dropdownOpen]);

  const subscribe = useCallback(async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setStatus("denied");
        return;
      }
      if (permission !== "granted") return;

      // Get VAPID public key
      const keyRes = await fetch("/api/push/vapid-key");
      const { publicKey } = await keyRes.json();
      if (!publicKey) return;

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Send to backend
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON(), preferences: prefs }),
      });

      setStatus("subscribed");
    } catch (err) {
      console.error("Push subscription failed:", err);
    }
  }, [prefs]);

  const unsubscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setStatus("unsubscribed");
    } catch (err) {
      console.error("Push unsubscribe failed:", err);
    }
  }, []);

  const updatePreferences = useCallback(
    async (newPrefs: Preferences) => {
      setPrefs(newPrefs);

      if (status !== "subscribed") return;

      try {
        const reg = await navigator.serviceWorker.ready;
        const subscription = await reg.pushManager.getSubscription();
        if (subscription) {
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subscription: subscription.toJSON(),
              preferences: newPrefs,
            }),
          });
        }
      } catch (err) {
        console.error("Failed to update push preferences:", err);
      }
    },
    [status],
  );

  if (status === "loading" || status === "unsupported") return null;

  const isActive = status === "subscribed";

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => {
          if (status === "unsubscribed" || status === "prompt") {
            subscribe();
          } else {
            setDropdownOpen(!dropdownOpen);
          }
        }}
        className={`cursor-pointer rounded-full p-2 transition-colors ${
          isActive
            ? "text-amber-400 hover:bg-amber-400/10 hover:text-amber-300"
            : "text-white/40 hover:bg-white/10 hover:text-white/80"
        }`}
        aria-label={isActive ? "Notification settings" : "Enable notifications"}
        title={
          status === "denied"
            ? "Notifications blocked in browser settings"
            : isActive
              ? "Notification settings"
              : "Enable notifications"
        }
      >
        <svg
          className="h-5 w-5"
          fill={isActive ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
      </button>

      {status === "denied" && dropdownOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-white/10 bg-[#1a1a1a] p-4 shadow-2xl">
          <p className="text-xs text-white/50">
            Notifications are blocked. Enable them in your browser settings for this site.
          </p>
        </div>
      )}

      {isActive && dropdownOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-white/10 bg-[#1a1a1a] p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Notifications
            </h3>
            <button
              onClick={() => setDropdownOpen(false)}
              className="cursor-pointer rounded-full p-1 text-white/30 transition-colors hover:text-white/70"
              aria-label="Close"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Session reminders toggle */}
          <div className="mb-3 flex items-center justify-between">
            <div>
              <span className="text-sm text-white/80">Session reminders</span>
              <p className="text-xs text-white/40">Qualifying, Sprint, Race</p>
            </div>
            <button
              onClick={() =>
                updatePreferences({ ...prefs, reminders: !prefs.reminders })
              }
              className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors ${
                prefs.reminders ? "bg-amber-500" : "bg-white/20"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  prefs.reminders ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>

          {/* Reminder timing */}
          {prefs.reminders && (
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-white/50">Remind me</span>
              <div className="flex overflow-hidden rounded-lg border border-white/10">
                {[15, 30, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() =>
                      updatePreferences({ ...prefs, reminderMinutes: mins })
                    }
                    className={`cursor-pointer px-2.5 py-1 text-xs font-medium transition-colors ${
                      prefs.reminderMinutes === mins
                        ? "bg-white/10 text-white"
                        : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    {mins === 60 ? "1h" : `${mins}m`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live events toggle */}
          <div className="mb-3 flex items-center justify-between">
            <div>
              <span className="text-sm text-white/80">Live events</span>
              <p className="text-xs text-white/40">Red flags, safety cars</p>
            </div>
            <button
              onClick={() =>
                updatePreferences({ ...prefs, liveEvents: !prefs.liveEvents })
              }
              className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors ${
                prefs.liveEvents ? "bg-amber-500" : "bg-white/20"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  prefs.liveEvents ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>

          {/* Divider */}
          <div className="my-3 border-t border-white/10" />

          {/* Unsubscribe */}
          <button
            onClick={unsubscribe}
            className="w-full cursor-pointer rounded-lg px-3 py-2 text-center text-xs text-red-400/70 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            Turn off all notifications
          </button>
        </div>
      )}
    </div>
  );
}
