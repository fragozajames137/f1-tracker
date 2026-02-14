import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import DriverProfileTabs from "@/app/components/driver/DriverProfileTabs";
import {
  getDriverById,
  getAllDriverIds,
  getContractByDriverId,
  getHistoricalDriver,
  getDriverNumberHistory,
} from "@/app/lib/grid-data";

export function generateStaticParams() {
  return getAllDriverIds().map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const match = getDriverById(id);
  if (!match) return {};
  const { driver, team } = match;
  return {
    title: `${driver.name} — ${team.name} | Pole to Paddock`,
    description: `${driver.name}'s driver profile: contract details, season stats, race results, and social links.`,
    alternates: { canonical: `/driver/${id}` },
    openGraph: {
      title: `${driver.name} — ${team.name}`,
      description: `Full profile for ${driver.name} at ${team.name}.`,
      url: `/driver/${id}`,
    },
  };
}

export default async function DriverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const match = getDriverById(id);
  if (!match) notFound();

  const { driver, team } = match;
  const contract = getContractByDriverId(id);
  const historicalDriver = getHistoricalDriver(driver.name);
  const numberHistory = getDriverNumberHistory(driver.name);

  return (
    <div className="flex min-h-screen flex-col">
      <Header season={2026} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <DriverProfileTabs
          driver={driver}
          team={team}
          contract={contract}
          historicalDriver={historicalDriver}
          numberHistory={numberHistory}
        />
      </main>
      <Footer />
    </div>
  );
}
