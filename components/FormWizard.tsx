"use client";

import { useState } from "react";
import { MUNICIPALITIES, KANTONE } from "@/lib/municipalities";
import { calculateValuation, CONDITION_OPTIONS, LOCATION_INFO, formatCHF, formatPct } from "@/lib/calculations";
import type { LocationRating, ValuationResult } from "@/types";

interface FormWizardProps {
  onComplete: (property: any, valuation: any, result: ValuationResult) => Promise<void>;
  saving: boolean;
}

const STEPS = ["Objekt", "Erträge", "Parkplätze", "Lage", "Überprüfen"];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8 overflow-x-auto pb-2">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div className={i < current ? "step-dot-done" : i === current ? "step-dot-active" : "step-dot-pending"}>
              {i < current ? "✓" : i + 1}
            </div>
            <span className={`text-[10px] whitespace-nowrap ${i === current ? "text-blue-600 font-semibold" : "text-gray-400"}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-8 h-px mx-1 mb-4 ${i < current ? "bg-blue-500" : "bg-gray-200"}`} />
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
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-[11px] text-blue-500 hover:text-blue-700 flex items-center gap-1"
      >
        <span>ⓘ</span> Kriterien anzeigen
      </button>
      {open && (
        <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700 mb-2">{text}</p>
          {criteria && (
            <ul className="text-xs text-blue-600 space-y-1">
              {criteria.map((c, i) => <li key={i}>• {c}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function FormWizard({ onComplete, saving }: FormWizardProps) {
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [property, setProperty] = useState({
    name: "", address: "", city: "", canton: "BE", zip: "",
    build_year: "", condition: "stufe4",
    num_units: "", living_area: "", commercial_area: "0",
  });

  const [valuation, setValuation] = useState({
    rent_residential: "",          // Soll Wohnen
    rent_commercial: "0",          // Soll Gewerbe
    rent_residential_actual: "",   // Ist Wohnen
    rent_commercial_actual: "0",   // Ist Gewerbe
    vacancy_rate: "0",
    vacancy_avg5y: "0",
    operating_costs: "",
    maintenance_costs: "",
    aap_count: "0",                // Abstellplätze aussen
    ehp_count: "0",                // Einstellhalle/Garage
    micro_location: "gut" as LocationRating,
    macro_location: "gut" as LocationRating,
    public_transport: "gut" as LocationRating,
    notes: "",
  });

  const updP = (k: string, v: string) => setProperty(p => ({ ...p, [k]: v }));
  const updV = (k: string, v: string) => setValuation(p => ({ ...p, [k]: v }));

  // Live-Berechnung
  const liveResult = (() => {
    if (!property.city || !valuation.rent_residential) return null;
    try {
      return calculateValuation({
        city: property.city,
        condition: property.condition,
        rentResidentialTarget: +valuation.rent_residential || 0,
        rentCommercialTarget:  +valuation.rent_commercial || 0,
        rentResidentialActual: +valuation.rent_residential_actual || 0,
        rentCommercialActual:  +valuation.rent_commercial_actual || 0,
        vacancyRate:    +valuation.vacancy_rate || 0,
        vacancyAvg5y:   +valuation.vacancy_avg5y || 0,
        operatingCosts:  +valuation.operating_costs || 0,
        maintenanceCosts: +valuation.maintenance_costs || 0,
        livingArea:     +property.living_area || 0,
        commercialArea: +property.commercial_area || 0,
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
      if (!property.name.trim())    e.name    = "Pflichtfeld";
      if (!property.city.trim())    e.city    = "Pflichtfeld";
      if (!property.address.trim()) e.address = "Pflichtfeld";
      if (!property.num_units)      e.num_units = "Pflichtfeld";
    }
    if (step === 1) {
      if (!valuation.rent_residential) e.rent_residential = "Pflichtfeld";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const next = () => { if (validate()) setStep(s => s + 1); };
  const prev = () => { setStep(s => s - 1); setErrors({}); };

  async function handleSubmit() {
    if (!liveResult) return;
    await onComplete(property, valuation, liveResult);
  }

  const Inp = ({ label, k, source, error, type = "number", placeholder = "", list }: any) => (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        value={source === "p" ? (property as any)[k] : (valuation as any)[k]}
        onChange={e => source === "p" ? updP(k, e.target.value) : updV(k, e.target.value)}
        placeholder={placeholder}
        list={list}
        className={`input-field ${error || errors[k] ? "border-red-400 ring-1 ring-red-300" : ""}`}
      />
      {(error || errors[k]) && <p className="text-xs text-red-500 mt-1">{error || errors[k]}</p>}
    </div>
  );

  const Sel = ({ label, k, source, options, info }: any) => (
    <div>
      <label className="label">{label}</label>
      <select
        value={source === "p" ? (property as any)[k] : (valuation as any)[k]}
        onChange={e => source === "p" ? updP(k, e.target.value) : updV(k, e.target.value)}
        className="select-field"
      >
        {options.map((o: any) => (
          <option key={o.value} value={o.value} title={o.desc}>
            {o.label}
          </option>
        ))}
      </select>
      {info && <InfoBox text={info.desc} criteria={info.criteria} />}
    </div>
  );

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

        {/* STEP 0: OBJEKT */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Objektdaten</h2>
            <p className="text-gray-400 text-sm mb-5">Grundlegende Informationen zum Mehrfamilienhaus.</p>

            <div className="grid grid-cols-1 gap-4">
              <Inp label="Bezeichnung *" k="name" source="p" type="text" placeholder="z. B. MFH Musterstrasse" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Inp label="Strasse / Nr. *" k="address" source="p" type="text" placeholder="Musterstrasse 12" />
              <Inp label="PLZ" k="zip" source="p" type="text" placeholder="3006" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Inp label="Ort / Gemeinde *" k="city" source="p" type="text" placeholder="Bern" list="city-list" />
                <datalist id="city-list">
                  {MUNICIPALITIES.map(m => <option key={m.name} value={m.name} />)}
                </datalist>
              </div>
              <Sel label="Kanton" k="canton" source="p" options={KANTONE.map(k => ({ value: k, label: k }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Inp label="Baujahr" k="build_year" source="p" placeholder="1975" />
              <div>
                <Sel
                  label="Zustand Gebäude"
                  k="condition"
                  source="p"
                  options={CONDITION_OPTIONS.map(o => ({ value: o.value, label: o.label, desc: o.desc }))}
                />
                {property.condition && (
                  <p className="text-xs text-gray-400 mt-1">
                    {CONDITION_OPTIONS.find(o => o.value === property.condition)?.desc}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Inp label="Anz. Wohnungen *" k="num_units" source="p" placeholder="8" />
              <Inp label="Wohnfläche (m²)" k="living_area" source="p" placeholder="620" />
              <Inp label="Gewerbefläche (m²)" k="commercial_area" source="p" placeholder="0" />
            </div>

            {/* Auto-Lage Info */}
            {property.city && (() => {
              const m = MUNICIPALITIES.find(x => x.name.toLowerCase() === property.city.toLowerCase());
              return m ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-700">
                  <strong>Auto-Lageklasse:</strong> {m.type} · {m.name}, {m.canton} ({m.population.toLocaleString("de-CH")} Einw.)
                </div>
              ) : null;
            })()}
          </div>
        )}

        {/* STEP 1: ERTRÄGE */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Ertragsdaten</h2>
            <p className="text-gray-400 text-sm mb-5">Soll- und Ist-Erträge getrennt nach Nutzungsart.</p>

            {/* Soll-Erträge */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                Soll-Mietertrag (nachhaltig erzielbar)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Inp label="Wohnen p.a. (CHF) *" k="rent_residential" source="v" placeholder="120 000" />
                <Inp label="Gewerbe p.a. (CHF)" k="rent_commercial" source="v" placeholder="0" />
              </div>
            </div>

            {/* Ist-Erträge */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">
                Ist-Mietertrag (gemäss Mietverträgen)
              </p>
              <p className="text-xs text-gray-400 mb-3">Leer lassen wenn identisch mit Soll-Ertrag</p>
              <div className="grid grid-cols-2 gap-3">
                <Inp label="Wohnen p.a. (CHF)" k="rent_residential_actual" source="v" placeholder="— optional" />
                <Inp label="Gewerbe p.a. (CHF)" k="rent_commercial_actual" source="v" placeholder="— optional" />
              </div>
            </div>

            {/* Differenz Analyse */}
            {liveResult && (liveResult.sollIstDiffWohnen > 0 || liveResult.sollIstDiffGewerbe > 0) && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-xs text-amber-700">
                <strong>Mietpotenzial:</strong> Wohnen +{formatCHF(liveResult.sollIstDiffWohnen)}/Jahr
                {liveResult.sollIstDiffGewerbe > 0 && `, Gewerbe +${formatCHF(liveResult.sollIstDiffGewerbe)}/Jahr`} bei Neuvermietung.
              </div>
            )}

            {/* Leerstand */}
            <div className="grid grid-cols-2 gap-3">
              <Inp label="Leerstandsquote aktuell (%)" k="vacancy_rate" source="v" placeholder="0" />
              <div>
                <Inp label="Leerstand Ø letzte 5 Jahre (%)" k="vacancy_avg5y" source="v" placeholder="0" />
                <p className="text-xs text-gray-400 mt-1">Wird für nachhaltige Ertragsbasis verwendet</p>
              </div>
            </div>

            {/* Kosten */}
            <div className="grid grid-cols-2 gap-3">
              <Inp label="Betriebskosten p.a. (CHF)" k="operating_costs" source="v" placeholder="8 000" />
              <Inp label="Unterhaltskosten p.a. (CHF)" k="maintenance_costs" source="v" placeholder="6 000" />
            </div>

            {/* Live Preview */}
            {liveResult && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-[10px] text-blue-600 uppercase tracking-widest font-semibold mb-3">Live-Vorschau</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ["Brutto-Soll", formatCHF(+valuation.rent_residential + +valuation.rent_commercial)],
                    ["Eff. Ertrag", formatCHF(liveResult.effectiveIncome)],
                    ["Kap.-Satz",   formatPct(liveResult.capRateBreakdown.final)],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <p className="text-[10px] text-blue-500 mb-0.5">{l}</p>
                      <p className="text-sm font-bold text-blue-700">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: PARKPLÄTZE */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Parkplätze</h2>
            <p className="text-gray-400 text-sm mb-5">Parkplätze generieren zusätzlichen Mietertrag.</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Inp label="Abstellplätze Aussen (AAP)" k="aap_count" source="v" placeholder="0" />
                <p className="text-xs text-gray-400 mt-1">Offene oder überdachte Aussenparkplätze</p>
              </div>
              <div>
                <Inp label="Einstellhalle / Garagen (EHP)" k="ehp_count" source="v" placeholder="0" />
                <p className="text-xs text-gray-400 mt-1">Tiefgarage, Einzelgarage, Carport innen</p>
              </div>
            </div>

            {/* Auto-Berechnung */}
            {liveResult && (+valuation.aap_count > 0 || +valuation.ehp_count > 0) && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-[10px] text-green-700 uppercase tracking-widest font-semibold mb-2">
                  Automatischer Parkplatz-Ertrag
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Lagekategorie</p>
                    <p className="font-semibold text-gray-800">{liveResult.locationCategory === "sehrStark" ? "Städtisch" : liveResult.locationCategory === "gut" ? "Agglomeration" : "Ländlich"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Parkplatz-Ertrag p.a.</p>
                    <p className="font-bold text-green-700">{formatCHF(liveResult.parkingIncome)}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Ansätze gemäss Marktstandard (AAP/EHP nach Lage)
                </p>
              </div>
            )}

            {(+valuation.aap_count === 0 && +valuation.ehp_count === 0) && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-500">
                Keine Parkplätze vorhanden — Ertrag wird nicht eingerechnet.
              </div>
            )}
          </div>
        )}

        {/* STEP 3: LAGE */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Lage & Faktoren</h2>
            <p className="text-gray-400 text-sm mb-5">Lagefaktoren beeinflussen den Kapitalisierungssatz direkt.</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Sel
                  label="Mikrolage"
                  k="micro_location"
                  source="v"
                  options={locationOpts}
                  info={LOCATION_INFO.mikrolage}
                />
              </div>
              <div>
                <Sel
                  label="Makrolage"
                  k="macro_location"
                  source="v"
                  options={locationOpts}
                  info={LOCATION_INFO.makrolage}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Sel
                  label="ÖV-Anbindung"
                  k="public_transport"
                  source="v"
                  options={locationOpts}
                  info={LOCATION_INFO.oev}
                />
              </div>
              <div />
            </div>

            <div>
              <label className="label">Notizen / Bemerkungen</label>
              <textarea
                value={valuation.notes}
                onChange={e => updV("notes", e.target.value)}
                className="input-field resize-none"
                rows={3}
                placeholder="Optionale Anmerkungen..."
              />
            </div>

            {/* Gemeinde Info */}
            {property.city && (() => {
              const m = MUNICIPALITIES.find(x => x.name.toLowerCase() === property.city.toLowerCase());
              return (
                <div className={`rounded-xl p-4 border ${m ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"}`}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 text-blue-600">
                    Gemeinde-Klassifikation
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><span className="text-gray-500">Gemeinde:</span> <strong>{property.city}</strong></div>
                    <div><span className="text-gray-500">Typ:</span> <strong>{m?.type ?? "Nicht in DB"}</strong></div>
                    <div><span className="text-gray-500">Auto-Lage:</span> <strong className="text-blue-600">{m ? ["Sehr stark","Gut","Durchschnittlich","Sekundär"][["sehrStark","gut","durchschnitt","sekundaer"].indexOf(m.locationClass)] : "Manuell"}</strong></div>
                    {m && <div><span className="text-gray-500">Bevölkerung:</span> <strong>{m.population.toLocaleString("de-CH")}</strong></div>}
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

        {/* STEP 4: REVIEW */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Überprüfen & Speichern</h2>
            <p className="text-gray-400 text-sm mb-5">Prüfen Sie die Eingaben und speichern Sie die Bewertung.</p>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              {[
                ["Objekt", property.name],
                ["Adresse", `${property.address}, ${property.zip} ${property.city}`],
                ["Zustand", CONDITION_OPTIONS.find(o => o.value === property.condition)?.label ?? ""],
                ["Wohnungen", property.num_units],
                ["Soll-Ertrag Wohnen", `CHF ${(+valuation.rent_residential).toLocaleString("de-CH")}`],
                ["Soll-Ertrag Gewerbe", `CHF ${(+valuation.rent_commercial).toLocaleString("de-CH")}`],
                ["Parkplätze AAP/EHP", `${valuation.aap_count} / ${valuation.ehp_count}`],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between">
                  <span className="text-gray-400">{l}</span>
                  <span className="font-semibold text-gray-800">{v}</span>
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
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-5">
        <button onClick={step === 0 ? undefined : prev} disabled={step === 0} className="btn-ghost px-5 py-2.5 disabled:opacity-30">
          ← Zurück
        </button>
        <div className="flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <span key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? "bg-blue-600" : i < step ? "bg-blue-300" : "bg-gray-200"}`} />
          ))}
        </div>
        {step < STEPS.length - 1
          ? <button onClick={next} className="btn-accent px-6 py-2.5">Weiter →</button>
          : <button onClick={handleSubmit} disabled={saving || !liveResult} className="btn-accent px-6 py-2.5">
              {saving ? "Wird gespeichert…" : "Bewertung speichern →"}
            </button>
        }
      </div>
    </div>
  );
}