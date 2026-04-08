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
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(null);

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
      setForm({
        rent_residential:  data.rent_residential,
        rent_commercial:   data.rent_commercial,
        actual_rent:       data.actual_rent ?? "",
        vacancy_rate:      data.vacancy_rate,
        operating_costs:   data.operating_costs,
        maintenance_costs: data.maintenance_costs,
        notes:             data.notes ?? "",
      });
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

  async function handleSave() {
    setSaving(true);
    const r = calculateValuation({
      city: valuation.properties?.city ?? "",
      condition: (valuation.properties?.condition as ConditionType) ?? "gut",
      rentResidential: +form.rent_residential || 0,
      rentCommercial: +form.rent_commercial || 0,
      actualRent: +form.actual_rent || 0,
      vacancyRate: +form.vacancy_rate || 0,
      operatingCosts: +form.operating_costs || 0,
      maintenanceCosts: +form.maintenance_costs || 0,
      livingArea: valuation.properties?.living_area ?? 0,
      commercialArea: valuation.properties?.commercial_area ?? 0,
      microLocation: valuation.micro_location ?? "gut",
      macroLocation: valuation.macro_location ?? "gut",
      publicTransport: valuation.public_transport ?? "gut",
    });
    await supabase.from("valuations").update({
      rent_residential:     +form.rent_residential || 0,
      rent_commercial:      +form.rent_commercial || 0,
      actual_rent:          +form.actual_rent || null,
      vacancy_rate:         +form.vacancy_rate || 0,
      operating_costs:      +form.operating_costs || 0,
      maintenance_costs:    +form.maintenance_costs || 0,
      notes:                form.notes || null,
      cap_rate:             r.capRateBreakdown.final,
      gross_income:         r.grossIncome,
      effective_income:     r.effectiveIncome,
      net_income:           r.netIncome > 0 ? r.netIncome : null,
      value_simple:         r.valueSimple,
      value_extended:       r.valueExtended > 0 ? r.valueExtended : null,
      value_conservative:   r.valueConservative,
      value_optimistic:     r.valueOptimistic,
    }).eq("id", id);
    setResult(r);
    setValuation((prev: any) => ({ ...prev, ...form, cap_rate: r.capRateBreakdown.final, value_simple: r.valueSimple, effective_income: r.effectiveIncome }));
    setEditing(false);
    setSaving(false);
  }

  const upd = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  const inp = (key: string, label: string, type = "number") => (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => upd(key, e.target.value)}
        className="input-field"
      />
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">Laden...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
              <span className="text-white text-sm font-black">M</span>
            </div>
            <span className="font-bold text-base text-gray-900 tracking-tight">
              MFH <span className="text-blue-600">Bewertung</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-800 text-sm">
              &larr; Dashboard
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
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              {valuation.properties?.name ?? "Bewertung"}
            </h1>
            <p className="text-gray-500 text-sm">{valuation.properties?.city}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {!editing && <PDFDownloadButton valuationId={id} />}
            <button
              onClick={() => setEditing(!editing)}
              className={editing ? "btn-ghost px-4 py-2.5 text-sm" : "btn-primary px-4 py-2.5 text-sm"}
            >
              {editing ? "Abbrechen" : "Bearbeiten"}
            </button>
            <Link href="/new" className="btn-accent px-4 py-2.5 text-sm">
              + Neue Bewertung
            </Link>
          </div>
        </div>

        {/* EDIT FORM */}
        {editing && (
          <div className="card mb-5">
            <h3 className="text-lg font-bold text-gray-900 mb-5">Ertragsdaten bearbeiten</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {inp("rent_residential",  "Soll-Mietertrag Wohnen p.a. (CHF)")}
              {inp("rent_commercial",   "Soll-Mietertrag Gewerbe p.a. (CHF)")}
              {inp("actual_rent",       "Ist-Mietertrag total p.a. (CHF)")}
              {inp("vacancy_rate",      "Leerstandsquote (%)")}
              {inp("operating_costs",   "Betriebskosten p.a. (CHF)")}
              {inp("maintenance_costs", "Unterhaltskosten p.a. (CHF)")}
            </div>
            <div className="mb-4">
              <label className="label">Notizen</label>
              <textarea
                value={form.notes}
                onChange={e => upd("notes", e.target.value)}
                className="input-field resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving} className="btn-accent px-6 py-2.5">
                {saving ? "Wird gespeichert..." : "Speichern"}
              </button>
              <button onClick={() => setEditing(false)} className="btn-ghost px-6 py-2.5">
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {/* RESULT */}
        {result && <ResultCard result={result} effectiveIncome={valuation.effective_income} />}

        {valuation.notes && !editing && (
          <div className="card mt-5">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Notizen</h4>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{valuation.notes}</p>
          </div>
        )}
      </main>
    </div>
  );
}