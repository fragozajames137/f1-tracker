"use client";

import { useRef, useState, useCallback } from "react";

interface ShareCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function ShareCard({ title, subtitle, children }: ShareCardProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!contentRef.current || exporting) return;
    setExporting(true);

    try {
      const { toPng } = await import("html-to-image");

      // Create a branded wrapper
      const wrapper = document.createElement("div");
      wrapper.style.cssText = `
        background: #0a0a0a;
        padding: 24px;
        border-radius: 12px;
        font-family: system-ui, -apple-system, sans-serif;
        color: white;
        width: ${contentRef.current.offsetWidth + 48}px;
      `;

      // Title bar
      const titleBar = document.createElement("div");
      titleBar.style.cssText = "margin-bottom: 16px;";

      const titleEl = document.createElement("div");
      titleEl.style.cssText = "font-size: 16px; font-weight: 700; color: white;";
      titleEl.textContent = title;
      titleBar.appendChild(titleEl);

      if (subtitle) {
        const subtitleEl = document.createElement("div");
        subtitleEl.style.cssText = "font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 4px;";
        subtitleEl.textContent = subtitle;
        titleBar.appendChild(subtitleEl);
      }

      wrapper.appendChild(titleBar);

      // Clone chart content
      const clone = contentRef.current.cloneNode(true) as HTMLElement;
      wrapper.appendChild(clone);

      // Watermark bar
      const watermark = document.createElement("div");
      watermark.style.cssText = `
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid rgba(255,255,255,0.1);
        font-size: 11px;
        color: rgba(255,255,255,0.25);
        text-align: right;
      `;
      watermark.textContent = "poletopaddock.com";
      wrapper.appendChild(watermark);

      // Temporarily add to DOM for rendering
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

      // Trigger download
      const link = document.createElement("a");
      link.download = `${title.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [title, subtitle, exporting]);

  return (
    <div className="group relative">
      {/* Export button */}
      <button
        onClick={handleExport}
        disabled={exporting}
        className="absolute right-2 top-2 z-10 cursor-pointer rounded-md bg-white/5 p-1.5 text-white/30 opacity-0 transition-all hover:bg-white/10 hover:text-white/60 group-hover:opacity-100 disabled:opacity-50"
        title="Download as PNG"
      >
        {exporting ? (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        )}
      </button>

      <div ref={contentRef}>
        {children}
      </div>
    </div>
  );
}
