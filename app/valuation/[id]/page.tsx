"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { calculateValuation, formatCHF, formatPct, CONDITION_OPTIONS, QUALITY_OPTIONS } from "@/lib/calculations";
import ResultCard from "@/components/ResultCard";
import PDFDownloadButton from "@/components/PDFDownloadButton";
import { MUNICIPALITIES, KANTONE } from "@/lib/municipalities";
import type { LocationRating } from "@/types";

export default function ValuationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [editing, setEditing]     = useState(false);
  const [activeTab, setActiveTab] = useState<"objekt"|"ertraege"|"lage">("objekt");
  const [valuation, setValuation] = useState<any>(null);
  const [property, setProperty]   = useState<any>(null);
  const [result, setResult]       = useState<any>(null);
  const [propForm, setPropForm]   = useState<any>({});
  const [valForm, setValForm]     = useState<any>({});

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
        renov_year:      data.properties?.renov_year ?? "",
        condition:       data.properties?.condition ?? "stufe4",
        build_quality:   data.properties?.build_quality ?? "gut",
        num_units:       data.properties?.num_units ?? "",
        living_area:     data.properties?.living_area ?? "",
        commercial_area: data.properties?.commercial_area ?? "",
      });
      setValForm({
        rent_residential:         data.rent_residential ?? "",
        rent_commercial:          data.rent_commercial ?? "",
        rent_residential_actual:  data.rent_residential_actual ?? "",
        rent_commercial_actual:   data.rent_commercial_actual ?? "",
        vacancy_rate:             data.vacancy_rate ?? "0",
        vacancy_avg5y:            data.vacancy_avg5y ?? "0",
        operating_costs:          data.operating_costs ?? "",
        maintenance_costs:        data.maintenance_costs ?? "",
        aap_count:                data.aap_count ?? "0",
        ehp_count:                data.ehp_count ?? "0",
        micro_location:           data.micro_location ?? "gut",
        macro_location:           data.macro_location ?? "gut",
        public_transport:         data.public_transport ?? "gut",
        notes:                    data.notes ?? "",
        pros:                     data.pros ?? "",
        cons:                     data.cons ?? "",
      });

      recompute(data, data.properties);
      setLoading(false);
    }
    load();
  }, [id, router]);

  function recompute(val: any, prop: any) {
    try {
      const r = calculateValuation({
        city:                  prop?.city ?? "",
        condition:             prop?.condition ?? "stufe4",
        buildYear:             prop?.build_year  ? +prop.build_year  : undefined,
        renovYear:             prop?.renov_year  ? +prop.renov_year  : undefined,
        buildQuality:          prop?.build_quality ?? "gut",
        rentResidentialTarget: +val.rent_residential || 0,
        rentCommercialTarget:  +val.rent_commercial  || 0,
        rentResidentialActual: +val.rent_residential_actual || 0,
        rentCommercialActual:  +val.rent_commercial_actual  || 0,
        vacancyRate:           +val.vacancy_rate    || 0,
        vacancyAvg5y:          +val.vacancy_avg5y   || 0,
        operatingCosts:        +val.operating_costs  || 0,
        maintenanceCosts:      +val.maintenance_costs || 0,
        livingArea:            +prop?.living_area    || 0,
        commercialArea:        +prop?.commercial_area || 0,
        aapCount:              +val.aap_count || 0,
        ehpCount:              +val.ehp_count || 0,
        microLocation:         val.micro_location  ?? "gut",
        macroLocation:         val.macro_location  ?? "gut",
        publicTransport:       val.public_transport ?? "gut",
      });
      setResult(r);
    } catch (e) { console.error(e); }
  }

  async function handleSave() {
    setSaving(true);

    await supabase.from("properties").update({
      name:            propForm.name,
      address:         propForm.address,
      city:            propForm.city,
      canton:          propForm.canton,
      zip:             propForm.zip || null,
      build_year:      propForm.build_year  ? +propForm.build_year  : null,
      renov_year:      propForm.renov_year  ? +propForm.renov_year  : null,
      build_quality:   propForm.build_quality || "gut",
      condition:       propForm.condition,
      num_units:       propForm.num_units   ? +propForm.num_units   : null,
      living_area:     propForm.living_area ? +propForm.living_area : null,
      commercial_area: propForm.commercial_area ? +propForm.commercial_area : null,
    }).eq("id", valuation.property_id);

    const mergedProp = { ...property, ...propForm };
    const r = calculateValuation({
      city:                  mergedProp.city ?? "",
      condition:             mergedProp.condition ?? "stufe4",
      buildYear:             mergedProp.build_year  ? +mergedProp.build_year  : undefined,
      renovYear:             mergedProp.renov_year  ? +mergedProp.renov_year  : undefined,
      buildQuality:          mergedProp.build_quality ?? "gut",
      rentResidentialTarget: +valForm.rent_residential || 0,
      rentCommercialTarget:  +valForm.rent_commercial  || 0,
      rentResidentialActual: +valForm.rent_residential_actual || 0,
      rentCommercialActual:  +valForm.rent_commercial_actual  || 0,
      vacancyRate:           +valForm.vacancy_rate    || 0,
      vacancyAvg5y:          +valForm.vacancy_avg5y   || 0,
      operatingCosts:        +valForm.operating_costs  || 0,
      maintenanceCosts:      +valForm.maintenance_costs || 0,
      livingArea:            +propForm.living_area    || 0,
      commercialArea:        +propForm.commercial_area || 0,
      aapCount:              +valForm.aap_count || 0,
      ehpCount:              +valForm.ehp_count || 0,
      microLocation:         valForm.micro_location,
      macroLocation:         valForm.macro_location,
      publicTransport:       valForm.public_transport,
    });

    await supabase.from("valuations").update({
      rent_residential:        +valForm.rent_residential || 0,
      rent_commercial:         +valForm.rent_commercial  || 0,
      rent_residential_actual: valForm.rent_residential_actual ? +valForm.rent_residential_actual : null,
      rent_commercial_actual:  valForm.rent_commercial_actual  ? +valForm.rent_commercial_actual  : null,
      vacancy_rate:            +valForm.vacancy_rate    || 0,
      vacancy_avg5y:           +valForm.vacancy_avg5y   || 0,
      operating_costs:         +valForm.operating_costs  || 0,
      maintenance_costs:       +valForm.maintenance_costs || 0,
      aap_count:               +valForm.aap_count || 0,
      ehp_count:               +valForm.ehp_count || 0,
      micro_location:          valForm.micro_location,
      macro_location:          valForm.macro_location,
      public_transport:        valForm.public_transport,
      notes:                   valForm.notes || null,
      pros:                    valForm.pros || null,
      cons:                    valForm.cons || null,
      cap_rate:                r.capRateBreakdown.final,
      gross_income:            r.grossIncome,
      effective_income:        r.effectiveIncome,
      net_income:              r.netIncome > 0 ? r.netIncome : null,
      value_simple:            r.valueSimple,
      value_extended:          r.valueExtended > 0 ? r.valueExtended : null,
      value_conservative:      r.valueConservative,
      value_optimistic:        r.valueOptimistic,
      base_cap_rate:           r.capRateBreakdown.base,
      condition_delta:         r.capRateBreakdown.conditionDelta,
      commercial_surcharge:    r.capRateBreakdown.commercialSurcharge,
      micro_correction:        r.capRateBreakdown.microDelta,
      oev_correction:          r.capRateBreakdown.oevDelta,
      location_category:       r.locationCategory,
      confidence:              r.confidence,
    }).eq("id", id);

    setResult(r);
    setProperty(mergedProp);
    setValuation((prev: any) => ({ ...prev, ...valForm, effective_income: r.effectiveIncome }));
    setEditing(false);
    setSaving(false);
  }

  const updP = (k: string, v: string) => setPropForm((p: any) => ({ ...p, [k]: v }));
  const updV = (k: string, v: string) => setValForm((p: any)  => ({ ...p, [k]: v }));

  function Inp({ label, k, source, type = "number", note }: any) {
    return (
      <div>
        <label className="label">{label}</label>
        <input type={type} value={source === "p" ? propForm[k] : valForm[k]}
          onChange={e => source === "p" ? updP(k, e.target.value) : updV(k, e.target.value)}
          className="input-field" />
        {note && <p className="text-xs text-gray-400 mt-1">{note}</p>}
      </div>
    );
  }

  function Sel({ label, k, source, options }: any) {
    return (
      <div>
        <label className="label">{label}</label>
        <select value={source === "p" ? propForm[k] : valForm[k]}
          onChange={e => source === "p" ? updP(k, e.target.value) : updV(k, e.target.value)}
          className="select-field">
          {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    );
  }

  const locationOpts = [
    { value: "sehr_gut", label: "Sehr gut" },
    { value: "gut",      label: "Gut" },
    { value: "mittel",   label: "Mittel" },
    { value: "schwach",  label: "Schwach" },
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
            <button onClick={async () => { await supabase.auth.signOut(); router.push("/"); }}
              className="btn-ghost text-xs px-4 py-2">Abmelden</button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-10 pb-20">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">{property?.name ?? "Bewertung"}</h1>
            <p className="text-gray-500 text-sm">{property?.address}, {property?.city}</p>
            {property?.build_year && (
              <p className="text-gray-400 text-xs mt-0.5">
                Baujahr {property.build_year}
                {property.renov_year && ` · Sanierung ${property.renov_year}`}
                {" · "}{CONDITION_OPTIONS.find(o => o.value === property.condition)?.label ?? ""}
                {" · "}{QUALITY_OPTIONS.find(o => o.value === property.build_quality)?.label ?? ""}
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {!editing && <PDFDownloadButton valuationId={id} />}
            <button onClick={() => setEditing(!editing)}
              className={editing ? "btn-ghost px-4 py-2.5 text-sm" : "btn-primary px-4 py-2.5 text-sm"}>
              {editing ? "Abbrechen" : "Bearbeiten"}
            </button>
            <Link href="/new" className="btn-accent px-4 py-2.5 text-sm">+ Neue Bewertung</Link>
          </div>
        </div>

        {/* Edit Panel */}
        {editing && (
          <div className="card mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Daten bearbeiten</h3>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-5">
              {(["objekt","ertraege","lage"] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === t ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}>
                  {t === "objekt" ? "Objekt" : t === "ertraege" ? "Ertraege" : "Lage"}
                </button>
              ))}
            </div>

            {activeTab === "objekt" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Inp label="Bezeichnung" k="name" source="p" type="text" /></div>
                <Inp label="Strasse / Nr." k="address" source="p" type="text" />
                <Inp label="PLZ" k="zip" source="p" type="text" />
                <div>
                  <label className="label">Ort / Gemeinde</label>
                  <input type="text" value={propForm.city} onChange={e => updP("city", e.target.value)}
                    list="city-edit-list" className="input-field" />
                  <datalist id="city-edit-list">
                    {MUNICIPALITIES.map(m => <option key={m.name} value={m.name} />)}
                  </datalist>
                </div>
                <Sel label="Kanton" k="canton" source="p" options={KANTONE.map(k => ({ value: k, label: k }))} />
                <Inp label="Baujahr" k="build_year" source="p" />
                <Inp label="Sanierungsjahr" k="renov_year" source="p" />
                <Sel label="Zustand" k="condition" source="p" options={CONDITION_OPTIONS.map(o => ({ value: o.value, label: o.label }))} />
                <Sel label="Bauqualitaet" k="build_quality" source="p" options={QUALITY_OPTIONS.map(o => ({ value: o.value, label: o.label }))} />
                <Inp label="Anzahl Wohnungen" k="num_units" source="p" />
                <Inp label="Wohnflaeche (m2)" k="living_area" source="p" />
                <Inp label="Gewerbeflaeche (m2)" k="commercial_area" source="p" />
              </div>
            )}

            {activeTab === "ertraege" && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Soll-Mietertrag</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Inp label="Wohnen p.a. (CHF)" k="rent_residential" source="v" />
                    <Inp label="Gewerbe p.a. (CHF)" k="rent_commercial" source="v" />
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Ist-Mietertrag</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Inp label="Wohnen p.a. (CHF)" k="rent_residential_actual" source="v" note="Leer = identisch mit Soll" />
                    <Inp label="Gewerbe p.a. (CHF)" k="rent_commercial_actual"  source="v" note="Leer = identisch mit Soll" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Inp label="Leerstand aktuell (%)"    k="vacancy_rate"  source="v" />
                  <Inp label="Leerstand Ø 5 Jahre (%)"  k="vacancy_avg5y" source="v" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Inp label="Betriebskosten p.a."   k="operating_costs"   source="v" />
                  <Inp label="Unterhaltskosten p.a." k="maintenance_costs"  source="v" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Inp label="Abstellplaetze Aussen (AAP)" k="aap_count" source="v" />
                  <Inp label="Einstellhalle / Garagen (EHP)" k="ehp_count" source="v" />
                </div>
                <div>
                  <label className="label">Notizen</label>
                  <textarea value={valForm.notes} onChange={e => updV("notes", e.target.value)}
                    className="input-field resize-none" rows={3} />
                </div>
              </div>
            )}

            {activeTab === "lage" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Sel label="Mikrolage"     k="micro_location"   source="v" options={locationOpts} />
                  <Sel label="Makrolage"     k="macro_location"   source="v" options={locationOpts} />
                  <Sel label="OeV-Anbindung" k="public_transport" source="v" options={locationOpts} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Wertsteigernde Faktoren</label>
                    <textarea value={valForm.pros} onChange={e => updV("pros", e.target.value)}
                      className="input-field resize-none text-green-700" rows={3} placeholder="Positive Aspekte..." />
                  </div>
                  <div>
                    <label className="label">Wertmindernde Faktoren</label>
                    <textarea value={valForm.cons} onChange={e => updV("cons", e.target.value)}
                      className="input-field resize-none text-red-600" rows={3} placeholder="Negative Aspekte / Risiken..." />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-5 pt-4 border-t border-gray-200">
              <button onClick={handleSave} disabled={saving} className="btn-accent px-6 py-2.5">
                {saving ? "Wird gespeichert..." : "Speichern"}
              </button>
              <button onClick={() => setEditing(false)} className="btn-ghost px-6 py-2.5">Abbrechen</button>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <ResultCard
            result={result}
            effectiveIncome={valuation.effective_income}
            buildYear={property?.build_year ?? undefined}
            renovYear={property?.renov_year ?? undefined}
            livingArea={property?.living_area ?? undefined}
            condition={property?.condition ?? undefined}
          />
        )}

        {(valuation.pros || valuation.cons) && !editing && (
          <div className="card mt-5">
            <div className="grid grid-cols-2 gap-6">
              {valuation.pros && (
                <div>
                  <h4 className="text-xs font-semibold text-green-600 uppercase tracking-widest mb-2">Wertsteigernde Faktoren</h4>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{valuation.pros}</p>
                </div>
              )}
              {valuation.cons && (
                <div>
                  <h4 className="text-xs font-semibold text-red-500 uppercase tracking-widest mb-2">Wertmindernde Faktoren</h4>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{valuation.cons}</p>
                </div>
              )}
            </div>
          </div>
        )}

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