import type { Metadata } from "next";
import { Suspense } from "react";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import GridPredictor from "@/app/components/predict/GridPredictor";
import gridJson from "@/app/data/grid-2026.json";
import type { GridData } from "@/app/types";

const data = gridJson as GridData;

export const metadata: Metadata = {
  title: "2027 Grid Predictor — Pole to Paddock",
  description:
    "Build your predicted 2027 Formula 1 grid. Drag and drop drivers into team seats, share your predictions as an image or link.",
  alternates: { canonical: "/predict" },
  openGraph: {
    title: "2027 Grid Predictor — Pole to Paddock",
    description: "Build and share your predicted 2027 F1 driver lineup.",
    url: "/predict",
  },
};

export default function PredictPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header season={data.season} />
      <main
        id="main-content"
        className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8"
      >
        <h1 className="font-display mb-2 text-2xl font-bold text-white">
          2027 Grid Predictor
        </h1>
        <p className="mb-8 text-sm text-white/50">
          Drag drivers into seats to build your predicted 2027 F1 grid.
          Drivers with contracts through 2027 or beyond are locked in place.
        </p>
        <Suspense>
          <GridPredictor data={data} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
