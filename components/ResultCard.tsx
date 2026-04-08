import { formatCHF, formatPct, getLageLabel } from "@/lib/calculations";
import type { ValuationResult } from "@/types";
import ScenarioTable from "./ScenarioTable";

interface ResultCardProps {
  result:         ValuationResult;
  effectiveIncome: number;
}

const confidenceConfig = {
  High:   { label: "Hoch",   color: "text-emerald-400", bar: "bg-emerald-500", pct: "85%" },
  Medium: { label: "Mittel", color: "text-gold-400",    bar: "bg-gold-500",    pct: "55%" },
  Low:    { label: "Gering", color: "text-red-400",     bar: "bg-red-500",     pct: "25%" },
};

export default function ResultCard({ result, effectiveIncome }: ResultCardProps) {
  const conf = confidenceConfig[result.confidence] ?? confidenceConfig.Medium;

  return (
    <div className="space-y-5 animate-fade-up">
      {/* ── MAIN VALUE ─────────────────────────────── */}
      <div className="bg-gradient-to-br from-forest-900 to-ink-900 border border-gold-500/30 rounded-2xl p-7 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-gold-500/5 pointer-events-none" />

        <div className="flex justify-between items-start gap-4 flex-wrap mb-6">
          <div>
            <p className="text-[11px] text-ink-400 uppercase tracking-widest font-semibold mb-2">
              Indikativer Marktwert
            </p>
            <p className="font-display text-4xl md:text-5xl font-black text-gold-400 tracking-tight leading-none">
              {formatCHF(result.valueSimple)}
            </p>
            <p className="text-ink-400 text-sm mt-2">
              Kap.-Satz:{" "}
              <strong className="text-gold-300">{formatPct(result.capRateBreakdown.final)}</strong>
              {" · "}Jahresertrag:{" "}
              <strong className="text-ink-200">{formatCHF(effectiveIncome)}</strong>
            </p>
          </div>

          <div className="min-w-[120px]">
            <div className="flex justify-between mb-1.5">
              <span className="text-[10px] text-ink-500 uppercase tracking-widest">Datenqualität</span>
              <span className={`text-xs font-bold ${conf.color}`}>{conf.label}</span>
            </div>
            <div className="h-1.5 bg-ink-700 rounded-full">
              <div className={`h-full rounded-full transition-all ${conf.bar}`} style={{ width: conf.pct }} />
            </div>
          </div>
        </div>

        {/* Scenarios inline */}
        <ScenarioTable effectiveIncome={effectiveIncome} capRate={result.capRateBreakdown.final} />
      </div>

      {/* ── KPI GRID ──────────────────────────────── */}
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
            <p className="text-[10px] text-ink-500 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-base font-bold text-ink-100">{value}</p>
          </div>
        ))}
      </div>

      {/* ── CAP RATE BREAKDOWN ───────────────────── */}
      <div className="card">
        <h4 className="text-[11px] font-semibold text-ink-400 uppercase tracking-widest mb-4">
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
            <div key={l} className="flex justify-between py-1.5 border-b border-ink-800 last:border-0">
              <span className="text-sm text-ink-400">{l}</span>
              <span className="text-sm font-semibold text-ink-100">{v}</span>
            </div>
          ))}
          <div className="flex justify-between pt-2 border-t-2 border-gold-500/30 mt-1">
            <span className="text-sm font-bold text-gold-400">Finaler Kap.-Satz</span>
            <span className="font-display text-lg font-black text-gold-400">
              {formatPct(result.capRateBreakdown.final)}
            </span>
          </div>
        </div>
      </div>

      {/* ── PLAUSIBILISIERUNG ─────────────────────── */}
      <div className="card">
        <h4 className="text-[11px] font-semibold text-ink-400 uppercase tracking-widest mb-3">
          Plausibilisierung
        </h4>
        <p className="text-sm text-ink-200 leading-relaxed">{result.plausiText}</p>
        {result.gwInfo && (
          <div className="mt-3 border-l-2 border-gold-500 pl-3 py-1">
            <p className="text-xs text-gold-400">
              <strong>Gemischte Nutzung:</strong> {result.gwInfo}
            </p>
          </div>
        )}
      </div>

      {/* ── DISCLAIMER ──────────────────────────── */}
      <div className="bg-ink-900 border border-ink-800 rounded-xl px-4 py-3">
        <p className="text-xs text-ink-600 leading-relaxed">
          <strong className="text-ink-500">Rechtlicher Hinweis:</strong> Diese Berechnung ist eine
          indikative, modellbasierte Einschätzung und ersetzt keine vollständige
          Verkehrswertschätzung, keine hedonische Bewertung und kein gerichtsfestes Gutachten.
          Alle Angaben ohne Gewähr.
        </p>
      </div>
    </div>
  );
}
