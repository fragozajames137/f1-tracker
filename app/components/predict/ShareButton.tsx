"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useGridPredictorStore } from "@/app/stores/gridPredictor";

interface ShareButtonProps {
  gridRef: React.RefObject<HTMLDivElement | null>;
}

export default function ShareButton({ gridRef }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const encodeGridState = useGridPredictorStore((s) => s.encodeGridState);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleImageExport = useCallback(async () => {
    if (!gridRef.current || exporting) return;
    setExporting(true);

    try {
      const { toPng } = await import("html-to-image");

      const wrapper = document.createElement("div");
      wrapper.style.cssText = `
        background: #0a0a0a; padding: 24px; border-radius: 12px;
        font-family: system-ui, -apple-system, sans-serif; color: white;
        width: ${gridRef.current.offsetWidth + 48}px;
      `;

      const titleEl = document.createElement("div");
      titleEl.style.cssText = "font-size: 18px; font-weight: 700; margin-bottom: 4px;";
      titleEl.textContent = "My 2027 F1 Grid Prediction";
      wrapper.appendChild(titleEl);

      const subtitle = document.createElement("div");
      subtitle.style.cssText = "font-size: 12px; color: rgba(255,255,255,0.4); margin-bottom: 16px;";
      subtitle.textContent = "Made with Pole to Paddock";
      wrapper.appendChild(subtitle);

      const clone = gridRef.current.cloneNode(true) as HTMLElement;
      wrapper.appendChild(clone);

      const watermark = document.createElement("div");
      watermark.style.cssText = `
        margin-top: 16px; padding-top: 12px;
        border-top: 1px solid rgba(255,255,255,0.1);
        font-size: 11px; color: rgba(255,255,255,0.25); text-align: right;
      `;
      watermark.textContent = "poletopaddock.com/predict";
      wrapper.appendChild(watermark);

      wrapper.style.position = "fixed";
      wrapper.style.left = "-9999px";
      wrapper.style.top = "0";
      document.body.appendChild(wrapper);

      const dataUrl = await toPng(wrapper, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: "#0a0a0a",
      });

      document.body.removeChild(wrapper);

      const link = document.createElement("a");
      link.download = "my-2027-f1-grid.png";
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
      setOpen(false);
    }
  }, [gridRef, exporting]);

  const handleUrlShare = useCallback(async () => {
    const encoded = encodeGridState();
    const url = `${window.location.origin}/predict?grid=${encoded}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "My 2027 F1 Grid Prediction", url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    setOpen(false);
  }, [encodeGridState]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        {copied ? "Copied!" : "Share"}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-lg border border-white/10 bg-[#1a1a1a] p-1.5 shadow-xl">
          <button
            onClick={handleImageExport}
            disabled={exporting}
            className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            {exporting ? "Exporting..." : "Download as Image"}
          </button>
          <button
            onClick={handleUrlShare}
            className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            Copy Share Link
          </button>
        </div>
      )}
    </div>
  );
}
