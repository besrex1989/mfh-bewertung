"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { calculateValuation, formatCHF } from "@/lib/calculations";
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
        .select("*, properties(name, address, city, canton, condition, living_area, commercial_area)")
        .eq("id", id)
        .eq("user_id", session.user.id)
        .single();
      if (error || !data) { router.push("/dashboard"); return; }
      setValuation(data);
      setResult(calculateValuation({
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
      }));
      setLoading(false);
    }
    load();
  }, [id, router]);

  if (loading) return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center">
      <p className="text-ink-400">Laden...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-950">
      <nav className="border-b border-ink-800 bg-ink-900/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-display font-bold text-base text-ink-50">
            MFH <span className="text-gold-500">Bewertung</span>
          </span>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-ink-400 hover:text-ink-200 text-sm">
              ← Dashboard
            </Link>
            <button
              onClick={async () => { await supabase.auth.signOut(); router.push("/"); }}
              className="btn-ghost text-xs px-4 py-2"
            >
              Abmelden
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-4 py-10 pb-20">
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink-50 mb-1">
              {valuation.properties?.name ?? "Bewertung"}
            </h1>
            <p className="text-ink-400 text-sm">{valuation.properties?.city}</p>
          </div>
          <PDFDownloadButton valuationId={id} />
        </div>
        {result && <ResultCard result={result} effectiveIncome={valuation.effective_income} />}
      </main>
    </div>
  );
}