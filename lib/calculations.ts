// ============================================================
// MFH Bewertung – Kern-Berechnungslogik v3
// Kapitalisierungssatz-Herleitung nach IAZI-Methodik
// Risikoloser Satz + Marktprämie + objektspezifische Zu/Abschläge
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

// ── Konfiguration ───────────────────────────────────────────
export const VALUATION_CONFIG = {

  // Risikoloser Satz: Rendite 10-jährige Bundesobligationen (aktuell ~0.5%)
  riskFreeRate: 0.50,

  // Marktprämie nach Lageklasse (Bruttorendite-Aufschlag)
  marketPremium: {
    sehrStark:    3.10, // Zürich, Genf, Zug
    gut:          3.40, // Bern, Basel, Winterthur
    durchschnitt: 3.80, // Agglomerationsgemeinden
    sekundaer:    4.30, // Ländliche Lagen
  },

  // Makrolage-Zuschlag (analog IAZI)
  macroLocationDelta: {
    sehr_gut:  0.00,
    gut:       0.30,
    mittel:    0.60,
    schwach:   1.00,
  },

  // Mikrolage-Korrektur (Lage im Ort)
  microLocationDelta: {
    sehr_gut: -0.10,
    gut:       0.00,
    mittel:    0.10,
    schwach:   0.20,
  },

  // Gebäudezustand (6-stufig, analog IAZI)
  conditionDelta: {
    stufe6: -0.15, // Hervorragend / Neubau
    stufe5: -0.08, // Sehr gut
    stufe4:  0.00, // Gut (Referenz)
    stufe3:  0.12, // Mittel
    stufe2:  0.28, // Eher schlecht
    stufe1:  0.45, // Schlecht
  },

  // Gebäudealter-Zuschlag (analog IAZI "Gebäudealter")
  // Wird aus Baujahr berechnet
  ageDelta: (buildYear: number, renovYear?: number): number => {
    const effectiveYear = renovYear ?? buildYear;
    const age = new Date().getFullYear() - effectiveYear;
    if (age <= 5)   return -0.05; // Neubau / frisch saniert
    if (age <= 15)  return  0.00; // Jung
    if (age <= 30)  return  0.03; // Mittel
    if (age <= 50)  return  0.08; // Älter
    return 0.15;                  // Alt (>50 Jahre)
  },

  // Bauqualität (analog IAZI)
  qualityDelta: {
    hoch:          -0.05,
    gut:            0.00,
    standard:       0.05,
    einfach:        0.10,
  },

  // Nutzungsart / Gewerbeanteil (analog IAZI "Nutzungsart")
  commercialDelta: (share: number): number => {
    if (share <= 0)    return -0.10; // Reines Wohnen — bevorzugt
    if (share <= 0.10) return -0.05;
    if (share <= 0.25) return  0.00;
    if (share <= 0.50) return  0.15; // Mittlerer Gewerbeanteil
    return 0.35;                     // Dominanter Gewerbeanteil
  },

  // ÖV-Anbindung (analog IAZI — leichter Einfluss)
  oevDelta: {
    sehr_gut: -0.03,
    gut:       0.00,
    mittel:    0.03,
    schwach:   0.08,
  },

  // Szenario-Bandbreite
  scenarioBandwidth: 0.30,

  // Parkplatz-Monatsmieten nach Lageklasse
  parkingValues: {
    sehrStark:    { aap: 70,  ehp: 160 },
    gut:          { aap: 60,  ehp: 140 },
    durchschnitt: { aap: 50,  ehp: 125 },
    sekundaer:    { aap: 40,  ehp: 100 },
  },
} as const;

// ── Labels ──────────────────────────────────────────────────
export const CONDITION_OPTIONS = [
  { value: "stufe6", label: "6 – Hervorragend", desc: "Neubau oder neuwertig (jünger als 5 Jahre)" },
  { value: "stufe5", label: "5 – Sehr gut",     desc: "Sanierungstendenz in 20–30 Jahren" },
  { value: "stufe4", label: "4 – Gut",           desc: "Sanierungstendenz in 10–15 Jahren (Referenz)" },
  { value: "stufe3", label: "3 – Mittel",        desc: "Sanierungstendenz in 4–6 Jahren" },
  { value: "stufe2", label: "2 – Eher schlecht", desc: "Sanierungsbedürftig" },
  { value: "stufe1", label: "1 – Schlecht",      desc: "Stark sanierungsbedürftig / fast unbewohnbar" },
] as const;

export const QUALITY_OPTIONS = [
  { value: "hoch",     label: "Hoch",     desc: "Hochwertige Materialien, moderner Grundriss, Lift, etc." },
  { value: "gut",      label: "Gut",      desc: "Guter Standard, zweckmässige Aufteilung" },
  { value: "standard", label: "Standard", desc: "Gängiger Standard, normale Ausstattung" },
  { value: "einfach",  label: "Einfach",  desc: "Einfache Ausstattung, ältere Baumaterialien" },
] as const;

export const LOCATION_INFO = {
  mikrolage: {
    title: "Mikrolage (Lage im Ort)",
    desc: "Qualität der unmittelbaren Umgebung innerhalb der Gemeinde.",
    criteria: [
      "Lärmbelastung (Strasse, Bahn, Industrie)",
      "Aussicht und Besonnung",
      "Nachbarschaft und Quartierqualität",
      "Nähe zu Grünflächen und Erholung",
      "Einschränkungen durch Servitute oder Emissionen",
    ],
  },
  makrolage: {
    title: "Makrolage (Gemeinde)",
    desc: "Qualität der Gemeinde / des Quartiers.",
    criteria: [
      "Wirtschaftliche Attraktivität und Steuerniveau",
      "Bevölkerungsentwicklung und Nachfrage",
      "ÖV-Anbindung und Erreichbarkeit",
      "Einkaufsmöglichkeiten und Infrastruktur",
      "Schulen, Kindergärten, medizinische Versorgung",
    ],
  },
  oev: {
    title: "ÖV-Anbindung",
    desc: "Erreichbarkeit des nächsten ÖV-Knotens zu Fuss.",
    criteria: [
      "Sehr gut: S-Bahn/Tram < 3 Min zu Fuss",
      "Gut: ÖV-Haltestelle 3–7 Min zu Fuss",
      "Mittel: ÖV-Haltestelle 7–15 Min zu Fuss",
      "Schwach: > 15 Min oder schlechte Taktfrequenz",
    ],
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
  return CONDITION_OPTIONS.find(o => o.value === c)?.label ?? c;
}

export function formatCHF(amount: number): string {
  if (!amount || isNaN(amount)) return "—";
  return "CHF " + Math.round(amount).toLocaleString("de-CH").replace(/,/g, "'");
}

export function formatPct(rate: number): string {
  if (rate === null || rate === undefined || isNaN(rate)) return "—";
  return rate.toFixed(2).replace(".", ",") + " %";
}

export function calcParkingIncome(aap: number, ehp: number, loc: LocationCategory): number {
  const r = VALUATION_CONFIG.parkingValues[loc];
  return (aap * r.aap + ehp * r.ehp) * 12;
}

// ── Sanierungsbedarf-Schätzung (verbessert, analog IAZI) ────
export interface RenovationItem {
  element: string;
  costMin: number;
  costMax: number;
  urgency: "none" | "low" | "medium" | "high";
  note: string;
}

// Lebensdauer-Tabelle pro Bauteil (Jahre bis Erneuerung fällig)
const ELEMENT_LIFECYCLE: {
  element: string;
  lifespan: number;           // Typische Lebensdauer in Jahren
  costPerM2Min: number;       // CHF pro m2 Gesamtfläche (Min)
  costPerM2Max: number;       // CHF pro m2 Gesamtfläche (Max)
}[] = [
  { element: "Dach / Dachdämmung",       lifespan: 35, costPerM2Min: 80,  costPerM2Max: 130 },
  { element: "Fassade und Storen",       lifespan: 30, costPerM2Min: 120, costPerM2Max: 200 },
  { element: "Fenster und Türen",        lifespan: 30, costPerM2Min: 90,  costPerM2Max: 150 },
  { element: "Heizung / Technik",        lifespan: 20, costPerM2Min: 60,  costPerM2Max: 100 },
  { element: "Sanitär / Rohrleitungen",  lifespan: 40, costPerM2Min: 55,  costPerM2Max: 90  },
  { element: "Elektroinstallationen",    lifespan: 35, costPerM2Min: 50,  costPerM2Max: 80  },
  { element: "Küchen",                   lifespan: 25, costPerM2Min: 100, costPerM2Max: 180 },
  { element: "Bäder / Nasszellen",       lifespan: 25, costPerM2Min: 110, costPerM2Max: 190 },
  { element: "Innenausbau / Bodenbeläge", lifespan: 20, costPerM2Min: 60,  costPerM2Max: 100 },
];

// Zustandsfaktor: wie stark der Zustand die Kosten beeinflusst
const CONDITION_COST_FACTOR: Record<string, number> = {
  stufe6: 0.0,   // Hervorragend → kein Bedarf
  stufe5: 0.0,   // Sehr gut → kein Bedarf
  stufe4: 0.6,   // Gut → reduzierter Bedarf
  stufe3: 0.85,  // Mittel → fast voller Bedarf
  stufe2: 1.0,   // Eher schlecht → voller Bedarf
  stufe1: 1.15,  // Schlecht → erhöhter Bedarf (Mehrkosten)
};

function getUrgency(remainingLife: number): "none" | "low" | "medium" | "high" {
  if (remainingLife > 15) return "none";
  if (remainingLife > 5)  return "low";
  if (remainingLife > 0)  return "medium";
  return "high"; // Lebensdauer überschritten
}

function getUrgencyNote(urgency: "none" | "low" | "medium" | "high"): string {
  switch (urgency) {
    case "none":   return "Kein Handlungsbedarf absehbar";
    case "low":    return "Innerhalb 10–15 Jahren";
    case "medium": return "Innerhalb 5–10 Jahren";
    case "high":   return "Kurzfristig / überfällig";
  }
}

export function estimateRenovationNeeds(
  buildYear: number,
  renovYear: number | null,
  livingArea: number,
  condition: string
): RenovationItem[] {
  const effectiveYear = renovYear ?? buildYear;
  const age = new Date().getFullYear() - effectiveYear;
  const totalArea = Math.max(livingArea, 200); // Mindestfläche 200m2

  // Kein Bedarf bei Neubau oder hervorragendem Zustand
  const condFactor = CONDITION_COST_FACTOR[condition] ?? 0.85;
  if (condFactor <= 0 || age <= 5) return [];

  const items: RenovationItem[] = [];

  for (const el of ELEMENT_LIFECYCLE) {
    const remainingLife = el.lifespan - age;
    const urgency = getUrgency(remainingLife);

    // Element überspringen wenn noch >15 Jahre Restlebensdauer UND Zustand gut
    if (urgency === "none" && condFactor < 0.85) continue;
    if (urgency === "none") continue;

    // Kosten = Fläche × CHF/m2 × Zustandsfaktor × Dringlichkeitsfaktor
    const urgencyFactor = urgency === "high" ? 1.0 : urgency === "medium" ? 0.8 : 0.5;
    const costMin = Math.round(el.costPerM2Min * totalArea * condFactor * urgencyFactor / 100) * 100;
    const costMax = Math.round(el.costPerM2Max * totalArea * condFactor * urgencyFactor / 100) * 100;

    if (costMin > 0) {
      items.push({
        element: el.element,
        costMin,
        costMax,
        urgency,
        note: getUrgencyNote(urgency),
      });
    }
  }

  // Sortieren: dringendste zuerst
  const urgencyOrder = { high: 0, medium: 1, low: 2, none: 3 };
  items.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  return items;
}

// ── Input Interface ─────────────────────────────────────────
export interface CalculationInput {
  city:                  string;
  condition:             string;
  buildYear?:            number;
  renovYear?:            number;
  buildQuality?:         string;
  rentResidentialTarget: number;
  rentCommercialTarget:  number;
  rentResidentialActual: number;
  rentCommercialActual:  number;
  vacancyRate:           number;
  vacancyAvg5y:          number;
  operatingCosts:        number;
  maintenanceCosts:      number;
  livingArea:            number;
  commercialArea:        number;
  aapCount:              number;
  ehpCount:              number;
  microLocation:         LocationRating;
  macroLocation:         LocationRating;
  publicTransport:       LocationRating;
}

// ── Hauptberechnung ─────────────────────────────────────────
export function calculateValuation(input: CalculationInput): ValuationResult {
  const {
    city, condition, buildYear = 1970, renovYear, buildQuality = "gut",
    rentResidentialTarget, rentCommercialTarget,
    rentResidentialActual, rentCommercialActual,
    vacancyRate, vacancyAvg5y,
    operatingCosts, maintenanceCosts,
    livingArea, commercialArea,
    aapCount, ehpCount,
    microLocation, macroLocation, publicTransport,
  } = input;

  // 1. Lageklasse aus Gemeinde-DB oder Makrolage
  const municipality = findMunicipality(city);
  let locationCategory: LocationCategory = municipality?.locationClass ?? "durchschnitt";
  if (macroLocation === "sehr_gut") locationCategory = "sehrStark";
  else if (macroLocation === "schwach") locationCategory = "sekundaer";

  // 2. Kap.-Satz Herleitung nach IAZI-Methodik
  const riskFreeRate  = VALUATION_CONFIG.riskFreeRate;
  const marketPremium = VALUATION_CONFIG.marketPremium[locationCategory];
  const macroDelta    = VALUATION_CONFIG.macroLocationDelta[macroLocation];
  const microDelta    = VALUATION_CONFIG.microLocationDelta[microLocation];
  const condDelta     = (VALUATION_CONFIG.conditionDelta as Record<string, number>)[condition] ?? 0;
  const ageDelta      = VALUATION_CONFIG.ageDelta(buildYear, renovYear);
  const qualityDelta  = (VALUATION_CONFIG.qualityDelta as Record<string, number>)[buildQuality] ?? 0;
  const oevDelta      = VALUATION_CONFIG.oevDelta[publicTransport];

  // Gewerbeanteil
  const grossTarget   = rentResidentialTarget + rentCommercialTarget;
  const totalArea     = livingArea + commercialArea;
  const commShareRev  = grossTarget > 0 ? rentCommercialTarget / grossTarget : 0;
  const commShareArea = totalArea > 0 ? commercialArea / totalArea : 0;
  const commercialShare = Math.max(commShareRev, commShareArea);
  const commercialSurcharge = VALUATION_CONFIG.commercialDelta(commercialShare);

  const finalCapRate = Math.max(2.50, Math.min(7.00,
    riskFreeRate + marketPremium + macroDelta + microDelta +
    condDelta + ageDelta + qualityDelta + commercialSurcharge + oevDelta
  ));

  const capRateBreakdown: CapRateBreakdown = {
    riskFreeRate,
    marketPremium,
    macroDelta,
    microDelta,
    conditionDelta: condDelta,
    ageDelta,
    qualityDelta,
    commercialSurcharge,
    oevDelta,
    base: riskFreeRate + marketPremium,
    final: finalCapRate,
  };

  // 3. Erträge
  const istWohnen  = rentResidentialActual > 0 ? rentResidentialActual : rentResidentialTarget * (1 - vacancyRate / 100);
  const istGewerbe = rentCommercialActual  > 0 ? rentCommercialActual  : rentCommercialTarget  * (1 - vacancyRate / 100);
  const parkingIncome = calcParkingIncome(aapCount, ehpCount, locationCategory);

  const leerstandNachhaltig = Math.max(vacancyRate, vacancyAvg5y);
  const sustainableIncome   = grossTarget * (1 - leerstandNachhaltig / 100) + parkingIncome;
  const effectiveIncome     = istWohnen + istGewerbe + parkingIncome;
  const grossIncome         = grossTarget + parkingIncome;
  const netIncome           = Math.max(0, effectiveIncome - operatingCosts - maintenanceCosts);

  // 4. Werte
  const valueSimple       = effectiveIncome   / (finalCapRate / 100);
  const valueSustainable  = sustainableIncome / (finalCapRate / 100);
  const valueExtended     = netIncome > 0 ? netIncome / (finalCapRate / 100) : 0;
  const valueConservative = effectiveIncome / ((finalCapRate + VALUATION_CONFIG.scenarioBandwidth) / 100);
  const valueOptimistic   = effectiveIncome / ((finalCapRate - VALUATION_CONFIG.scenarioBandwidth) / 100);

  // 5. Substanzwert (analog RealAdvisor)
  const buildYear_ = buildYear ?? 1970;
  const ageForSubstanz = new Date().getFullYear() - (renovYear ?? buildYear_);
  const depreciationRate = Math.min(ageForSubstanz * 0.01, 0.50); // max 50% Abschreibung
  const buildingNewValue = totalArea > 0 ? (livingArea + commercialArea) * 2800 : livingArea * 2800;
  const landValue = totalArea > 0 ? 0 : 0; // Grundstückswert: wird separat im UI eingegeben
  const substanzValue = buildingNewValue * (1 - depreciationRate) + landValue;

  // 6. Soll/Ist Differenz
  const sollIstDiffWohnen  = rentResidentialTarget - istWohnen;
  const sollIstDiffGewerbe = rentCommercialTarget  - istGewerbe;
  const hasUptidePotential = sollIstDiffWohnen > 0.05 * rentResidentialTarget
                          || sollIstDiffGewerbe > 0.05 * rentCommercialTarget;

  // 7. Confidence
  let confidence: ConfidenceLevel = "Medium";
  if (commercialShare < 0.2 && !["stufe1","stufe2"].includes(condition) && municipality) confidence = "High";
  else if (commercialShare > 0.4 || !municipality || ["stufe1","stufe2"].includes(condition)) confidence = "Low";

  // 8. Gewerbezuschlag Info
  let gwInfo = "";
  if (commercialShare > 0.5)       gwInfo = "Dominanter Gewerbeanteil (>50%) — erhöhter Risikozuschlag";
  else if (commercialShare >= 0.25) gwInfo = "Mittlerer Gewerbeanteil (25–50%) — moderater Zuschlag";
  else if (commercialShare > 0)     gwInfo = `Geringer Gewerbeanteil (${Math.round(commercialShare*100)}%)`;

  // 9. Plausibilisierungstext
  const plausiText =
    `Das Objekt in ${city || "der Gemeinde"} weist aufgrund der ${getLageLabel(locationCategory)} ` +
    `und des Zustands (${getConditionLabel(condition)}) einen Kapitalisierungssatz von ` +
    `${formatPct(finalCapRate)} auf (Basis: ${formatPct(riskFreeRate + marketPremium)}, ` +
    `Korrekturen: Makrolage ${formatPct(macroDelta)}, Zustand ${formatPct(condDelta)}, ` +
    `Alter ${formatPct(ageDelta)}).` +
    (gwInfo ? ` ${gwInfo}.` : "") +
    (hasUptidePotential ? " Mietertragspotenzial bei Neuvermietung vorhanden." : "") +
    (parkingIncome > 0 ? ` Parkplatz-Zusatzertrag: ${formatCHF(parkingIncome)}/Jahr.` : "");

  return {
    grossIncome, effectiveIncome, netIncome,
    sustainableIncome, parkingIncome,
    substanzValue,
    capRateBreakdown,
    valueSimple, valueSustainable, valueExtended,
    valueConservative, valueOptimistic,
    locationCategory,
    commercialShare, residentialShare: 1 - commercialShare,
    gwInfo, confidence, plausiText,
    sollIstDiffWohnen, sollIstDiffGewerbe, hasUptidePotential,
  };
}

// ── Szenarien ───────────────────────────────────────────────
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