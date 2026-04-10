"use client";

import { useState } from "react";
import { MUNICIPALITIES, KANTONE, lookupMunicipality } from "@/lib/municipalities";
import { calculateValuation, CONDITION_OPTIONS, QUALITY_OPTIONS, LOCATION_INFO, formatCHF, formatPct } from "@/lib/calculations";
import type { LocationRating, ValuationResult, Municipality } from "@/types";
import AddressSearch from "@/components/AddressSearch";

interface FormWizardProps {
  onComplete: (property: any, valuation: any, result: ValuationResult) => Promise<void>;
  saving: boolean;
}

const STEPS = ["Objekt", "Wohnungen", "Ertraege", "Parkplaetze", "Lage", "Ueberpruefen"];

const ZIMMER_TYPEN = ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5+"];
const ZIMMER_KEYS  = ["units_1z","units_1_5z","units_2z","units_2_5z","units_3z","units_3_5z","units_4z","units_4_5z","units_5z","units_5plus"];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8 overflow-x-auto pb-2">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div className={i < current ? "step-dot-done" : i === current ? "step-dot-active" : "step-dot-pending"}>
              {i < current ? "+" : i + 1}
            </div>
            <span className={`text-[10px] whitespace-nowrap ${i === current ? "text-blue-600 font-semibold" : "text-gray-400"}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-6 h-px mx-1 mb-4 ${i < current ? "bg-blue-500" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function InfoBox({ text, criteria }: { text: string; criteria?: readonly string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1">
      <button type="button" onClick={() => setOpen(!open)} className="text-[11px] text-blue-500 hover:text-blue-700 flex items-center gap-1">
        i Kriterien anzeigen
      </button>
      {open && (
        <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700 mb-2">{text}</p>
          {criteria && <ul className="text-xs text-blue-600 space-y-1">{criteria.map((c, i) => <li key={i}>- {c}</li>)}</ul>}
        </div>
      )}
    </div>
  );
}

function FField({ label, value, onChange, error, type = "number", placeholder = "", list, note }: {
  label: string; value: string; onChange: (v: string) => void;
  error?: string; type?: string; placeholder?: string; list?: string; note?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} list={list}
        className={`input-field ${error ? "border-red-400 ring-1 ring-red-300" : ""}`} />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {note && <p className="text-xs text-gray-400 mt-1">{note}</p>}
    </div>
  );
}

function FSel({ label, value, onChange, options, info }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string; desc?: string }[];
  info?: { desc: string; criteria?: readonly string[] };
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="select-field">
        {options.map(o => <option key={o.value} value={o.value} title={o.desc}>{o.label}</option>)}
      </select>
      {info && <InfoBox text={info.desc} criteria={info.criteria} />}
    </div>
  );
}

export default function FormWizard({ onComplete, saving }: FormWizardProps) {
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dynamicMuni, setDynamicMuni] = useState<Municipality | null>(null);

  const [property, setProperty] = useState({
    name: "", address: "", city: "", canton: "BE", zip: "",
    build_year: "", renov_year: "",
    condition: "stufe4", build_quality: "gut",
    num_units: "", living_area: "", commercial_area: "0", commercial_units: "0",
    units_1z: "0", units_1_5z: "0", units_2z: "0", units_2_5z: "0",
    units_3z: "0", units_3_5z: "0", units_4z: "0", units_4_5z: "0",
    units_5z: "0", units_5plus: "0",
  });

  const [valuation, setValuation] = useState({
    rent_residential: "", rent_commercial: "0",
    rent_residential_actual: "", rent_commercial_actual: "0",
    vacancy_rate: "0", vacancy_avg5y: "0",
    operating_costs: "", maintenance_costs: "",
    aap_count: "0", ehp_count: "0",
    micro_location: "gut" as LocationRating,
    macro_location: "gut" as LocationRating,
    public_transport: "gut" as LocationRating,
    notes: "",
    pros: "",
    cons: "",
  });

  const updP = (k: string, v: string) => setProperty(p => ({ ...p, [k]: v }));
  const updV = (k: string, v: string) => setValuation(p => ({ ...p, [k]: v }));

  // Wohnungssumme für Validierung
  const totalUnitsFromRaster = ZIMMER_KEYS.reduce((s, k) => s + (+( property as any)[k] || 0), 0);

  const liveResult = (() => {
    if (!property.city || !valuation.rent_residential) return null;
    try {
      return calculateValuation({
        city: property.city,
        condition: property.condition,
        buildYear: property.build_year ? +property.build_year : undefined,
        renovYear: property.renov_year ? +property.renov_year : undefined,
        buildQuality: property.build_quality,
        rentResidentialTarget: +valuation.rent_residential || 0,
        rentCommercialTarget:  +valuation.rent_commercial  || 0,
        rentResidentialActual: +valuation.rent_residential_actual || 0,
        rentCommercialActual:  +valuation.rent_commercial_actual  || 0,
        vacancyRate:      +valuation.vacancy_rate    || 0,
        vacancyAvg5y:     +valuation.vacancy_avg5y   || 0,
        operatingCosts:   +valuation.operating_costs  || 0,
        maintenanceCosts: +valuation.maintenance_costs || 0,
        livingArea:    +property.living_area    || 0,
        commercialArea:+property.commercial_area || 0,
        aapCount: +valuation.aap_count || 0,
        ehpCount: +valuation.ehp_count || 0,
        microLocation:   valuation.micro_location,
        macroLocation:   valuation.macro_location,
        publicTransport: valuation.public_transport,
      });
    } catch { return null; }
  })();

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!property.name.trim())    e.name      = "Pflichtfeld";
      if (!property.city.trim())    e.city      = "Pflichtfeld";
      if (!property.address.trim()) e.address   = "Pflichtfeld";
      if (!property.num_units)      e.num_units = "Pflichtfeld";
    }
    if (step === 2) {
      if (!valuation.rent_residential) e.rent_residential = "Pflichtfeld";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const next = () => { if (validate()) setStep(s => s + 1); };
  const prev = () => { setStep(s => s - 1); setErrors({}); };
  async function handleSubmit() { if (!liveResult) return; await onComplete(property, valuation, liveResult); }

  const locationOpts = [
    { value: "sehr_gut", label: "Sehr gut" },
    { value: "gut",      label: "Gut" },
    { value: "mittel",   label: "Mittel" },
    { value: "schwach",  label: "Schwach" },
  ];

  return (
    <div className="max-w-xl mx-auto">
      <StepBar current={step} />
      <div className="card">

        {/* ── STEP 0: OBJEKT ── */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Objektdaten</h2>
            <p className="text-gray-400 text-sm mb-5">Grundlegende Informationen zum Mehrfamilienhaus.</p>

            <FField label="Bezeichnung *" value={property.name} onChange={v => updP("name", v)} error={errors.name} type="text" placeholder="z. B. MFH Musterstrasse" />

            <AddressSearch
              initialValue={property.address}
              onSelect={r => {
                updP("address", r.street);
                updP("zip", r.zip);
                updP("city", r.city);
                updP("canton", r.canton.toUpperCase());
                if (!property.name) updP("name", `MFH ${r.street}`);
                // Gemeinde dynamisch nachschlagen (Einwohnerzahl)
                lookupMunicipality(r.city, r.canton.toUpperCase()).then(m => {
                  if (m) setDynamicMuni(m);
                });
              }}
            />

            <div className="grid grid-cols-3 gap-3">
              <FField label="Strasse / Nr. *" value={property.address} onChange={v => updP("address", v)} error={errors.address} type="text" placeholder="Musterstrasse 12" />
              <FField label="PLZ" value={property.zip} onChange={v => updP("zip", v)} type="text" placeholder="3006" />
              <div>
                <FField label="Ort / Gemeinde *" value={property.city} onChange={v => updP("city", v)} error={errors.city} type="text" placeholder="Bern" list="city-list" />
                <datalist id="city-list">{MUNICIPALITIES.map(m => <option key={m.name} value={m.name} />)}</datalist>
              </div>
            </div>

            <FSel label="Kanton" value={property.canton} onChange={v => updP("canton", v)} options={KANTONE.map(k => ({ value: k, label: k }))} />

            {/* Baujahr + Sanierung */}
            <div className="grid grid-cols-2 gap-3">
              <FField label="Baujahr" value={property.build_year} onChange={v => updP("build_year", v)} placeholder="1975" />
              <div>
                <FField label="Sanierungsjahr" value={property.renov_year} onChange={v => updP("renov_year", v)} placeholder="2010" note="Letzte Grossrenovation" />
              </div>
            </div>

            {/* Automatische Altersanzeige */}
            {property.build_year && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-xs text-gray-500">
                {(() => {
                  const age = new Date().getFullYear() - +property.build_year;
                  const renovAge = property.renov_year ? new Date().getFullYear() - +property.renov_year : null;
                  return (
                    <span>
                      Gebäudealter: <strong>{age} Jahre</strong>
                      {renovAge !== null && ` · Seit letzter Sanierung: `}
                      {renovAge !== null && <strong>{renovAge} Jahre</strong>}
                    </span>
                  );
                })()}
              </div>
            )}

            {/* Zustand + Bauqualität */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FSel label="Zustand Gebaeude" value={property.condition} onChange={v => updP("condition", v)}
                  options={CONDITION_OPTIONS.map(o => ({ value: o.value, label: o.label, desc: o.desc }))} />
                {property.condition && <p className="text-xs text-gray-400 mt-1">{CONDITION_OPTIONS.find(o => o.value === property.condition)?.desc}</p>}
              </div>
              <div>
                <FSel label="Bauqualitaet" value={property.build_quality} onChange={v => updP("build_quality", v)}
                  options={QUALITY_OPTIONS.map(o => ({ value: o.value, label: o.label, desc: o.desc }))} />
                {property.build_quality && <p className="text-xs text-gray-400 mt-1">{QUALITY_OPTIONS.find(o => o.value === property.build_quality)?.desc}</p>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <FField label="Anz. Wohnungen *" value={property.num_units} onChange={v => updP("num_units", v)} error={errors.num_units} placeholder="8" />
              <FField label="Wohnflaeche (m2)" value={property.living_area} onChange={v => updP("living_area", v)} placeholder="620" />
              <FField label="Gewerbeflaeche (m2)" value={property.commercial_area} onChange={v => updP("commercial_area", v)} placeholder="0" />
            </div>

            {property.city && (() => {
              const m = MUNICIPALITIES.find(x => x.name.toLowerCase() === property.city.toLowerCase()) ?? dynamicMuni;
              const lageLabels: Record<string, string> = { sehrStark: "Sehr stark", gut: "Gut", durchschnitt: "Durchschnittlich", sekundaer: "Sekundaer" };
              return m ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-700">
                  <strong>Gemeinde-Info:</strong> {m.name}, {m.canton} · {m.population.toLocaleString("de-CH")} Einwohner · {m.type} · Lageklasse: <strong>{lageLabels[m.locationClass]}</strong>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-500">
                  Gemeinde &quot;{property.city}&quot; nicht in Datenbank. Einwohnerzahl wird beim Speichern ermittelt.
                </div>
              );
            })()}
          </div>
        )}

        {/* ── STEP 1: WOHNUNGSRASTER + GEWERBE ── */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Wohnungen &amp; Gewerbe</h2>
            <p className="text-gray-400 text-sm mb-5">Anzahl Wohnungen pro Zimmerkategorie und Gewerbeeinheiten.</p>

            {/* Wohnungen - vertikal */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Wohnungen nach Zimmerzahl</p>
              <div className="space-y-2">
                {ZIMMER_TYPEN.map((z, i) => (
                  <div key={z} className="flex items-center gap-3">
                    <span className="w-16 text-sm text-gray-600 font-medium">{z} Zimmer</span>
                    <input
                      type="number"
                      min="0"
                      value={(property as any)[ZIMMER_KEYS[i]]}
                      onChange={e => updP(ZIMMER_KEYS[i], e.target.value)}
                      className="w-20 text-center input-field py-1.5 text-sm"
                      placeholder="0"
                    />
                    {+(property as any)[ZIMMER_KEYS[i]] > 0 && (
                      <span className="text-xs text-gray-400">{(property as any)[ZIMMER_KEYS[i]]} Whg</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Gewerbeeinheiten */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Gewerbeeinheiten</p>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="w-16 text-sm text-gray-600 font-medium">Anzahl</span>
                  <input
                    type="number"
                    min="0"
                    value={property.commercial_units ?? "0"}
                    onChange={e => updP("commercial_units", e.target.value)}
                    className="w-20 text-center input-field py-1.5 text-sm"
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-400">Gewerbeeinheiten (Laden, Buero, etc.)</span>
                </div>
              </div>
            </div>

            {/* Zusammenfassung */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Wohnungen aus Raster:</span>
                <span className={`font-bold ${totalUnitsFromRaster !== +property.num_units && +property.num_units > 0 ? "text-amber-600" : "text-green-600"}`}>
                  {totalUnitsFromRaster}
                </span>
              </div>
              {totalUnitsFromRaster !== +property.num_units && +property.num_units > 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  Hinweis: Summe ({totalUnitsFromRaster}) weicht von Anzahl Wohnungen ({property.num_units}) ab.
                </p>
              )}
              {+(property.commercial_units ?? 0) > 0 && (
                <div className="flex justify-between text-sm mt-2 pt-2 border-t border-gray-200">
                  <span className="text-gray-500">Gewerbeeinheiten:</span>
                  <span className="font-bold text-gray-700">{property.commercial_units}</span>
                </div>
              )}
            </div>

            {/* Verteilung visuell */}
            {totalUnitsFromRaster > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Verteilung</p>
                {ZIMMER_TYPEN.map((z, i) => {
                  const count = +(property as any)[ZIMMER_KEYS[i]] || 0;
                  if (count === 0) return null;
                  const pct = Math.round((count / totalUnitsFromRaster) * 100);
                  return (
                    <div key={z} className="flex items-center gap-2 text-xs">
                      <span className="w-12 text-gray-500 text-right">{z} Zi</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-20 text-gray-600">{count} Whg ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-xs text-gray-400">
              Das Raster dient der Dokumentation. Der Wohnungsmix hat gemäss IAZI keinen direkten Einfluss auf den Schätzwert.
            </p>
          </div>
        )}

        {/* ── STEP 2: ERTRAEGE ── */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Ertragsdaten</h2>
            <p className="text-gray-400 text-sm mb-5">Soll- und Ist-Ertraege getrennt nach Nutzungsart.</p>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Soll-Mietertrag (nachhaltig erzielbar)</p>
              <div className="grid grid-cols-2 gap-3">
                <FField label="Wohnen p.a. (CHF) *" value={valuation.rent_residential} onChange={v => updV("rent_residential", v)} error={errors.rent_residential} placeholder="120000" />
                <FField label="Gewerbe p.a. (CHF)" value={valuation.rent_commercial} onChange={v => updV("rent_commercial", v)} placeholder="0" />
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Ist-Mietertrag (gemaess Mietvertraegen)</p>
              <p className="text-xs text-gray-400 mb-3">Leer lassen wenn identisch mit Soll-Ertrag</p>
              <div className="grid grid-cols-2 gap-3">
                <FField label="Wohnen p.a. (CHF)" value={valuation.rent_residential_actual} onChange={v => updV("rent_residential_actual", v)} placeholder="optional" />
                <FField label="Gewerbe p.a. (CHF)" value={valuation.rent_commercial_actual} onChange={v => updV("rent_commercial_actual", v)} placeholder="optional" />
              </div>
            </div>

            {liveResult && (liveResult.sollIstDiffWohnen > 0 || liveResult.sollIstDiffGewerbe > 0) && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-xs text-amber-700">
                <strong>Mietpotenzial bei Neuvermietung:</strong>
                {liveResult.sollIstDiffWohnen > 0 && ` Wohnen +${formatCHF(liveResult.sollIstDiffWohnen)}/Jahr`}
                {liveResult.sollIstDiffGewerbe > 0 && `, Gewerbe +${formatCHF(liveResult.sollIstDiffGewerbe)}/Jahr`}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <FField label="Leerstandsquote aktuell (%)" value={valuation.vacancy_rate} onChange={v => updV("vacancy_rate", v)} placeholder="0" />
              <FField label="Leerstand Ø letzte 5 Jahre (%)" value={valuation.vacancy_avg5y} onChange={v => updV("vacancy_avg5y", v)} placeholder="0" note="Fuer nachhaltige Ertragsbasis" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FField label="Betriebskosten p.a. (CHF)" value={valuation.operating_costs} onChange={v => updV("operating_costs", v)} placeholder="8000" />
              <FField label="Unterhaltskosten p.a. (CHF)" value={valuation.maintenance_costs} onChange={v => updV("maintenance_costs", v)} placeholder="6000" />
            </div>

            {liveResult && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-[10px] text-blue-600 uppercase tracking-widest font-semibold mb-3">Live-Vorschau</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ["Brutto-Soll", formatCHF(+valuation.rent_residential + +valuation.rent_commercial)],
                    ["Eff. Ertrag", formatCHF(liveResult.effectiveIncome)],
                    ["Kap.-Satz",   formatPct(liveResult.capRateBreakdown.final)],
                  ].map(([l, v]) => (
                    <div key={l}><p className="text-[10px] text-blue-500 mb-0.5">{l}</p><p className="text-sm font-bold text-blue-700">{v}</p></div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: PARKPLAETZE ── */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Parkplaetze</h2>
            <p className="text-gray-400 text-sm mb-5">Parkplaetze generieren zusaetzlichen Mietertrag.</p>
            <div className="grid grid-cols-2 gap-4">
              <FField label="Abstellplaetze Aussen (AAP)" value={valuation.aap_count} onChange={v => updV("aap_count", v)} placeholder="0" note="Offene / ueberdachte Aussenparkplaetze" />
              <FField label="Einstellhalle / Garagen (EHP)" value={valuation.ehp_count} onChange={v => updV("ehp_count", v)} placeholder="0" note="Tiefgarage, Einzelgarage, Carport innen" />
            </div>
            {liveResult && (+valuation.aap_count > 0 || +valuation.ehp_count > 0) ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-[10px] text-green-700 uppercase tracking-widest font-semibold mb-2">Automatischer Parkplatz-Ertrag</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Lagekategorie</p>
                    <p className="font-semibold text-gray-800">
                      {liveResult.locationCategory === "sehrStark" ? "Staedtisch" : liveResult.locationCategory === "gut" ? "Agglomeration gut" : liveResult.locationCategory === "durchschnitt" ? "Agglomeration" : "Laendlich"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Parkplatz-Ertrag p.a.</p>
                    <p className="font-bold text-green-700">{formatCHF(liveResult.parkingIncome)}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">Ansaetze gemaess Marktstandard (AAP/EHP nach Lage)</p>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-500">
                Keine Parkplaetze vorhanden - Ertrag wird nicht eingerechnet.
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: LAGE ── */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Lage &amp; Faktoren</h2>
            <p className="text-gray-400 text-sm mb-5">Lagefaktoren beeinflussen den Kapitalisierungssatz direkt.</p>

            <div className="grid grid-cols-2 gap-3">
              <FSel label="Mikrolage" value={valuation.micro_location} onChange={v => updV("micro_location", v)} options={locationOpts} info={LOCATION_INFO.mikrolage} />
              <FSel label="Makrolage" value={valuation.macro_location} onChange={v => updV("macro_location", v)} options={locationOpts} info={LOCATION_INFO.makrolage} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FSel label="OeV-Anbindung" value={valuation.public_transport} onChange={v => updV("public_transport", v)} options={locationOpts} info={LOCATION_INFO.oev} />
              <div />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Wertsteigernde Faktoren</label>
                <textarea value={valuation.pros} onChange={e => updV("pros", e.target.value)}
                  className="input-field resize-none text-green-700" rows={3} placeholder="z. B. zentrale Lage, Minergie, Lift, Balkon, guter Ausbaustandard..." />
                <p className="text-xs text-gray-400 mt-1">Positive Aspekte der Liegenschaft</p>
              </div>
              <div>
                <label className="label">Wertmindernde Faktoren</label>
                <textarea value={valuation.cons} onChange={e => updV("cons", e.target.value)}
                  className="input-field resize-none text-red-600" rows={3} placeholder="z. B. Laermbelastung, fehlende Isolation, Sanierungsstau, Altlasten..." />
                <p className="text-xs text-gray-400 mt-1">Negative Aspekte / Risiken</p>
              </div>
            </div>

            <div>
              <label className="label">Notizen / Bemerkungen</label>
              <textarea value={valuation.notes} onChange={e => updV("notes", e.target.value)}
                className="input-field resize-none" rows={3} placeholder="Optionale Anmerkungen..." />
            </div>

            {property.city && (() => {
              const m = MUNICIPALITIES.find(x => x.name.toLowerCase() === property.city.toLowerCase()) ?? dynamicMuni;
              const lageLabels: Record<string, string> = { sehrStark: "Sehr stark", gut: "Gut", durchschnitt: "Durchschnittlich", sekundaer: "Sekundaer" };
              return (
                <div className={`rounded-xl p-4 border ${m ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"}`}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 text-blue-600">Gemeinde-Klassifikation</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><span className="text-gray-500">Gemeinde:</span> <strong>{property.city}</strong></div>
                    <div><span className="text-gray-500">Typ:</span> <strong>{m?.type ?? "Nicht in DB"}</strong></div>
                    {m && <div><span className="text-gray-500">Bevoelkerung:</span> <strong>{m.population.toLocaleString("de-CH")}</strong></div>}
                    {m && <div><span className="text-gray-500">Auto-Lage:</span> <strong className="text-blue-600">{lageLabels[m.locationClass]}</strong></div>}
                  </div>
                </div>
              );
            })()}

            {liveResult && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-[10px] text-blue-600 uppercase tracking-widest font-semibold mb-2">Berechnungsvorschau</p>
                <p className="text-sm text-gray-700 leading-relaxed">{liveResult.plausiText}</p>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 5: UEBERPRUEFEN ── */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Ueberpruefen &amp; Speichern</h2>
            <p className="text-gray-400 text-sm mb-5">Pruefen Sie die Eingaben und speichern Sie die Bewertung.</p>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              {[
                ["Objekt",             property.name],
                ["Adresse",            `${property.address}, ${property.zip} ${property.city}`],
                ["Baujahr / Sanierung",property.renov_year ? `${property.build_year} / San. ${property.renov_year}` : property.build_year || "—"],
                ["Zustand",            CONDITION_OPTIONS.find(o => o.value === property.condition)?.label ?? ""],
                ["Bauqualitaet",       QUALITY_OPTIONS.find(o => o.value === property.build_quality)?.label ?? ""],
                ["Wohnungen",          `${property.num_units} (Raster: ${totalUnitsFromRaster})`],
                ["Soll-Ertrag Wohnen", `CHF ${(+valuation.rent_residential || 0).toLocaleString("de-CH")}`],
                ["Soll-Ertrag Gewerbe",`CHF ${(+valuation.rent_commercial  || 0).toLocaleString("de-CH")}`],
                ["Parkplaetze AAP/EHP",`${valuation.aap_count} / ${valuation.ehp_count}`],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between">
                  <span className="text-gray-400">{l}</span>
                  <span className="font-semibold text-gray-800 text-right">{v}</span>
                </div>
              ))}
            </div>

            {liveResult && (
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white">
                <p className="text-[10px] text-blue-200 uppercase tracking-widest font-semibold mb-2">Bewertungsergebnis</p>
                <p className="text-3xl font-black mb-1">{formatCHF(liveResult.valueSimple)}</p>
                <p className="text-blue-200 text-xs">Kap.-Satz: {formatPct(liveResult.capRateBreakdown.final)}</p>
                {liveResult.parkingIncome > 0 && (
                  <p className="text-blue-200 text-xs mt-1">inkl. Parkplatz-Ertrag: {formatCHF(liveResult.parkingIncome)}/Jahr</p>
                )}
                <div className="mt-3 pt-3 border-t border-blue-500 grid grid-cols-3 gap-2 text-xs">
                  <div><p className="text-blue-300">Konservativ</p><p className="font-bold">{formatCHF(liveResult.valueConservative)}</p></div>
                  <div><p className="text-blue-300">Neutral</p><p className="font-bold">{formatCHF(liveResult.valueSimple)}</p></div>
                  <div><p className="text-blue-300">Optimistisch</p><p className="font-bold">{formatCHF(liveResult.valueOptimistic)}</p></div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      <div className="flex justify-between items-center mt-5">
        <button onClick={step === 0 ? undefined : prev} disabled={step === 0} className="btn-ghost px-5 py-2.5 disabled:opacity-30">
          Zurueck
        </button>
        <div className="flex items-center gap-1.5">
          {STEPS.map((_, i) => <span key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? "bg-blue-600" : i < step ? "bg-blue-300" : "bg-gray-200"}`} />)}
        </div>
        {step < STEPS.length - 1
          ? <button onClick={next} className="btn-accent px-6 py-2.5">Weiter</button>
          : <button onClick={handleSubmit} disabled={saving || !liveResult} className="btn-accent px-6 py-2.5">
              {saving ? "Wird gespeichert..." : "Bewertung speichern"}
            </button>
        }
      </div>
    </div>
  );
}