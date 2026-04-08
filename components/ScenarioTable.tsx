import { buildScenarios, formatCHF, formatPct } from "@/lib/calculations";

interface ScenarioTableProps {
  effectiveIncome: number;
  capRate:         number;
}

export default function ScenarioTable({ effectiveIncome, capRate }: ScenarioTableProps) {
  const scenarios = buildScenarios(effectiveIncome, capRate);

  return (
    <div className="overflow-hidden rounded-xl border border-ink-800">
      {/* Header */}
      <div className="grid grid-cols-3 bg-ink-800 px-4 py-2.5">
        {["Szenario", "Kap.-Satz", "Indik. Wert"].map((h) => (
          <span key={h} className="text-[10px] font-semibold text-ink-400 uppercase tracking-widest">
            {h}
          </span>
        ))}
      </div>

      {scenarios.map((s, i) => (
        <div
          key={s.label}
          className={`grid grid-cols-3 px-4 py-3 border-t border-ink-800 transition-colors ${
            s.label === "Neutral" ? "bg-gold-500/5" : ""
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                i === 0 ? "bg-ink-500" : i === 1 ? "bg-gold-500" : "bg-forest-400"
              }`}
            />
            <span className={`text-sm font-medium ${s.label === "Neutral" ? "text-gold-400" : "text-ink-200"}`}>
              {s.label}
            </span>
          </div>
          <span className="text-sm font-semibold text-ink-200">{formatPct(s.capRate)}</span>
          <span className={`text-sm font-bold font-display ${s.label === "Neutral" ? "text-gold-400" : "text-ink-100"}`}>
            {formatCHF(s.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
