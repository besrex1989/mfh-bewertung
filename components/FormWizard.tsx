"use client";

import { useState } from "react";
import { MUNICIPALITIES, KANTONE } from "@/lib/municipalities";
import { calculateValuation } from "@/lib/calculations";
import type { PropertyFormData, ValuationFormData, ValuationResult, ConditionType, LocationRating } from "@/types";

interface FormWizardProps {
  onComplete: (
    property:  PropertyFormData,
    valuation: ValuationFormData,
    result:    ValuationResult
  ) => Promise<void>;
  saving: boolean;
}

const STEPS = ["Objekt", "Erträge", "Lage", "Überprüfen"];

// ── Step Indicator ────────────────────────────────────────
function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={
                i < current  ? "step-dot-done" :
                i === current ? "step-dot-active" :
                                "step-dot-pending"
              }
            >
              {i < current ? "✓" : i + 1}
            </div>
            <span
              className={`text-[10px] whitespace-nowrap ${
                i === current ? "text-gold-400 font-semibold" : "text-ink-600"
              }`}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`w-10 h-px mx-1 mb-4 ${i < current ? "bg-gold-500" : "bg-ink-700"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Field helpers ─────────────────────────────────────────
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────
export default function FormWizard({ onComplete, saving }: FormWizardProps) {
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [property, setProperty] = useState<PropertyFormData>({
    name:            "",
    address:         "",
    city:            "",
    canton:          "BE",
    zip:             "",
    build_year:      "",
    condition:       "gut",
    num_units:       "",
    living_area:     "",
    commercial_area: "0",
  });

  const [valuation, setValuation] = useState<ValuationFormData>({
    rent_residential:  "",
    rent_commercial:   "0",
    actual_rent:       "",
    vacancy_rate:      "0",
    operating_costs:   "",
    maintenance_costs: "",
    micro_location:    "gut",
    macro_location:    "gut",
    public_transport:  "gut",
    notes:             "",
  });

  const updP = (k: keyof PropertyFormData, v: string) =>
    setProperty((p) => ({ ...p, [k]: v }));
  const updV = (k: keyof ValuationFormData, v: string) =>
    setValuation((p) => ({ ...p, [k]: v }));

  // ── Live preview calculation ──────────────────────────
  const liveResult = (() => {
    if (!property.city || !valuation.rent_residential) return null;
    try {
      return calculateValuation({
        city:             property.city,
        condition:        property.condition,
        rentResidential:  +valuation.rent_residential || 0,
        rentCommercial:   +valuation.rent_commercial || 0,
        actualRent:       +valuation.actual_rent || 0,
        vacancyRate:      +valuation.vacancy_rate || 0,
        operatingCosts:   +valuation.operating_costs || 0,
        maintenanceCosts: +valuation.maintenance_costs || 0,
        livingArea:       +property.living_area || 0,
        commercialArea:   +property.commercial_area || 0,
        microLocation:    valuation.micro_location,
        macroLocation:    valuation.macro_location,
        publicTransport:  valuation.public_transport,
      });
    } catch { return null; }
  })();

  // ── Validation ────────────────────────────────────────
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

  function next() { if (validate()) setStep((s) => s + 1); }
  function prev() { setStep((s) => s - 1); setErrors({}); }

  async function handleSubmit() {
    if (!liveResult) return;
    await onComplete(property, valuation, liveResult);
  }

  const inp = (
    key: keyof PropertyFormData | keyof ValuationFormData,
    source: "p" | "v",
    rest?: React.InputHTMLAttributes<HTMLInputElement>
  ) => (
    <input
      {...rest}
      value={source === "p" ? (property as Record<string, string>)[key] : (valuation as Record<string, string>)[key]}
      onChange={(e) =>
        source === "p"
          ? updP(key as keyof PropertyFormData, e.target.value)
          : updV(key as keyof ValuationFormData, e.target.value)
      }
      className={`input-field ${errors[key] ? "border-red-500 ring-1 ring-red-500/30" : ""}`}
    />
  );

  const sel = (
    key: keyof PropertyFormData | keyof ValuationFormData,
    source: "p" | "v",
    options: { value: string; label: string }[]
  ) => (
    <select
      value={source === "p" ? (property as Record<string, string>)[key] : (valuation as Record<string, string>)[key]}
      onChange={(e) =>
        source === "p"
          ? updP(key as keyof PropertyFormData, e.target.value)
          : updV(key as keyof ValuationFormData, e.target.value)
      }
      className="select-field"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
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
        {/* ── STEP 0: OBJEKT ─────────────────────── */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="section-title">Objektdaten</h2>
            <p className="text-ink-400 text-sm mb-5">Grundlegende Informationen zum Mehrfamilienhaus.</p>

            <Field label="Bezeichnung *" error={errors.name}>
              {inp("name", "p", { placeholder: "z. B. MFH Musterstrasse" })}
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Strasse / Nr. *" error={errors.address}>
                {inp("address", "p", { placeholder: "Musterstrasse 12" })}
              </Field>
              <Field label="PLZ">
                {inp("zip", "p", { placeholder: "3006" })}
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Ort / Gemeinde *" error={errors.city}>
                <>
                  {inp("city", "p", { placeholder: "Bern", list: "city-list" })}
                  <datalist id="city-list">
                    {MUNICIPALITIES.map((m) => (
                      <option key={m.name} value={m.name} />
                    ))}
                  </datalist>
                </>
              </Field>
              <Field label="Kanton">
                {sel("canton", "p", KANTONE.map((k) => ({ value: k, label: k })))}
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Baujahr">
                {inp("build_year", "p", { type: "number", placeholder: "1975", min: 1850, max: 2025 })}
              </Field>
              <Field label="Zustand">
                {sel("condition", "p", [
                  { value: "sehr_gut",    label: "Sehr gut" },
                  { value: "gut",         label: "Gut" },
                  { value: "mittel",      label: "Mittel" },
                  { value: "renovations", label: "Renovationsbedürftig" },
                ])}
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Anz. Wohnungen *" error={errors.num_units}>
                {inp("num_units", "p", { type: "number", placeholder: "8", min: 1 })}
              </Field>
              <Field label="Wohnfläche (m²)">
                {inp("living_area", "p", { type: "number", placeholder: "620" })}
              </Field>
              <Field label="Gewerbefläche (m²)">
                {inp("commercial_area", "p", { type: "number", placeholder: "0" })}
              </Field>
            </div>

            {/* Auto-Lage info */}
            {property.city && (() => {
              const m = MUNICIPALITIES.find(
                (x) => x.name.toLowerCase() === property.city.toLowerCase()
              );
              return m ? (
                <div className="bg-forest-900/40 border border-forest-700/30 rounded-lg px-4 py-3 text-xs text-ink-400">
                  <span className="text-gold-500 font-semibold">Auto-Lageklasse:</span>{" "}
                  {m.type} · {m.name}, {m.canton} ({m.population.toLocaleString("de-CH")} Einw.)
                </div>
              ) : null;
            })()}
          </div>
        )}

        {/* ── STEP 1: ERTRÄGE ────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="section-title">Ertragsdaten</h2>
            <p className="text-ink-400 text-sm mb-5">Miet- und Kostendaten für die Ertragswertberechnung.</p>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Soll-Mietertrag Wohnen p.a. (CHF) *" error={errors.rent_residential}>
                {inp("rent_residential", "v", { type: "number", placeholder: "120 000" })}
              </Field>
              <Field label="Soll-Mietertrag Gewerbe p.a. (CHF)">
                {inp("rent_commercial", "v", { type: "number", placeholder: "0" })}
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Ist-Mietertrag total p.a. (CHF)">
                {inp("actual_rent", "v", { type: "number", placeholder: "126 000" })}
              </Field>
              <Field label="Leerstandsquote (%)">
                {inp("vacancy_rate", "v", { type: "number", placeholder: "0", min: 0, max: 100 })}
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Betriebskosten p.a. (CHF)">
                {inp("operating_costs", "v", { type: "number", placeholder: "8 000" })}
              </Field>
              <Field label="Unterhaltskosten p.a. (CHF)">
                {inp("maintenance_costs", "v", { type: "number", placeholder: "6 000" })}
              </Field>
            </div>

            {/* Live preview */}
            {liveResult && (
              <div className="bg-forest-900/40 border border-gold-500/20 rounded-xl p-4">
                <p className="text-[10px] text-gold-500 uppercase tracking-widest font-semibold mb-3">
                  Live-Vorschau
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ["Brutto-Soll", `CHF ${Math.round(liveResult.grossIncome).toLocaleString("de-CH")}`],
                    ["Eff. Ertrag", `CHF ${Math.round(liveResult.effectiveIncome).toLocaleString("de-CH")}`],
                    ["Kap.-Satz",   `${liveResult.capRateBreakdown.final.toFixed(2).replace(".", ",")} %`],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <p className="text-[10px] text-ink-500 mb-0.5">{l}</p>
                      <p className="text-sm font-bold text-gold-400">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: LAGE ───────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="section-title">Lage & Faktoren</h2>
            <p className="text-ink-400 text-sm mb-5">
              Lagefaktoren beeinflussen den Kapitalisierungssatz.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Mikrolage">
                {sel("micro_location", "v", locationOpts)}
              </Field>
              <Field label="Makrolage">
                {sel("macro_location", "v", locationOpts)}
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="ÖV-Anbindung">
                {sel("public_transport", "v", locationOpts)}
              </Field>
              <div />
            </div>

            <Field label="Notizen / Bemerkungen">
              <textarea
                value={valuation.notes}
                onChange={(e) => updV("notes", e.target.value)}
                className="input-field resize-none"
                rows={3}
                placeholder="Optionale Anmerkungen zum Objekt…"
              />
            </Field>

            {liveResult && (
              <div className="bg-forest-900/40 border border-gold-500/20 rounded-xl p-4">
                <p className="text-[10px] text-gold-500 uppercase tracking-widest font-semibold mb-2">
                  Berechnungsvorschau
                </p>
                <p className="text-sm text-ink-200 leading-relaxed">{liveResult.plausiText}</p>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: REVIEW ─────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="section-title">Überprüfen & Speichern</h2>
            <p className="text-ink-400 text-sm mb-5">
              Prüfen Sie die Eingaben und speichern Sie die Bewertung.
            </p>

            {/* Summary */}
            <div className="bg-ink-800/50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-400">Objekt</span>
                <span className="font-semibold text-ink-100">{property.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-400">Adresse</span>
                <span className="text-ink-200">{property.address}, {property.zip} {property.city}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-400">Wohnungen</span>
                <span className="text-ink-200">{property.num_units}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-400">Soll-Mietertrag</span>
                <span className="text-ink-200">
                  CHF {(+valuation.rent_residential + +valuation.rent_commercial).toLocaleString("de-CH")}
                </span>
              </div>
            </div>

            {liveResult && (
              <div className="bg-gradient-to-br from-forest-900/60 to-ink-900 border border-gold-500/30 rounded-xl p-5">
                <p className="text-[10px] text-gold-500 uppercase tracking-widest font-semibold mb-3">
                  Bewertungsergebnis
                </p>
                <p className="font-display text-3xl font-black text-gold-400 mb-1">
                  CHF {Math.round(liveResult.valueSimple).toLocaleString("de-CH").replace(/,/g, "'")}
                </p>
                <p className="text-xs text-ink-400">
                  Kap.-Satz: {liveResult.capRateBreakdown.final.toFixed(2).replace(".", ",")} %
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── NAV BUTTONS ────────────────────────────── */}
      <div className="flex justify-between items-center mt-5">
        <button
          onClick={step === 0 ? undefined : prev}
          disabled={step === 0}
          className="btn-ghost px-5 py-2.5 disabled:opacity-30"
        >
          ← Zurück
        </button>

        <div className="flex items-center gap-2">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step ? "bg-gold-500" : i < step ? "bg-forest-500" : "bg-ink-700"
              }`}
            />
          ))}
        </div>

        {step < STEPS.length - 1 ? (
          <button onClick={next} className="btn-accent px-6 py-2.5">
            Weiter →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={saving || !liveResult}
            className="btn-accent px-6 py-2.5"
          >
            {saving ? "Wird gespeichert…" : "Bewertung speichern →"}
          </button>
        )}
      </div>
    </div>
  );
}
