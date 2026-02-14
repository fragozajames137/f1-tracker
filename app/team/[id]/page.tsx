import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import TeamProfileComponent from "@/app/components/team/TeamProfile";
import {
  getTeamById,
  getAllTeamIds,
  getConstructorByTeamId,
  getEngineManufacturer,
} from "@/app/lib/grid-data";

export function generateStaticParams() {
  return getAllTeamIds().map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const team = getTeamById(id);
  if (!team) return {};
  return {
    title: `${team.name} — Constructor Profile | Pole to Paddock`,
    description: `${team.name} constructor profile: drivers, stats, heritage, and team information.`,
    alternates: { canonical: `/team/${id}` },
    openGraph: {
      title: `${team.name} — Constructor Profile`,
      description: `Full constructor profile for ${team.name}.`,
      url: `/team/${id}`,
    },
  };
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const team = getTeamById(id);
  if (!team) notFound();

  const constructor = getConstructorByTeamId(id);
  const engine = constructor ? getEngineManufacturer(constructor.engine) : null;

  return (
    <div className="flex min-h-screen flex-col">
      <Header season={2026} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <TeamProfileComponent team={team} constructor={constructor} engine={engine} />
      </main>
      <Footer />
    </div>
  );
}
