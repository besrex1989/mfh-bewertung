// ============================================================
// MFH Bewertung – Kern-Berechnungslogik
// Ertragswertmethode nach Schweizer Standard
// ============================================================

import type {
  ConditionType,
  LocationRating,
  LocationCategory,
  ConfidenceLevel,
  ValuationResult,
  CapRateBreakdown,
} from "@/types";
import { findMunicipality } from "@/lib/municipalities";

// ── Zentraler Konfigurationsblock (anpassbar) ───────────────
export const VALUATION_CONFIG = {
  capRateRanges: {
    sehrStark:    { min: 3.00, max: 3.40 },
    gut:          { min: 3.40, max: 3.90 },
    durchschnitt: { min: 3.90, max: 4.40 },
    sekundaer:    { min: 4.40, max: 5.00 },
  },
  conditionDelta: {
    sehr_gut:    -0.10,
    gut:          0.00,
    mittel:       0.15,
    renovations:  0.30,
  },
  commercialSurcharge: {
    dominant: { min: 0.20, max: 0.40 }, // > 50%
    medium:   { min: 0.10, max: 0.20 }, // 25–50%
    minor:    { min: 0.00, max: 0.05 }, // < 25%
  },
  microCorrection: {
    sehr_gut: -0.05,
    gut:       0.00,
    mittel:    0.05,
    schwach:   0.10,
  },
  oevCorrection: {
    sehr_gut: -0.02,
    gut:       0.00,
    mittel:    0.02,
    schwach:   0.05,
  },
  scenarioBandwidth: 0.25, // ± 0.25% für Bandbreite
} as const;

// ── Hilfsfunktionen ─────────────────────────────────────────
export function getLageLabel(lage: LocationCategory): string {
  const map: Record<LocationCategory, string> = {
    sehrStark:    "Sehr starke Lage",
    gut:          "Gute Lage",
    durchschnitt: "Durchschnittliche Lage",
    sekundaer:    "Sekundäre Lage",
  };
  return map[lage];
}

export function getConditionLabel(c: ConditionType): string {
  const map: Record<ConditionType, string> = {
    sehr_gut:    "Sehr gut",
    gut:         "Gut",
    mittel:      "Mittel",
    renovations: "Renovationsbedürftig",
  };
  return map[c] || c;
}

export function formatCHF(amount: number): string {
  return (
    "CHF " +
    Math.round(amount)
      .toLocaleString("de-CH")
      .replace(/,/g, "'")
  );
}

export function formatPct(rate: number): string {
  return rate.toFixed(2).replace(".", ",") + " %";
}

// ── Hauptberechnung ─────────────────────────────────────────
export interface CalculationInput {
  city:             string;
  condition:        ConditionType;
  rentResidential:  number;
  rentCommercial:   number;
  actualRent:       number;
  vacancyRate:      number;
  operatingCosts:   number;
  maintenanceCosts: number;
  livingArea:       number;
  commercialArea:   number;
  microLocation:    LocationRating;
  macroLocation:    LocationRating;
  publicTransport:  LocationRating;
}

export function calculateValuation(input: CalculationInput): ValuationResult {
  const {
    city, condition, rentResidential, rentCommercial,
    actualRent, vacancyRate, operatingCosts, maintenanceCosts,
    livingArea, commercialArea,
    microLocation, macroLocation, publicTransport,
  } = input;

  // 1. Lageklasse bestimmen
  const municipality = findMunicipality(city);
  let locationCategory: LocationCategory = municipality?.locationClass ?? "durchschnitt";

  // Makrolage überschreibt automatische Klassifikation
  if (macroLocation === "sehr_gut") locationCategory = "sehrStark";
  else if (macroLocation === "schwach") locationCategory = "sekundaer";

  // 2. Basis-Kapitalisierungssatz
  const range = VALUATION_CONFIG.capRateRanges[locationCategory];
  const baseCapRate = (range.min + range.max) / 2;

  // 3. Zustandsanpassung
  const conditionDelta = VALUATION_CONFIG.conditionDelta[condition] ?? 0;

  // 4. Gewerbeanteil
  const grossIncome    = rentResidential + rentCommercial;
  const commShareRev   = grossIncome > 0 ? rentCommercial / grossIncome : 0;
  const totalArea      = livingArea + commercialArea;
  const commShareArea  = totalArea > 0 ? commercialArea / totalArea : 0;
  const commercialShare = Math.max(commShareRev, commShareArea);
  const residentialShare = 1 - commercialShare;

  let commercialSurcharge = 0;
  let gwInfo = "";
  if (commercialShare > 0.5) {
    commercialSurcharge = (VALUATION_CONFIG.commercialSurcharge.dominant.min + VALUATION_CONFIG.commercialSurcharge.dominant.max) / 2;
    gwInfo = "Dominanter Gewerbeanteil (>50 %) — erhöhter Risikozuschlag";
  } else if (commercialShare >= 0.25) {
    commercialSurcharge = (VALUATION_CONFIG.commercialSurcharge.medium.min + VALUATION_CONFIG.commercialSurcharge.medium.max) / 2;
    gwInfo = "Mittlerer Gewerbeanteil (25–50 %) — moderater Zuschlag";
  } else if (commercialShare > 0) {
    commercialSurcharge = VALUATION_CONFIG.commercialSurcharge.minor.max / 2;
    gwInfo = "Geringer Gewerbeanteil (<25 %)";
  }

  // 5. Mikrolage und ÖV
  const microCorrection = VALUATION_CONFIG.microCorrection[microLocation] ?? 0;
  const oevCorrection   = VALUATION_CONFIG.oevCorrection[publicTransport] ?? 0;

  // 6. Finaler Kapitalisierungssatz (begrenzt auf 2.5–6.5%)
  const finalCapRate = Math.max(
    2.5,
    Math.min(
      6.5,
      baseCapRate + conditionDelta + commercialSurcharge + microCorrection + oevCorrection
    )
  );

  const capRateBreakdown: CapRateBreakdown = {
    base:                baseCapRate,
    conditionDelta,
    commercialSurcharge,
    microCorrection,
    oevCorrection,
    final:               finalCapRate,
  };

  // 7. Erträge berechnen
  const effectiveIncome =
    actualRent > 0
      ? actualRent
      : grossIncome * (1 - vacancyRate / 100);

  const netIncome = Math.max(0, effectiveIncome - operatingCosts - maintenanceCosts);

  // 8. Werte berechnen
  const valueSimple      = effectiveIncome / (finalCapRate / 100);
  const valueExtended    = netIncome > 0 ? netIncome / (finalCapRate / 100) : 0;
  const valueConservative = effectiveIncome / ((finalCapRate + VALUATION_CONFIG.scenarioBandwidth) / 100);
  const valueOptimistic   = effectiveIncome / ((finalCapRate - VALUATION_CONFIG.scenarioBandwidth) / 100);

  // 9. Datenqualität / Confidence
  let confidence: ConfidenceLevel = "Medium";
  if (
    commercialShare < 0.2 &&
    condition !== "renovations" &&
    municipality !== undefined
  ) {
    confidence = "High";
  } else if (commercialShare > 0.4 || !municipality) {
    confidence = "Low";
  }

  // 10. Plausibilisierungstext
  const plausiText =
    `Das Objekt in ${city || "der angegebenen Gemeinde"} weist aufgrund der ` +
    `${getLageLabel(locationCategory)} und des Zustands (${getConditionLabel(condition)}) ` +
    `einen Kapitalisierungssatz von ${formatPct(finalCapRate)} auf.` +
    (gwInfo ? ` ${gwInfo}.` : "") +
    (condition === "renovations" ? " Der Renovationsbedarf führt zu einem erhöhten Risikozuschlag." : "");

  return {
    grossIncome,
    effectiveIncome,
    netIncome,
    capRateBreakdown,
    valueSimple,
    valueExtended,
    valueConservative,
    valueOptimistic,
    locationCategory,
    commercialShare,
    residentialShare,
    gwInfo,
    confidence,
    plausiText,
  };
}

// ── Drei Szenarien ───────────────────────────────────────────
export interface ScenarioRow {
  label:    string;
  capRate:  number;
  value:    number;
  delta:    number;
}

export function buildScenarios(
  effectiveIncome: number,
  neutralCapRate:  number
): ScenarioRow[] {
  const bw = VALUATION_CONFIG.scenarioBandwidth;
  return [
    {
      label:   "Konservativ",
      capRate:  neutralCapRate + bw,
      value:    effectiveIncome / ((neutralCapRate + bw) / 100),
      delta:   -bw,
    },
    {
      label:   "Neutral",
      capRate:  neutralCapRate,
      value:    effectiveIncome / (neutralCapRate / 100),
      delta:    0,
    },
    {
      label:   "Optimistisch",
      capRate:  neutralCapRate - bw,
      value:    effectiveIncome / ((neutralCapRate - bw) / 100),
      delta:    bw,
    },
  ];
}
