// ============================================================
// MFH Bewertung – Kern-Berechnungslogik v2
// Ertragswertmethode nach Schweizer Standard
// Optimiert gemäss IAZI/RealAdvisor Feedback
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

// ── Zentraler Konfigurationsblock ──────────────────────────
export const VALUATION_CONFIG = {
  capRateRanges: {
    sehrStark:    { min: 3.00, max: 3.40 },
    gut:          { min: 3.40, max: 3.90 },
    durchschnitt: { min: 3.90, max: 4.40 },
    sekundaer:    { min: 4.40, max: 5.00 },
  },
  // 6-stufiger Zustand (gemäss Makler-Feedback)
  conditionDelta: {
    stufe6: -0.20, // Hervorragend, Neubau/neuwertig < 5 Jahre
    stufe5: -0.10, // Sehr gut, Sanierung in 20-30 Jahren
    stufe4:  0.00, // Gut, Sanierung in 10-15 Jahren
    stufe3:  0.15, // Mittel, Sanierung in 4-6 Jahren
    stufe2:  0.30, // Eher schlecht, sanierungsbedürftig
    stufe1:  0.50, // Schlecht, stark sanierungsbedürftig
  },
  commercialSurcharge: {
    dominant: { min: 0.20, max: 0.40 },
    medium:   { min: 0.10, max: 0.20 },
    minor:    { min: 0.00, max: 0.05 },
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
  scenarioBandwidth: 0.25,

  // Parkplatz-Monatsmieten nach Lagekategorie (CHF/Monat)
  parkingValues: {
    sehrStark:    { aap: 70, ehp: 160 }, // Städtisch
    gut:          { aap: 60, ehp: 140 }, // Agglomeration gut
    durchschnitt: { aap: 50, ehp: 125 }, // Agglomeration
    sekundaer:    { aap: 40, ehp: 100 }, // Ländlich
  },
} as const;

// ── Zustand Labels (6-stufig) ───────────────────────────────
export const CONDITION_OPTIONS = [
  { value: "stufe6", label: "6 – Hervorragend", desc: "Neubau oder neuwertig (jünger als 5 Jahre)" },
  { value: "stufe5", label: "5 – Sehr gut",     desc: "Sanierungstendenz in 20–30 Jahren" },
  { value: "stufe4", label: "4 – Gut",           desc: "Sanierungstendenz in 10–15 Jahren" },
  { value: "stufe3", label: "3 – Mittel",        desc: "Sanierungstendenz in 4–6 Jahren" },
  { value: "stufe2", label: "2 – Eher schlecht", desc: "Sanierungsbedürftig" },
  { value: "stufe1", label: "1 – Schlecht",      desc: "Stark sanierungsbedürftig / fast unbewohnbar" },
] as const;

// ── Lage-Info Texte (für Infoboxen) ────────────────────────
export const LOCATION_INFO = {
  mikrolage: {
    title: "Mikrolage",
    desc: "Qualität der unmittelbaren Umgebung: Besonnung, Aussicht, Lärmbelastung, Nachbarschaft, Nähe zu Grünflächen.",
    criteria: ["Lärmbelastung (Strasse, Bahn)", "Aussicht und Besonnung", "Nachbarschaft und Quartierqualität", "Nähe zu Grünflächen / Erholung"],
  },
  makrolage: {
    title: "Makrolage",
    desc: "Qualität der Gemeinde / des Quartiers: ÖV-Anbindung, Infrastruktur, Steuern, wirtschaftliche Attraktivität.",
    criteria: ["ÖV-Anbindung (S-Bahn, Tram, Bus)", "Einkaufsmöglichkeiten", "Schulen und Kindergärten", "Steuerbelastung der Gemeinde"],
  },
  oev: {
    title: "ÖV-Anbindung",
    desc: "Erreichbarkeit des nächsten ÖV-Knotens zu Fuss.",
    criteria: ["Sehr gut: < 3 Min zu Fuss", "Gut: 3–7 Min zu Fuss", "Mittel: 7–15 Min zu Fuss", "Schwach: > 15 Min oder schlechte Frequenz"],
  },
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

export function getConditionLabel(c: string): string {
  const opt = CONDITION_OPTIONS.find(o => o.value === c);
  return opt ? opt.label : c;
}

export function getConditionDesc(c: string): string {
  const opt = CONDITION_OPTIONS.find(o => o.value === c);
  return opt ? opt.desc : "";
}

export function formatCHF(amount: number): string {
  if (!amount || isNaN(amount)) return "—";
  return "CHF " + Math.round(amount).toLocaleString("de-CH").replace(/,/g, "'");
}

export function formatPct(rate: number): string {
  if (rate === null || rate === undefined || isNaN(rate)) return "—";
  return rate.toFixed(2).replace(".", ",") + " %";
}

// ── Parkplatz-Jahresertrag Berechnung ───────────────────────
export function calcParkingIncome(
  aapCount: number,
  ehpCount: number,
  locationCategory: LocationCategory
): number {
  const rates = VALUATION_CONFIG.parkingValues[locationCategory];
  return (aapCount * rates.aap + ehpCount * rates.ehp) * 12;
}

// ── Hauptberechnung ─────────────────────────────────────────
export interface CalculationInput {
  city:                  string;
  condition:             string; // stufe1-6
  // Erträge getrennt nach Ist/Soll und Wohnen/Gewerbe
  rentResidentialTarget: number; // Soll Wohnen
  rentCommercialTarget:  number; // Soll Gewerbe
  rentResidentialActual: number; // Ist Wohnen
  rentCommercialActual:  number; // Ist Gewerbe
  vacancyRate:           number;
  vacancyAvg5y:          number; // Leerstand Schnitt 5 Jahre
  operatingCosts:        number;
  maintenanceCosts:      number;
  livingArea:            number;
  commercialArea:        number;
  // Parkplätze
  aapCount:              number; // Abstellplätze aussen
  ehpCount:              number; // Einstellhalle / Garage
  // Lage
  microLocation:         LocationRating;
  macroLocation:         LocationRating;
  publicTransport:       LocationRating;
}

export function calculateValuation(input: CalculationInput): ValuationResult {
  const {
    city, condition,
    rentResidentialTarget, rentCommercialTarget,
    rentResidentialActual, rentCommercialActual,
    vacancyRate, vacancyAvg5y,
    operatingCosts, maintenanceCosts,
    livingArea, commercialArea,
    aapCount, ehpCount,
    microLocation, macroLocation, publicTransport,
  } = input;

  // 1. Lageklasse
  const municipality = findMunicipality(city);
  let locationCategory: LocationCategory = municipality?.locationClass ?? "durchschnitt";
  if (macroLocation === "sehr_gut") locationCategory = "sehrStark";
  else if (macroLocation === "schwach") locationCategory = "sekundaer";

  const range = VALUATION_CONFIG.capRateRanges[locationCategory];
  const baseCapRate = (range.min + range.max) / 2;

  // 2. Zustandsanpassung (6-stufig)
  const conditionDelta = (VALUATION_CONFIG.conditionDelta as Record<string, number>)[condition] ?? 0;

  // 3. Gewerbeanteil
  const grossTarget = rentResidentialTarget + rentCommercialTarget;
  const commShareRev = grossTarget > 0 ? rentCommercialTarget / grossTarget : 0;
  const totalArea = livingArea + commercialArea;
  const commShareArea = totalArea > 0 ? commercialArea / totalArea : 0;
  const commercialShare = Math.max(commShareRev, commShareArea);
  const residentialShare = 1 - commercialShare;

  let commercialSurcharge = 0;
  let gwInfo = "";
  if (commercialShare > 0.5) {
    commercialSurcharge = 0.30;
    gwInfo = "Dominanter Gewerbeanteil (>50 %) — erhöhter Risikozuschlag";
  } else if (commercialShare >= 0.25) {
    commercialSurcharge = 0.15;
    gwInfo = "Mittlerer Gewerbeanteil (25–50 %) — moderater Zuschlag";
  } else if (commercialShare > 0) {
    commercialSurcharge = 0.025;
    gwInfo = "Geringer Gewerbeanteil (<25 %)";
  }

  // 4. Lagekorrekturen
  const microCorrection = VALUATION_CONFIG.microCorrection[microLocation] ?? 0;
  const oevCorrection   = VALUATION_CONFIG.oevCorrection[publicTransport] ?? 0;

  // 5. Finaler Kap.-Satz
  const finalCapRate = Math.max(2.5, Math.min(6.5,
    baseCapRate + conditionDelta + commercialSurcharge + microCorrection + oevCorrection
  ));

  const capRateBreakdown: CapRateBreakdown = {
    base: baseCapRate,
    conditionDelta,
    commercialSurcharge,
    microCorrection,
    oevCorrection,
    final: finalCapRate,
  };

  // 6. Erträge
  // Ist-Erträge (sofern vorhanden), sonst Soll abzgl. Leerstand
  const istWohnen  = rentResidentialActual > 0 ? rentResidentialActual : rentResidentialTarget * (1 - vacancyRate / 100);
  const istGewerbe = rentCommercialActual  > 0 ? rentCommercialActual  : rentCommercialTarget  * (1 - vacancyRate / 100);
  const effectiveIncome = istWohnen + istGewerbe;

  // Parkplatz-Ertrag
  const parkingIncome = calcParkingIncome(aapCount, ehpCount, locationCategory);

  // Nachhaltige Ertragsbasis (Soll abzgl. langfristiger Leerstand)
  const leerstandNachhaltig = Math.max(vacancyRate, vacancyAvg5y);
  const sustainableIncome = (grossTarget * (1 - leerstandNachhaltig / 100)) + parkingIncome;

  const grossIncome = grossTarget + parkingIncome;
  const netIncome = Math.max(0, effectiveIncome + parkingIncome - operatingCosts - maintenanceCosts);

  // 7. Werte
  const valueSimple      = (effectiveIncome + parkingIncome) / (finalCapRate / 100);
  const valueSustainable = sustainableIncome / (finalCapRate / 100);
  const valueExtended    = netIncome > 0 ? netIncome / (finalCapRate / 100) : 0;
  const valueConservative = (effectiveIncome + parkingIncome) / ((finalCapRate + VALUATION_CONFIG.scenarioBandwidth) / 100);
  const valueOptimistic   = (effectiveIncome + parkingIncome) / ((finalCapRate - VALUATION_CONFIG.scenarioBandwidth) / 100);

  // 8. Differenz Soll/Ist Analyse
  const sollIstDiffWohnen  = rentResidentialTarget - istWohnen;
  const sollIstDiffGewerbe = rentCommercialTarget  - istGewerbe;
  const hasUptidePotential = sollIstDiffWohnen > 0.05 * rentResidentialTarget || sollIstDiffGewerbe > 0.05 * rentCommercialTarget;

  // 9. Confidence
  let confidence: ConfidenceLevel = "Medium";
  if (commercialShare < 0.2 && !["stufe1","stufe2"].includes(condition) && municipality) {
    confidence = "High";
  } else if (commercialShare > 0.4 || !municipality || ["stufe1","stufe2"].includes(condition)) {
    confidence = "Low";
  }

  // 10. Plausibilisierungstext
  let plausiText =
    `Das Objekt in ${city || "der Gemeinde"} weist aufgrund der ${getLageLabel(locationCategory)} ` +
    `und des Zustands (${getConditionLabel(condition)}) einen Kapitalisierungssatz von ` +
    `${formatPct(finalCapRate)} auf.`;
  if (gwInfo) plausiText += ` ${gwInfo}.`;
  if (hasUptidePotential) plausiText += ` Es besteht Mietertragspotenzial bei Neuvermietung.`;
  if (parkingIncome > 0) plausiText += ` Parkplatz-Zusatzertrag von ${formatCHF(parkingIncome)}/Jahr eingerechnet.`;

  return {
    grossIncome,
    effectiveIncome: effectiveIncome + parkingIncome,
    netIncome,
    sustainableIncome,
    parkingIncome,
    capRateBreakdown,
    valueSimple,
    valueSustainable,
    valueExtended,
    valueConservative,
    valueOptimistic,
    locationCategory,
    commercialShare,
    residentialShare,
    gwInfo,
    confidence,
    plausiText,
    sollIstDiffWohnen,
    sollIstDiffGewerbe,
    hasUptidePotential,
  };
}

// ── Drei Szenarien ───────────────────────────────────────────
export interface ScenarioRow {
  label:   string;
  capRate: number;
  value:   number;
  delta:   number;
}

export function buildScenarios(effectiveIncome: number, neutralCapRate: number): ScenarioRow[] {
  const bw = VALUATION_CONFIG.scenarioBandwidth;
  return [
    { label: "Konservativ",  capRate: neutralCapRate + bw, value: effectiveIncome / ((neutralCapRate + bw) / 100), delta: -bw },
    { label: "Neutral",      capRate: neutralCapRate,      value: effectiveIncome / (neutralCapRate / 100),        delta:   0 },
    { label: "Optimistisch", capRate: neutralCapRate - bw, value: effectiveIncome / ((neutralCapRate - bw) / 100), delta:  bw },
  ];
}