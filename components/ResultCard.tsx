import { buildScenarios, formatCHF, formatPct, getLageLabel, getConditionLabel, estimateRenovationNeeds } from "@/lib/calculations";
import type { ValuationResult } from "@/types";
import ScenarioTable from "./ScenarioTable";

interface ResultCardProps {
  result:          ValuationResult;
  effectiveIncome: number;
  buildYear?:      number;
  renovYear?:      number;
  livingArea?:     number;
  condition?:      string;
}

const confidenceConfig = {
  High:   { label: "Hoch",   color: "text-green-600", pct: "85%" },
  Medium: { label: "Mittel", color: "text-amber-600", pct: "55%" },
  Low:    { label: "Gering", color: "text-red-500",   pct: "25%" },
};

export default function ResultCard({ result, effectiveIncome, buildYear, renovYear, livingArea, condition }: ResultCardProps) {
  const conf = confidenceConfig[result.confidence] ?? confidenceConfig.Medium;
  const renovItems = buildYear
    ? estimateRenovationNeeds(buildYear, renovYear ?? null, livingArea ?? 0, condition ?? "stufe4")
    : [];
  const renovTotal = renovItems.reduce((s, i) => s + (i.costMin + i.costMax) / 2, 0);

  return (
    <div className="space-y-5 animate-fade-up">

      {/* ── HAUPTWERT ── */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-7 text-white relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />

        <div className="flex justify-between items-start gap-4 flex-wrap mb-5">
          <div>
            <p className="text-[11px] text-blue-200 uppercase tracking-widest font-semibold mb-2">
              Indikativer Marktwert (Ertragswert)
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
              <span className="text-[10px] text-blue-200 uppercase tracking-widest">Datenqualitaet</span>
              <span className="text-xs font-bold text-white">{conf.label}</span>
            </div>
            <div className="h-1.5 bg-blue-500/50 rounded-full">
              <div className="h-full rounded-full bg-white/80" style={{ width: conf.pct }} />
            </div>
          </div>
        </div>

        {/* Szenario-Bandbreite */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-blue-500">
          {[
            ["Konservativ", formatCHF(result.valueConservative)],
            ["Neutral",     formatCHF(result.valueSimple)],
            ["Optimistisch",formatCHF(result.valueOptimistic)],
          ].map(([l, v]) => (
            <div key={l}>
              <p className="text-[10px] text-blue-300 mb-0.5">{l}</p>
              <p className="text-sm font-bold text-white">{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── MIETPOTENZIAL ── */}
      {result.hasUptidePotential && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="text-amber-500 text-xl mt-0.5">!</span>
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
                  {" → "}Wert bei Vollvermietung: <strong>{formatCHF(result.valueSustainable)}</strong>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── KPI GRID ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          ["Kap.-Satz",    formatPct(result.capRateBreakdown.final)],
          ["Brutto-Soll",  formatCHF(result.grossIncome)],
          ["Eff. Ertrag",  formatCHF(effectiveIncome)],
          ["Netto-Ertrag", result.netIncome > 0 ? formatCHF(result.netIncome) : "—"],
          ["Wohnanteil",   `${Math.round(result.residentialShare * 100)} %`],
          ["Lageklasse",   getLageLabel(result.locationCategory)],
        ].map(([label, value]) => (
          <div key={label} className="kpi-card">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-base font-bold text-gray-800">{value}</p>
          </div>
        ))}
      </div>

      {/* ── KAP.-SATZ HERLEITUNG (à la IAZI) ── */}
      <div className="card">
        <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4">
          Kapitalisierungssatz-Herleitung (nach IAZI-Methodik)
        </h4>
        <div className="space-y-1.5">
          {[
            ["Risikoloser Satz (Bundesobligationen)", formatPct(result.capRateBreakdown.riskFreeRate)],
            [`Marktpraemie (${getLageLabel(result.locationCategory)})`, `+${formatPct(result.capRateBreakdown.marketPremium)}`],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-sm text-gray-500">{l}</span>
              <span className="text-sm font-semibold text-gray-700">{v}</span>
            </div>
          ))}

          {/* Basis */}
          <div className="flex justify-between py-1.5 border-b-2 border-gray-300 bg-gray-50 px-2 rounded">
            <span className="text-sm font-semibold text-gray-700">= Basis-Kap.-Satz</span>
            <span className="text-sm font-bold text-gray-800">{formatPct(result.capRateBreakdown.base)}</span>
          </div>

          {/* Korrekturen */}
          {[
            ["Makrolage-Korrektur",   result.capRateBreakdown.macroDelta],
            ["Mikrolage-Korrektur",   result.capRateBreakdown.microDelta],
            ["Gebaeudezustand",       result.capRateBreakdown.conditionDelta],
            ["Gebaeudealter",         result.capRateBreakdown.ageDelta],
            ["Bauqualitaet",          result.capRateBreakdown.qualityDelta],
            ["Gewerbeanteil",         result.capRateBreakdown.commercialSurcharge],
            ["OeV-Anbindung",         result.capRateBreakdown.oevDelta],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-500">{l}</span>
              <span className={`text-sm font-semibold ${(v as number) > 0 ? "text-red-500" : (v as number) < 0 ? "text-green-600" : "text-gray-600"}`}>
                {(v as number) >= 0 ? "+" : ""}{formatPct(v as number)}
              </span>
            </div>
          ))}

          {/* Finaler Satz */}
          <div className="flex justify-between pt-3 border-t-2 border-blue-200 mt-1">
            <span className="text-sm font-bold text-blue-600">Finaler Kap.-Satz</span>
            <span className="text-lg font-black text-blue-600">{formatPct(result.capRateBreakdown.final)}</span>
          </div>
        </div>
      </div>

      {/* ── SUBSTANZWERT (à la RealAdvisor) ── */}
      {result.substanzValue > 0 && (
        <div className="card">
          <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4">
            Andere Bewertungsmethoden
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-700">Ertragswert (Hauptmethode)</p>
                <p className="text-xs text-gray-400">Kapitalisierung des nachhaltigen Ertrags</p>
              </div>
              <p className="text-base font-bold text-blue-600">{formatCHF(result.valueSimple)}</p>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-700">Substanzwert (indikativ)</p>
                <p className="text-xs text-gray-400">Neuwert abzgl. Abschreibung (ohne Landwert)</p>
              </div>
              <p className="text-base font-bold text-gray-600">{formatCHF(result.substanzValue)}</p>
            </div>
            {result.sustainableIncome > 0 && (
              <div className="flex justify-between items-center py-2">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Ertragswert nachhaltig</p>
                  <p className="text-xs text-gray-400">Bei Vollvermietung zum Sollertrag</p>
                </div>
                <p className="text-base font-bold text-green-600">{formatCHF(result.valueSustainable)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SANIERUNGSBEDARF (à la IAZI) ── */}
      {renovItems.length > 0 && (
        <div className="card">
          <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
            Geschaetzter Sanierungsbedarf (naechste 10 Jahre)
          </h4>
          <p className="text-xs text-gray-400 mb-4">Indikative Schaetzung basierend auf Baujahr und Zustand</p>
          <div className="space-y-2">
            {renovItems.map(item => (
              <div key={item.element} className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-600">{item.element}</span>
                <span className="text-sm font-semibold text-gray-700">
                  {formatCHF(item.costMin)} – {formatCHF(item.costMax)}
                </span>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t-2 border-gray-300">
              <span className="text-sm font-bold text-gray-700">Total (Mittelwert)</span>
              <span className="text-sm font-black text-red-600">{formatCHF(renovTotal)}</span>
            </div>
          </div>
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <p className="text-xs text-red-600">
              Sanierungsbedarf von ca. {formatCHF(renovTotal)} sollte beim Kaufpreis beruecksichtigt werden.
              Bereinigter Wert: <strong>{formatCHF(result.valueSimple - renovTotal)}</strong>
            </p>
          </div>
        </div>
      )}

      {/* ── PLAUSIBILISIERUNG ── */}
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

      {/* ── DISCLAIMER ── */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
        <p className="text-xs text-gray-400 leading-relaxed">
          <strong className="text-gray-500">Rechtlicher Hinweis:</strong> Diese Berechnung ist eine
          indikative, modellbasierte Einschaetzung und ersetzt keine vollstaendige
          Verkehrswertschaetzung (z. B. nach IAZI oder durch einen zertifizierten Schaetzer).
          Alle Angaben ohne Gewaehr.
        </p>
      </div>
    </div>
  );
}