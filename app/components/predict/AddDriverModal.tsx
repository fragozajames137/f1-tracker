"use client";

import { useRef, useEffect, useState } from "react";
import { useGridPredictorStore } from "@/app/stores/gridPredictor";
import { validateDriverName } from "@/app/lib/profanity";
import { nationalityToFlag } from "@/app/lib/flags";

const NATIONALITIES = [
  { code: "ARG", label: "Argentine" },
  { code: "AUS", label: "Australian" },
  { code: "BEL", label: "Belgian" },
  { code: "BRA", label: "Brazilian" },
  { code: "GBR", label: "British" },
  { code: "CAN", label: "Canadian" },
  { code: "CHN", label: "Chinese" },
  { code: "DEN", label: "Danish" },
  { code: "NED", label: "Dutch" },
  { code: "EST", label: "Estonian" },
  { code: "FIN", label: "Finnish" },
  { code: "FRA", label: "French" },
  { code: "GER", label: "German" },
  { code: "IND", label: "Indian" },
  { code: "ITA", label: "Italian" },
  { code: "JPN", label: "Japanese" },
  { code: "MEX", label: "Mexican" },
  { code: "MON", label: "Monegasque" },
  { code: "NZL", label: "New Zealander" },
  { code: "ESP", label: "Spanish" },
  { code: "THA", label: "Thai" },
  { code: "USA", label: "American" },
];

interface AddDriverModalProps {
  onClose: () => void;
}

export default function AddDriverModal({ onClose }: AddDriverModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [nationality, setNationality] = useState("GBR");
  const [error, setError] = useState<string | null>(null);
  const addCustomDriver = useGridPredictorStore((s) => s.addCustomDriver);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateDriverName(name);
    if (validationError) {
      setError(validationError);
      return;
    }
    addCustomDriver(name.trim(), nationality);
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md rounded-xl border border-white/10 bg-[#1a1a1a] p-6 text-white backdrop:bg-black/60"
    >
      <h2 className="mb-4 text-lg font-bold">Add Custom Driver</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-white/60">Driver Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(null); }}
            placeholder="e.g. Andrea Kimi Antonelli Jr."
            maxLength={30}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none"
            autoFocus
          />
          {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm text-white/60">Nationality</label>
          <select
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
          >
            {NATIONALITIES.map((n) => (
              <option key={n.code} value={n.code} className="bg-[#111]">
                {nationalityToFlag(n.code)} {n.label} ({n.code})
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg px-4 py-2 text-sm text-white/50 transition-colors hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="cursor-pointer rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15"
          >
            Add Driver
          </button>
        </div>
      </form>
    </dialog>
  );
}
