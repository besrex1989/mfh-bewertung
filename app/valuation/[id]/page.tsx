import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Database } from "@/types/database";
import type { ValuationWithProperty } from "@/types";
import type { LocationCategory, ConditionType } from "@/types";
import { calculateValuation, formatCHF, formatPct, getLageLabel } from "@/lib/calculations";
import Navbar from "@/components/Navbar";
import ResultCard from "@/components/ResultCard";
import ScenarioTable from "@/components/ScenarioTable";
import PDFDownloadButton from "@/components/PDFDownloadButton";

export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
}

export default async function ValuationDetailPage({ params }: Props) {
  const supabase = createServerComponentClient<Database>({ cookies });

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/auth/login");

  const { data: valuationData } = await supabase
    .from("valuations")
    .select("*, properties(name, address, city, canton, zip, build_year, condition, num_units, living_area, commercial_area)")
    .eq("id", params.id)
    .eq("user_id", session.user.id)
    .single();

  if (!valuationData) notFound();

  const v = valuationData as ValuationWithProperty & {
    properties: {
      name: string; address: string; city: string; canton: string;
      zip: string | null; build_year: number | null; condition: string | null;
      num_units: number | null; living_area: number | null; commercial_area: number | null;
    }
  };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  // Re-compute result for ResultCard
  const result = calculateValuation({
    city:             v.properties?.city ?? "",
    condition:        (v.properties?.condition as ConditionType) ?? "gut",
    rentResidential:  v.rent_residential,
    rentCommercial:   v.rent_commercial,
    actualRent:       v.actual_rent ?? 0,
    vacancyRate:      v.vacancy_rate,
    operatingCosts:   v.operating_costs,
    maintenanceCosts: v.maintenance_costs,
    livingArea:       v.properties?.living_area ?? 0,
    commercialArea:   v.properties?.commercial_area ?? 0,
    microLocation:    (v.micro_location as any) ?? "gut",
    macroLocation:    (v.macro_location as any) ?? "gut",
    publicTransport:  (v.public_transport as any) ?? "gut",
  });

  return (
    <div className="min-h-screen bg-ink-950">
      <Navbar userEmail={session.user.email} userName={profile?.full_name} />

      <main className="max-w-4xl mx-auto px-4 py-10 pb-20">
        {/* Back + header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <Link
              href="/dashboard"
              className="text-ink-500 hover:text-ink-300 text-sm transition-colors inline-flex items-center gap-1 mb-3"
            >
              ← Dashboard
            </Link>
            <h1 className="font-display text-3xl font-bold text-ink-50 mb-1">
              {v.properties?.name ?? "Bewertung"}
            </h1>
            <p className="text-ink-400 text-sm">
              {v.properties?.address}, {v.properties?.zip ?? ""} {v.properties?.city} ·{" "}
              {new Date(v.created_at).toLocaleDateString("de-CH")}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <PDFDownloadButton valuationId={v.id} />
            <Link href="/new" className="btn-primary px-4 py-2.5 text-sm">
              + Neue Bewertung
            </Link>
          </div>
        </div>

        {/* Result Card */}
        <ResultCard result={result} effectiveIncome={v.effective_income} />

        {/* Notes */}
        {v.notes && (
          <div className="card mt-5">
            <h4 className="text-[11px] font-semibold text-ink-400 uppercase tracking-widest mb-2">
              Notizen
            </h4>
            <p className="text-sm text-ink-200 leading-relaxed whitespace-pre-wrap">{v.notes}</p>
          </div>
        )}

        {/* Raw Ertragsdaten */}
        <div className="card mt-5">
          <h4 className="text-[11px] font-semibold text-ink-400 uppercase tracking-widest mb-4">
            Erfasste Ertragsdaten
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Soll-Mietertrag Wohnen", formatCHF(v.rent_residential)],
              ["Soll-Mietertrag Gewerbe", formatCHF(v.rent_commercial)],
              ["Ist-Mietertrag", v.actual_rent ? formatCHF(v.actual_rent) : "—"],
              ["Leerstandsquote", `${v.vacancy_rate} %`],
              ["Betriebskosten", v.operating_costs > 0 ? formatCHF(v.operating_costs) : "—"],
              ["Unterhaltskosten", v.maintenance_costs > 0 ? formatCHF(v.maintenance_costs) : "—"],
            ].map(([l, val]) => (
              <div key={l} className="bg-ink-800/50 rounded-lg px-3 py-2.5">
                <p className="text-[10px] text-ink-500 uppercase tracking-widest mb-0.5">{l}</p>
                <p className="font-semibold text-ink-100">{val}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
