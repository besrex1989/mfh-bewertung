"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { calculateValuation, formatCHF, formatPct } from "@/lib/calculations";
import ResultCard from "@/components/ResultCard";
import PDFDownloadButton from "@/components/PDFDownloadButton";
import type { ConditionType } from "@/types";

export default function ValuationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [valuation, setValuation] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth/login"); return; }
      const { data, error } = await supabase
        .from("valuations")
        .select("*, properties(name, address, city, canton, zip, build_year, condition, num_units, living_area, commercial_area)")
        .eq("id", id)
        .eq("user_id", session.user.id)
        .single();
      if (error || !data) { router.push("/dashboard"); return; }
      setValuation(data);
      const r = calculateValuation({
        city: data.properties?.city ?? "",
        condition: (data.properties?.condition as ConditionType) ?? "gut",
        rentResidential: data.rent_residential,
        rentCommercial: data.rent_commercial,
        actualRent: data.actual_rent ?? 0,
        vacancyRate: data.vacancy_rate,
        operatingCosts: data.operating_costs,
        maintenanceCosts: data.maintenance_costs,
        livingArea: data.properties?.living_area ?? 0,
        commercialArea: data.properties?.commercial_area ?? 0,
        microLocation: data.micro_location ?? "gut",
        macroLocation: data.macro_location ?? "gut",
        publicTransport: data.public_transport ?? "gut",
      });
      setResult(r);
      setLoading(false);
    }
    load();
  }, [id, router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center">
      <p className="text-ink-400">Laden...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-950">
      <nav className="border-b border-ink-800 bg-ink-900/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-forest-700 to-gold-500 flex items-center justify-center">
              <span className="text-ink-950 text-sm font-black">M</span>
            </div>
            <span className="font-display font-bold text-base text-ink-50 tracking-tight">
              MFH <span className="text-gold-500">Bewertung</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-ink-400 hover:text-ink-200 text-sm">← Dashboard</Link>
            <button onClick={handleLogout} className="btn-ghost text-xs px-4 py-2">Abmelden</button>
          </div>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-4 py-10 pb-20">
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink-50 mb-1">
              {valuation.properties?.name ?? "Bewertung"}
            </h1>
            <p className="text-ink-400 text-sm">
              {valuation.properties?.address}, {valuation.properties?.city}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <PDFDownloadButton valuationId={id} />
            <Link href="/new" className="btn-primary px-4 py-2.5 text-sm">+ Neue Bewertung</Link>
          </div>
        </div>
        {result && <ResultCard result={result} effectiveIncome={valuation.effective_income} />}
        <div className="card mt-5">
          <h4 className="text-[11px] font-semibold text-ink-400 uppercase tracking-widest mb-4">Erfasste Ertragsdaten</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Soll-Mietertrag Wohnen", formatCHF(valuation.rent_residential)],
              ["Soll-Mietertrag Gewerbe", formatCHF(valuation.rent_commercial)],
              ["Leerstandsquote", valuation.vacancy_rate + " %"],
              ["Betriebskosten", valuation.operating_costs > 0 ? formatCHF(valuation.operating_costs) : "---"],
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