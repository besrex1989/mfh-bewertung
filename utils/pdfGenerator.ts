import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ValuationWithProperty, Profile } from "@/types";
import { formatCHF, formatPct, getLageLabel, getConditionLabel, buildScenarios, CONDITION_OPTIONS } from "@/lib/calculations";
import type { LocationCategory } from "@/types";

const C = {
  white:    rgb(1, 1, 1),
  bg:       rgb(0.97, 0.98, 0.99),
  blue:     rgb(0.14, 0.38, 0.87),
  blueDark: rgb(0.10, 0.28, 0.67),
  blueLight: rgb(0.93, 0.96, 1.0),
  text:     rgb(0.10, 0.13, 0.20),
  muted:    rgb(0.42, 0.48, 0.58),
  amber:    rgb(0.85, 0.55, 0.10),
  amberBg:  rgb(1.0, 0.97, 0.88),
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

  // ── Header ─────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 762, width: W, height: 80, color: C.blue });
  page.drawText("INDIKATIVER BEWERTUNGSBERICHT", { x: ML, y: 822, size: 8, font: bold, color: rgb(0.7, 0.85, 1) });
  page.drawText("Mehrfamilienhaus Schweiz", { x: ML, y: 804, size: 16, font: bold, color: C.white });
  const addr = [valuation.properties?.name, valuation.properties?.address,
    `${valuation.properties?.city ?? ""}, ${valuation.properties?.canton ?? ""}`]
    .filter(Boolean).join("  |  ");
  page.drawText(addr.slice(0, 80), { x: ML, y: 786, size: 8, font: norm, color: rgb(0.7, 0.85, 1) });
  page.drawText(`Erstellt: ${today}`, { x: MR - 60, y: 786, size: 8, font: norm, color: rgb(0.7, 0.85, 1) });
  y = 750;

  const section = (title: string) => {
    y -= 8;
    page.drawRectangle({ x: ML, y: y - 6, width: MR - ML, height: 18, color: C.blueLight });
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

  // ── Makler ─────────────────────────────────────────
  if (profile?.full_name || profile?.company) {
    section("ERSTELLT DURCH");
    if (profile.full_name) row("Name", profile.full_name, false);
    if (profile.company)   row("Unternehmen", profile.company, true);
    if (profile.phone)     row("Telefon", profile.phone, false);
  }

  // ── Objekt ─────────────────────────────────────────
  section("1. OBJEKTUEBERSICHT");
  row("Bezeichnung", valuation.properties?.name ?? "---", false);
  row("Adresse",     valuation.properties?.address ?? "---", true);
  row("Ort",         `${valuation.properties?.city ?? ""}, ${valuation.properties?.canton ?? ""}`, false);
  row("Zustand",     getConditionLabel((valuation as any).properties?.condition ?? "stufe4"), true);
  row("Erfasst am",  new Date(valuation.created_at).toLocaleDateString("de-CH"), false);

  // ── Ertraege ───────────────────────────────────────
  section("2. ERTRAGSDATEN");

  // Soll-Ertraege
  row("Soll-Mietertrag Wohnen p.a.",  formatCHF(valuation.rent_residential), false);
  row("Soll-Mietertrag Gewerbe p.a.", formatCHF(valuation.rent_commercial), true);

  // Ist-Ertraege (falls abweichend)
  const istWohnen  = (valuation as any).rent_residential_actual;
  const istGewerbe = (valuation as any).rent_commercial_actual;
  if (istWohnen || istGewerbe) {
    row("Ist-Mietertrag Wohnen p.a.",  istWohnen  ? formatCHF(istWohnen)  : "= Soll-Ertrag", false);
    row("Ist-Mietertrag Gewerbe p.a.", istGewerbe ? formatCHF(istGewerbe) : "= Soll-Ertrag", true);
  }

  row("Brutto-Sollertrag",      formatCHF(valuation.gross_income), false);
  row("Effektiver Jahresertrag", formatCHF(valuation.effective_income), true);
  row("Leerstandsquote",        `${valuation.vacancy_rate} %`, false);

  const vacAvg = (valuation as any).vacancy_avg5y;
  if (vacAvg > 0) row("Leerstand Ø 5 Jahre", `${vacAvg} %`, true);

  if (valuation.operating_costs > 0)   row("Betriebskosten p.a.",   formatCHF(valuation.operating_costs), false);
  if (valuation.maintenance_costs > 0) row("Unterhaltskosten p.a.", formatCHF(valuation.maintenance_costs), true);

  // Parkplaetze
  const aap = (valuation as any).aap_count ?? 0;
  const ehp = (valuation as any).ehp_count ?? 0;
  if (aap > 0 || ehp > 0) {
    y -= 4;
    page.drawRectangle({ x: ML, y: y - 5, width: MR - ML, height: 14, color: rgb(0.93, 0.98, 0.93) });
    page.drawText(`Parkplaetze: ${aap} AAP / ${ehp} EHP`, { x: ML + 6, y: y + 1, size: 8.5, font: norm, color: C.muted });
    page.drawText(formatCHF(valuation.effective_income - valuation.rent_residential - valuation.rent_commercial), {
      x: MR - 4, y: y + 1, size: 8.5, font: bold, color: rgb(0.1, 0.5, 0.2),
    });
    y -= 14;
  }

  // ── Kap-Satz ───────────────────────────────────────
  section("3. KAPITALISIERUNGSSATZ-HERLEITUNG");
  row("Lagekategorie",      getLageLabel((valuation.location_category as LocationCategory) ?? "durchschnitt"), false);
  row("Basis-Kap.-Satz",    formatPct(valuation.base_cap_rate ?? 0), true);
  row("Zustandsanpassung",  `${(valuation.condition_delta ?? 0) >= 0 ? "+" : ""}${formatPct(valuation.condition_delta ?? 0)}`, false);
  row("Gewerbezuschlag",    `+${formatPct(valuation.commercial_surcharge ?? 0)}`, true);
  row("Mikrolage-Korrektur",`${(valuation.micro_correction ?? 0) >= 0 ? "+" : ""}${formatPct(valuation.micro_correction ?? 0)}`, false);
  row("OeV-Korrektur",      `${(valuation.oev_correction ?? 0) >= 0 ? "+" : ""}${formatPct(valuation.oev_correction ?? 0)}`, true);

  y -= 4;
  page.drawRectangle({ x: ML, y: y - 5, width: MR - ML, height: 18, color: C.blue });
  page.drawText("Finaler Kapitalisierungssatz", { x: ML + 6, y: y + 4, size: 9, font: bold, color: C.white });
  page.drawText(formatPct(valuation.cap_rate), { x: MR - 4, y: y + 4, size: 10, font: bold, color: C.white });
  y -= 22;

  // ── Ergebnis ───────────────────────────────────────
  section("4. BEWERTUNGSERGEBNIS");

  // Hauptwert
  page.drawRectangle({ x: ML, y: y - 8, width: MR - ML, height: 36, color: C.blueLight });
  page.drawRectangle({ x: ML, y: y - 8, width: 3, height: 36, color: C.blue });
  page.drawText("Indikativer Marktwert", { x: ML + 10, y: y + 18, size: 9, font: bold, color: C.blueDark });
  page.drawText(formatCHF(valuation.value_simple), { x: ML + 10, y: y + 3, size: 15, font: bold, color: C.blue });
  y -= 46;

  // Szenarien
  const scenarios = buildScenarios(valuation.effective_income, valuation.cap_rate);
  scenarios.forEach((s, i) => {
    row(`${s.label} (${formatPct(s.capRate)})`, formatCHF(s.value), i % 2 === 0);
  });

  if (valuation.value_extended && valuation.value_extended > 0) {
    row("Nettowert (erweiterter Modus)", formatCHF(valuation.value_extended), false);
  }

  // Mietpotenzial Box (falls relevant)
  const sollIstDiffWohnen  = valuation.rent_residential - ((valuation as any).rent_residential_actual || valuation.rent_residential);
  const sollIstDiffGewerbe = valuation.rent_commercial  - ((valuation as any).rent_commercial_actual  || valuation.rent_commercial);
  if (sollIstDiffWohnen > 500 || sollIstDiffGewerbe > 500) {
    y -= 4;
    page.drawRectangle({ x: ML, y: y - 8, width: MR - ML, height: 26, color: C.amberBg });
    page.drawRectangle({ x: ML, y: y - 8, width: 3, height: 26, color: C.amber });
    page.drawText("Mietpotenzial bei Neuvermietung", { x: ML + 10, y: y + 8, size: 9, font: bold, color: C.amber });
    const potLines = [];
    if (sollIstDiffWohnen > 500)  potLines.push(`Wohnen: +${formatCHF(sollIstDiffWohnen)}/Jahr`);
    if (sollIstDiffGewerbe > 500) potLines.push(`Gewerbe: +${formatCHF(sollIstDiffGewerbe)}/Jahr`);
    page.drawText(potLines.join("   "), { x: ML + 10, y: y - 2, size: 8, font: norm, color: C.amber, maxWidth: MR - ML - 20 });
    y -= 34;
  }

  // ── CTA ────────────────────────────────────────────
  y -= 8;
  page.drawRectangle({ x: ML, y: y - 8, width: MR - ML, height: 28, color: C.blueLight });
  page.drawRectangle({ x: ML, y: y - 8, width: 3, height: 28, color: C.blue });
  page.drawText("Naechste Schritte", { x: ML + 10, y: y + 10, size: 9, font: bold, color: C.blueDark });
  page.drawText("Kontaktieren Sie uns fuer eine praezise Bewertung oder Verkaufsberatung.", {
    x: ML + 10, y: y - 1, size: 8, font: norm, color: C.muted, maxWidth: MR - ML - 20,
  });
  y -= 36;

  // ── Disclaimer ─────────────────────────────────────
  const disc = "Rechtlicher Hinweis: Diese Berechnung ist eine indikative, modellbasierte Einschaetzung. Sie ersetzt keine vollstaendige Verkehrswertschaetzung, keine hedonische Bewertung und kein gerichtsfestes Gutachten. Alle Angaben ohne Gewaehr.";
  const discLines = splitText(disc, 95);
  page.drawRectangle({ x: ML, y: y - discLines.length * 10 - 4, width: MR - ML, height: discLines.length * 10 + 8, color: C.bg });
  discLines.forEach((line, i) => {
    page.drawText(line, { x: ML + 6, y: y - i * 10, size: 7, font: norm, color: C.muted });
  });

  // ── Footer ─────────────────────────────────────────
  page.drawText(`MFH Bewertung Schweiz  |  Erstellt: ${today}`, { x: ML, y: 20, size: 7, font: norm, color: C.muted });
  page.drawText("Seite 1 / 1", { x: MR - 30, y: 20, size: 7, font: norm, color: C.muted });

  return doc.save();
}