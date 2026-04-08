"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { calculateValuation, formatCHF, formatPct } from "@/lib/calculations";
import { MUNICIPALITIES, KANTONE } from "@/lib/municipalities";
import ResultCard from "@/components/ResultCard";
import PDFDownloadButton from "@/components/PDFDownloadButton";
import type { ConditionType, LocationRating } from "@/types";

export default function ValuationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [editing, setEditing]   = useState(false);
  const [activeTab, setActiveTab] = useState<"objekt"|"ertraege"|"lage">("objekt");
  const [valuation, setValuation] = useState<any>(null);
  const [property, setProperty]   = useState<any>(null);
  const [result, setResult]       = useState<any>(null);

  const [propForm, setPropForm] = useState<any>({});
  const [valForm, setValForm]   = useState<any>({});

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth/login"); return; }

      const { data, error } = await supabase
        .from("valuations")
        .select("*, properties(*)")
        .eq("id", id)
        .eq("user_id", session.user.id)
        .single();

      if (error || !data) { router.push("/dashboard"); return; }

      setValuation(data);
      setProperty(data.properties);
      setPropForm({
        name:            data.properties?.name ?? "",
        address:         data.properties?.address ?? "",
        city:            data.properties?.city ?? "",
        canton:          data.properties?.canton ?? "BE",
        zip:             data.properties?.zip ?? "",
        build_year:      data.properties?.build_year ?? "",
        condition:       data.properties?.condition ?? "gut",
        num_units:       data.properties?.num_units ?? "",
        living_area:     data.properties?.living_area ?? "",
        commercial_area: data.properties?.commercial_area ?? "",
      });
      setValForm({
        rent_residential:  data.rent_residential ?? "",
        rent_commercial:   data.rent_commercial ?? "",
        actual_rent:       data.actual_rent ?? "",
        vacancy_rate:      data.vacancy_rate ?? "",
        operating_costs:   data.operating_costs ?? "",
        maintenance_costs: data.maintenance_costs ?? "",
        micro_location:    data.micro_location ?? "gut",
        macro_location:    data.macro_location ?? "gut",
        public_transport:  data.public_transport ?? "gut",
        notes:             data.notes ?? "",
      });
      recompute(data, data.properties);
      setLoading(false);
    }
    load();
  }, [id, router]);

  function recompute(val: any, prop: any) {
    const r = calculateValuation({
      city:             prop?.city ?? "",
      condition:        (prop?.condition as ConditionType) ?? "gut",
      rentResidential:  +val.rent_residential || 0,
      rentCommercial:   +val.rent_commercial || 0,
      actualRent:       +val.actual_rent || 0,
      vacancyRate:      +val.vacancy_rate || 0,
      operatingCosts:   +val.operating_costs || 0,
      maintenanceCosts: +val.maintenance_costs || 0,
      livingArea:       +prop?.living_area || 0,
      commercialArea:   +prop?.commercial_area || 0,
      microLocation:    val.micro_location ?? "gut",
      macroLocation:    val.macro_location ?? "gut",
      publicTransport:  val.public_transport ?? "gut",
    });
    setResult(r);
  }

  async function handleSave() {
    setSaving(true);
    // Update property
    await supabase.from("properties").update({
      name:            propForm.name,
      address:         propForm.address,
      city:            propForm.city,
      canton:          propForm.canton,
      zip:             propForm.zip || null,
      build_year:      propForm.build_year ? +propForm.build_year : null,
      condition:       propForm.condition,
      num_units:       propForm.num_units ? +propForm.num_units : null,
      living_area:     propForm.living_area ? +propForm.living_area : null,
      commercial_area: propForm.commercial_area ? +propForm.commercial_area : null,
    }).eq("id", valuation.property_id);

    // Recompute with new values
    const mergedProp = { ...property, ...propForm };
    const mergedVal  = { ...valuation, ...valForm };
    const r = calculateValuation({
      city:             mergedProp.city ?? "",
      condition:        (mergedProp.condition as ConditionType) ?? "gut",
      rentResidential:  +valForm.rent_residential || 0,
      rentCommercial:   +valForm.rent_commercial || 0,
      actualRent:       +valForm.actual_rent || 0,
      vacancyRate:      +valForm.vacancy_rate || 0,
      operatingCosts:   +valForm.operating_costs || 0,
      maintenanceCosts: +valForm.maintenance_costs || 0,
      livingArea:       +propForm.living_area || 0,
      commercialArea:   +propForm.commercial_area || 0,
      microLocation:    valForm.micro_location,
      macroLocation:    valForm.macro_location,
      publicTransport:  valForm.public_transport,
    });

    await supabase.from("valuations").update({
      rent_residential:     +valForm.rent_residential || 0,
      rent_commercial:      +valForm.rent_commercial || 0,
      actual_rent:          valForm.actual_rent ? +valForm.actual_rent : null,
      vacancy_rate:         +valForm.vacancy_rate || 0,
      operating_costs:      +valForm.operating_costs || 0,
      maintenance_costs:    +valForm.maintenance_costs || 0,
      micro_location:       valForm.micro_location,
      macro_location:       valForm.macro_location,
      public_transport:     valForm.public_transport,
      notes:                valForm.notes || null,
      cap_rate:             r.capRateBreakdown.final,
      gross_income:         r.grossIncome,
      effective_income:     r.effectiveIncome,
      net_income:           r.netIncome > 0 ? r.netIncome : null,
      value_simple:         r.valueSimple,
      value_extended:       r.valueExtended > 0 ? r.valueExtended : null,
      value_conservative:   r.valueConservative,
      value_optimistic:     r.valueOptimistic,
      base_cap_rate:        r.capRateBreakdown.base,
      condition_delta:      r.capRateBreakdown.conditionDelta,
      commercial_surcharge: r.capRateBreakdown.commercialSurcharge,
      micro_correction:     r.capRateBreakdown.microCorrection,
      oev_correction:       r.capRateBreakdown.oevCorrection,
      location_category:    r.locationCategory,
      confidence:           r.confidence,
    }).eq("id", id);

    setResult(r);
    setProperty(mergedProp);
    setValuation((prev: any) => ({ ...prev, ...valForm, effective_income: r.effectiveIncome }));
    setEditing(false);
    setSaving(false);
  }

  const updP = (k: string, v: string) => setPropForm((p: any) => ({ ...p, [k]: v }));
  const updV = (k: string, v: string) => setValForm((p: any) => ({ ...p, [k]: v }));

  const Inp = ({ label, k, source, type = "number" }: any) => (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        value={source === "p" ? propForm[k] : valForm[k]}
        onChange={e => source === "p" ? updP(k, e.target.value) : updV(k, e.target.value)}
        className="input-field"
      />
    </div>
  );

  const Sel = ({ label, k, source, options }: any) => (
    <div>
      <label className="label">{label}</label>
      <select
        value={source === "p" ? propForm[k] : valForm[k]}
        onChange={e => source === "p" ? updP(k, e.target.value) : updV(k, e.target.value)}
        className="select-field"
      >
        {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  const locationOpts = [
    { value: "sehr_gut", label: "Sehr gut" },
    { value: "gut",      label: "Gut" },
    { value: "mittel",   label: "Mittel" },
    { value: "schwach",  label: "Schwach" },
  ];

  const conditionOpts = [
    { value: "sehr_gut",    label: "Sehr gut" },
    { value: "gut",         label: "Gut" },
    { value: "mittel",      label: "Mittel" },
    { value: "renovations", label: "Renovationsbedürftig" },
  ];

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
            <span className="font-bold text-base text-gray-900">
              MFH <span className="text-blue-600">Bewertung</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-800 text-sm">&larr; Dashboard</Link>
            <button onClick={async () => { await supabase.auth.signOut(); router.push("/"); }} className="btn-ghost text-xs px-4 py-2">Abmelden</button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-10 pb-20">
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">{property?.name ?? "Bewertung"}</h1>
            <p className="text-gray-500 text-sm">{property?.address}, {property?.city}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {!editing && <PDFDownloadButton valuationId={id} />}
            <button
              onClick={() => setEditing(!editing)}
              className={editing ? "btn-ghost px-4 py-2.5 text-sm" : "btn-primary px-4 py-2.5 text-sm"}
            >
              {editing ? "Abbrechen" : "✏️ Bearbeiten"}
            </button>
            <Link href="/new" className="btn-accent px-4 py-2.5 text-sm">+ Neue Bewertung</Link>
          </div>
        </div>

        {/* EDIT PANEL */}
        {editing && (
          <div className="card mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Daten bearbeiten</h3>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-5">
              {(["objekt", "ertraege", "lage"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === t
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t === "objekt" ? "Objekt" : t === "ertraege" ? "Erträge" : "Lage"}
                </button>
              ))}
            </div>

            {/* Objekt */}
            {activeTab === "objekt" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Inp label="Bezeichnung" k="name" source="p" type="text" />
                </div>
                <Inp label="Strasse / Nr." k="address" source="p" type="text" />
                <Inp label="PLZ" k="zip" source="p" type="text" />
                <div>
                  <label className="label">Ort / Gemeinde</label>
                  <input
                    type="text"
                    value={propForm.city}
                    onChange={e => updP("city", e.target.value)}
                    list="city-edit-list"
                    className="input-field"
                  />
                  <datalist id="city-edit-list">
                    {MUNICIPALITIES.map(m => <option key={m.name} value={m.name} />)}
                  </datalist>
                </div>
                <Sel label="Kanton" k="canton" source="p" options={KANTONE.map(k => ({ value: k, label: k }))} />
                <Inp label="Baujahr" k="build_year" source="p" />
                <Sel label="Zustand" k="condition" source="p" options={conditionOpts} />
                <Inp label="Anzahl Wohnungen" k="num_units" source="p" />
                <Inp label="Wohnfläche (m²)" k="living_area" source="p" />
                <Inp label="Gewerbefläche (m²)" k="commercial_area" source="p" />
              </div>
            )}

            {/* Erträge */}
            {activeTab === "ertraege" && (
              <div className="grid grid-cols-2 gap-4">
                <Inp label="Soll-Mietertrag Wohnen p.a. (CHF)" k="rent_residential" source="v" />
                <Inp label="Soll-Mietertrag Gewerbe p.a. (CHF)" k="rent_commercial" source="v" />
                <Inp label="Ist-Mietertrag total p.a. (CHF)" k="actual_rent" source="v" />
                <Inp label="Leerstandsquote (%)" k="vacancy_rate" source="v" />
                <Inp label="Betriebskosten p.a. (CHF)" k="operating_costs" source="v" />
                <Inp label="Unterhaltskosten p.a. (CHF)" k="maintenance_costs" source="v" />
                <div className="col-span-2">
                  <label className="label">Notizen</label>
                  <textarea
                    value={valForm.notes}
                    onChange={e => updV("notes", e.target.value)}
                    className="input-field resize-none"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Lage */}
            {activeTab === "lage" && (
              <div className="grid grid-cols-2 gap-4">
                <Sel label="Mikrolage" k="micro_location" source="v" options={locationOpts} />
                <Sel label="Makrolage" k="macro_location" source="v" options={locationOpts} />
                <Sel label="ÖV-Anbindung" k="public_transport" source="v" options={locationOpts} />
              </div>
            )}

            <div className="flex gap-3 mt-5 pt-4 border-t border-gray-200">
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