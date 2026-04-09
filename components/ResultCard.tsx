import { buildScenarios, formatCHF, formatPct, getLageLabel, getConditionLabel } from "@/lib/calculations";
import type { ValuationResult } from "@/types";
import ScenarioTable from "./ScenarioTable";

interface ResultCardProps {
  result:          ValuationResult;
  effectiveIncome: number;
}

const confidenceConfig = {
  High:   { label: "Hoch",   color: "text-green-600",  bar: "bg-green-500",  pct: "85%" },
  Medium: { label: "Mittel", color: "text-amber-600",  bar: "bg-amber-500",  pct: "55%" },
  Low:    { label: "Gering", color: "text-red-500",    bar: "bg-red-500",    pct: "25%" },
};

export default function ResultCard({ result, effectiveIncome }: ResultCardProps) {
  const conf = confidenceConfig[result.confidence] ?? confidenceConfig.Medium;

  return (
    <div className="space-y-5 animate-fade-up">

      {/* ── HAUPTWERT ──────────────────────────────────── */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-7 text-white relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />

        <div className="flex justify-between items-start gap-4 flex-wrap mb-6">
          <div>
            <p className="text-[11px] text-blue-200 uppercase tracking-widest font-semibold mb-2">
              Indikativer Marktwert
            </p>
            <p className="text-4xl md:text-5xl font-black tracking-tight leading-none mb-2">
              {formatCHF(result.valueSimple)}
            </p>
            <p className="text-blue-200 text-sm">
              Kap.-Satz: <strong className="text-white">{formatPct(result.capRateBreakdown.final)}</strong>
              {" · "}Eff. Ertrag: <strong className="text-white">{formatCHF(effectiveIncome)}</strong>
            </p>
            {result.parkingIncome > 0 && (
              <p className="text-blue-200 text-xs mt-1">
                inkl. Parkplatz-Ertrag: <strong className="text-white">{formatCHF(result.parkingIncome)}/Jahr</strong>
              </p>
            )}
          </div>

          <div className="min-w-[130px]">
            <div className="flex justify-between mb-1.5">
              <span className="text-[10px] text-blue-200 uppercase tracking-widest">Datenqualität</span>
              <span className={`text-xs font-bold ${conf.color.replace("text-", "text-white")}`}>{conf.label}</span>
            </div>
            <div className="h-1.5 bg-blue-500/50 rounded-full">
              <div className={`h-full rounded-full bg-white/80`} style={{ width: conf.pct }} />
            </div>
          </div>
        </div>

        <ScenarioTable effectiveIncome={effectiveIncome} capRate={result.capRateBreakdown.final} />
      </div>

      {/* ── MIETPOTENZIAL (falls vorhanden) ────────────── */}
      {result.hasUptidePotential && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="text-amber-500 text-xl mt-0.5">⚡</span>
            <div>
              <p className="text-sm font-bold text-amber-800 mb-1">Mietertragspotenzial bei Neuvermietung</p>
              <div className="flex gap-4 text-xs text-amber-700">
                {result.sollIstDiffWohnen > 0 && (
                  <span>Wohnen: <strong>+{formatCHF(result.sollIstDiffWohnen)}/Jahr</strong></span>
                )}
                {result.sollIstDiffGewerbe > 0 && (
                  <span>Gewerbe: <strong>+{formatCHF(result.sollIstDiffGewerbe)}/Jahr</strong></span>
                )}
              </div>
              {result.sustainableIncome > 0 && (
                <p className="text-xs text-amber-600 mt-1.5">
                  Nachhaltige Ertragsbasis: <strong>{formatCHF(result.sustainableIncome)}/Jahr</strong>
                  {" → "}Wert: <strong>{formatCHF(result.valueSustainable)}</strong>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── KPI GRID ───────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          ["Kap.-Satz",      formatPct(result.capRateBreakdown.final)],
          ["Brutto-Soll",    formatCHF(result.grossIncome)],
          ["Eff. Ertrag",    formatCHF(effectiveIncome)],
          ["Netto-Ertrag",   result.netIncome > 0 ? formatCHF(result.netIncome) : "—"],
          ["Wohnanteil",     `${Math.round(result.residentialShare * 100)} %`],
          ["Lageklasse",     getLageLabel(result.locationCategory)],
        ].map(([label, value]) => (
          <div key={label} className="kpi-card">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-base font-bold text-gray-800">{value}</p>
          </div>
        ))}
      </div>

      {/* ── KAP.-SATZ HERLEITUNG ──────────────────────── */}
      <div className="card">
        <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4">
          Kapitalisierungssatz-Herleitung
        </h4>
        <div className="space-y-2">
          {[
            [`Basis (${getLageLabel(result.locationCategory)})`, formatPct(result.capRateBreakdown.base)],
            ["Zustandsanpassung", `${result.capRateBreakdown.conditionDelta >= 0 ? "+" : ""}${formatPct(result.capRateBreakdown.conditionDelta)}`],
            ["Gewerbezuschlag",   `+${formatPct(result.capRateBreakdown.commercialSurcharge)}`],
            ["Mikrolage",         `${result.capRateBreakdown.microCorrection >= 0 ? "+" : ""}${formatPct(result.capRateBreakdown.microCorrection)}`],
            ["ÖV-Anbindung",      `${result.capRateBreakdown.oevCorrection >= 0 ? "+" : ""}${formatPct(result.capRateBreakdown.oevCorrection)}`],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-500">{l}</span>
              <span className="text-sm font-semibold text-gray-800">{v}</span>
            </div>
          ))}
          <div className="flex justify-between pt-2 border-t-2 border-blue-200 mt-1">
            <span className="text-sm font-bold text-blue-600">Finaler Kap.-Satz</span>
            <span className="text-lg font-black text-blue-600">{formatPct(result.capRateBreakdown.final)}</span>
          </div>
        </div>
      </div>

      {/* ── PLAUSIBILISIERUNG ─────────────────────────── */}
      <div className="card">
        <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Plausibilisierung
        </h4>
        <p className="text-sm text-gray-700 leading-relaxed">{result.plausiText}</p>
        {result.gwInfo && (
          <div className="mt-3 border-l-2 border-blue-400 pl-3 py-1">
            <p className="text-xs text-blue-600">
              <strong>Gemischte Nutzung:</strong> {result.gwInfo}
            </p>
          </div>
        )}
      </div>

      {/* ── DISCLAIMER ────────────────────────────────── */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
        <p className="text-xs text-gray-400 leading-relaxed">
          <strong className="text-gray-500">Rechtlicher Hinweis:</strong> Diese Berechnung ist eine
          indikative, modellbasierte Einschätzung und ersetzt keine vollständige
          Verkehrswertschätzung, keine hedonische Bewertung und kein gerichtsfestes Gutachten.
          Alle Angaben ohne Gewähr.
        </p>
      </div>
    </div>
  );
}