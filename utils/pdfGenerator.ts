import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ValuationWithProperty, Profile } from "@/types";
import { formatCHF, formatPct, getLageLabel, buildScenarios } from "@/lib/calculations";
import type { LocationCategory } from "@/types";

const C = {
  white:    rgb(1, 1, 1),
  bg:       rgb(0.97, 0.98, 0.99),
  blue:     rgb(0.14, 0.38, 0.87),
  blueDark: rgb(0.10, 0.28, 0.67),
  text:     rgb(0.10, 0.13, 0.20),
  muted:    rgb(0.42, 0.48, 0.58),
  light:    rgb(0.94, 0.96, 0.99),
};

function splitText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}

export async function generateValuationPDF(
  valuation: ValuationWithProperty,
  profile: Profile | null
): Promise<Uint8Array> {
  const doc  = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const norm = await doc.embedFont(StandardFonts.Helvetica);

  const page = doc.addPage([595, 842]);
  const W = 595, ML = 40, MR = 555;
  let y = 802;

  const today = new Date().toLocaleDateString("de-CH");

  page.drawRectangle({ x: 0, y: 762, width: W, height: 80, color: C.blue });
  page.drawText("INDIKATIVER BEWERTUNGSBERICHT", {
    x: ML, y: 822, size: 8, font: bold, color: rgb(0.7, 0.85, 1),
  });
  page.drawText("Mehrfamilienhaus Schweiz", {
    x: ML, y: 804, size: 16, font: bold, color: C.white,
  });
  const propName    = valuation.properties?.name    ?? "";
  const propAddress = valuation.properties?.address ?? "";
  const propCity    = valuation.properties?.city    ?? "";
  const propCanton  = valuation.properties?.canton  ?? "";
  const addr = [propName, propAddress, `${propCity}, ${propCanton}`].filter(Boolean).join("  |  ");
  page.drawText(addr.slice(0, 80), { x: ML, y: 786, size: 8, font: norm, color: rgb(0.7, 0.85, 1) });
  page.drawText(`Erstellt: ${today}`, { x: MR - 60, y: 786, size: 8, font: norm, color: rgb(0.7, 0.85, 1) });
  y = 750;

  const section = (title: string) => {
    y -= 8;
    page.drawRectangle({ x: ML, y: y - 6, width: MR - ML, height: 18, color: C.light });
    page.drawRectangle({ x: ML, y: y - 6, width: 3, height: 18, color: C.blue });
    page.drawText(title, { x: ML + 8, y: y + 4, size: 8, font: bold, color: C.blueDark });
    y -= 16;
  };

  const row = (label: string, value: string, shade = false) => {
    if (y < 60) return;
    if (shade) page.drawRectangle({ x: ML, y: y - 5, width: MR - ML, height: 14, color: C.bg });
    page.drawText(label, { x: ML + 6, y: y + 1, size: 8.5, font: norm, color: C.muted, maxWidth: 200 });
    page.drawText(value, { x: MR - 4, y: y + 1, size: 8.5, font: bold, color: C.text, maxWidth: 160 });
    y -= 14;
  };

  if (profile?.full_name || profile?.company) {
    section("ERSTELLT DURCH");
    if (profile.full_name) row("Name", profile.full_name, false);
    if (profile.company)   row("Unternehmen", profile.company, true);
    if (profile.phone)     row("Telefon", profile.phone, false);
  }

  section("1. OBJEKTUEBERSICHT");
  row("Bezeichnung", propName || "---", false);
  row("Adresse",     propAddress || "---", true);
  row("Ort",         `${propCity}, ${propCanton}`, false);
  row("Erfasst am",  new Date(valuation.created_at).toLocaleDateString("de-CH"), true);

  section("2. ERTRAGSDATEN");
  row("Soll-Mietertrag Wohnen p.a.",  formatCHF(valuation.rent_residential), false);
  row("Soll-Mietertrag Gewerbe p.a.", formatCHF(valuation.rent_commercial), true);
  row("Brutto-Sollertrag",            formatCHF(valuation.gross_income), false);
  row("Effektiver Jahresertrag",       formatCHF(valuation.effective_income), true);
  row("Leerstandsquote",              `${valuation.vacancy_rate} %`, false);
  if (valuation.operating_costs > 0)
    row("Betriebskosten p.a.", formatCHF(valuation.operating_costs), true);
  if (valuation.maintenance_costs > 0)
    row("Unterhaltskosten p.a.", formatCHF(valuation.maintenance_costs), false);

  section("3. KAPITALISIERUNGSSATZ-HERLEITUNG");
  row("Lagekategorie",
    getLageLabel((valuation.location_category as LocationCategory) ?? "durchschnitt"), false);
  row("Basis-Kap.-Satz",    formatPct(valuation.base_cap_rate ?? 0), true);
  row("Zustandsanpassung",
    `${(valuation.condition_delta ?? 0) >= 0 ? "+" : ""}${formatPct(valuation.condition_delta ?? 0)}`, false);
  row("Gewerbezuschlag",    `+${formatPct(valuation.commercial_surcharge ?? 0)}`, true);
  row("Mikrolage-Korrektur",
    `${(valuation.micro_correction ?? 0) >= 0 ? "+" : ""}${formatPct(valuation.micro_correction ?? 0)}`, false);

  y -= 4;
  page.drawRectangle({ x: ML, y: y - 5, width: MR - ML, height: 18, color: C.blue });
  page.drawText("Finaler Kapitalisierungssatz", { x: ML + 6, y: y + 4, size: 9, font: bold, color: C.white });
  page.drawText(formatPct(valuation.cap_rate), { x: MR - 4, y: y + 4, size: 10, font: bold, color: C.white });
  y -= 22;

  section("4. BEWERTUNGSERGEBNIS");

  page.drawRectangle({ x: ML, y: y - 8, width: MR - ML, height: 36, color: C.light });
  page.drawRectangle({ x: ML, y: y - 8, width: 3, height: 36, color: C.blue });
  page.drawText("Indikativer Marktwert", { x: ML + 10, y: y + 18, size: 9, font: bold, color: C.blueDark });
  page.drawText(formatCHF(valuation.value_simple), { x: ML + 10, y: y + 3, size: 15, font: bold, color: C.blue });
  y -= 46;

  const scenarios = buildScenarios(valuation.effective_income, valuation.cap_rate);
  scenarios.forEach((s, i) => {
    row(`${s.label}: ${formatPct(s.capRate)}`, formatCHF(s.value), i % 2 === 0);
  });

  if (valuation.value_extended && valuation.value_extended > 0) {
    row("Nettowert (erweiterter Modus)", formatCHF(valuation.value_extended), false);
  }

  y -= 8;
  page.drawRectangle({ x: ML, y: y - 8, width: MR - ML, height: 28, color: C.light });
  page.drawRectangle({ x: ML, y: y - 8, width: 3, height: 28, color: C.blue });
  page.drawText("Naechste Schritte", { x: ML + 10, y: y + 10, size: 9, font: bold, color: C.blueDark });
  page.drawText("Kontaktieren Sie uns fuer eine praezise Bewertung oder Verkaufsberatung.", {
    x: ML + 10, y: y - 1, size: 8, font: norm, color: C.muted, maxWidth: MR - ML - 20,
  });
  y -= 36;

  const disc =
    "Rechtlicher Hinweis: Diese Berechnung ist eine indikative, modellbasierte Einschaetzung. " +
    "Sie ersetzt keine vollstaendige Verkehrswertschaetzung, keine hedonische Bewertung " +
    "und kein gerichtsfestes Gutachten. Alle Angaben ohne Gewaehr.";
  const discLines = splitText(disc, 95);
  page.drawRectangle({
    x: ML, y: y - discLines.length * 10 - 4,
    width: MR - ML, height: discLines.length * 10 + 8,
    color: C.bg,
  });
  discLines.forEach((line, i) => {
    page.drawText(line, { x: ML + 6, y: y - i * 10, size: 7, font: norm, color: C.muted });
  });

  page.drawText(`MFH Bewertung Schweiz  |  Erstellt: ${today}`, {
    x: ML, y: 20, size: 7, font: norm, color: C.muted,
  });
  page.drawText("Seite 1 / 1", { x: MR - 30, y: 20, size: 7, font: norm, color: C.muted });

  return doc.save();
}