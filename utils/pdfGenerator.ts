import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ValuationWithProperty, Profile } from "@/types";
import { formatCHF, formatPct, getLageLabel, getConditionLabel, buildScenarios, CONDITION_OPTIONS, QUALITY_OPTIONS, estimateRenovationNeeds } from "@/lib/calculations";
import type { LocationCategory } from "@/types";

const C = {
  white:     rgb(1, 1, 1),
  bg:        rgb(0.97, 0.98, 0.99),
  blue:      rgb(0.14, 0.38, 0.87),
  blueDark:  rgb(0.10, 0.28, 0.67),
  blueLight: rgb(0.93, 0.96, 1.0),
  text:      rgb(0.10, 0.13, 0.20),
  muted:     rgb(0.42, 0.48, 0.58),
  amber:     rgb(0.85, 0.55, 0.10),
  amberBg:   rgb(1.0,  0.97, 0.88),
  green:     rgb(0.10, 0.55, 0.25),
  red:       rgb(0.80, 0.15, 0.15),
  redBg:     rgb(1.0,  0.95, 0.95),
  gray:      rgb(0.90, 0.92, 0.94),
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

  const W = 595, ML = 40, MR = 555;
  const today = new Date().toLocaleDateString("de-CH");

  // ── Seite 1 ─────────────────────────────────────────
  const page1 = doc.addPage([W, 842]);
  let y = 802;

  const drawHeader = (page: any) => {
    page.drawRectangle({ x: 0, y: 762, width: W, height: 80, color: C.blue });
    page.drawText("INDIKATIVER BEWERTUNGSBERICHT MFH", { x: ML, y: 822, size: 8, font: bold, color: rgb(0.7, 0.85, 1) });
    page.drawText("Mehrfamilienhaus Schweiz", { x: ML, y: 804, size: 16, font: bold, color: C.white });
    const addr = [valuation.properties?.name, valuation.properties?.address,
      `${valuation.properties?.city ?? ""}, ${valuation.properties?.canton ?? ""}`]
      .filter(Boolean).join("  |  ");
    page.drawText(addr.slice(0, 80), { x: ML, y: 786, size: 8, font: norm, color: rgb(0.7, 0.85, 1) });
    page.drawText(`Erstellt: ${today}`, { x: MR - 60, y: 786, size: 8, font: norm, color: rgb(0.7, 0.85, 1) });
  };

  drawHeader(page1);
  y = 750;

  const section = (page: any, title: string, yPos: number): number => {
    yPos -= 8;
    page.drawRectangle({ x: ML, y: yPos - 6, width: MR - ML, height: 18, color: C.blueLight });
    page.drawRectangle({ x: ML, y: yPos - 6, width: 3, height: 18, color: C.blue });
    page.drawText(title, { x: ML + 8, y: yPos + 4, size: 8, font: bold, color: C.blueDark });
    return yPos - 16;
  };

  const row = (page: any, label: string, value: string, shade: boolean, yPos: number, highlight?: string): number => {
    if (yPos < 60) return yPos;
    if (shade) page.drawRectangle({ x: ML, y: yPos - 5, width: MR - ML, height: 14, color: C.bg });
    page.drawText(label, { x: ML + 6, y: yPos + 1, size: 8.5, font: norm, color: C.muted, maxWidth: 210 });
    const valColor = highlight === "blue" ? C.blue : highlight === "green" ? C.green : highlight === "red" ? C.red : C.text;
    page.drawText(value, { x: MR - 4, y: yPos + 1, size: 8.5, font: bold, color: valColor, maxWidth: 160 });
    return yPos - 14;
  };

  // ── Makler ──
  if (profile?.full_name || profile?.company) {
    y = section(page1, "ERSTELLT DURCH", y);
    if (profile.full_name) y = row(page1, "Name",        profile.full_name, false, y);
    if (profile.company)   y = row(page1, "Unternehmen", profile.company,   true,  y);
    if (profile.phone)     y = row(page1, "Telefon",     profile.phone,     false, y);
  }

  // ── Objekt ──
  y = section(page1, "1. OBJEKTUEBERSICHT", y);
  y = row(page1, "Bezeichnung", valuation.properties?.name ?? "—", false, y);
  y = row(page1, "Adresse",     valuation.properties?.address ?? "—", true, y);
  y = row(page1, "Ort",         `${valuation.properties?.city ?? ""}, ${valuation.properties?.canton ?? ""}`, false, y);

  const propAny = valuation as any;
  const buildYear = propAny.properties?.build_year;
  const renovYear = propAny.properties?.renov_year;
  const buildQuality = propAny.properties?.build_quality ?? "gut";
  const condition = propAny.properties?.condition ?? "stufe4";

  if (buildYear) y = row(page1, "Baujahr", `${buildYear}${renovYear ? ` / Sanierung ${renovYear}` : ""}`, true, y);
  y = row(page1, "Zustand",     getConditionLabel(condition), false, y);
  y = row(page1, "Bauqualitaet", QUALITY_OPTIONS.find(o => o.value === buildQuality)?.label ?? buildQuality, true, y);
  y = row(page1, "Erfasst am",  new Date(valuation.created_at).toLocaleDateString("de-CH"), false, y);

  // ── Ertraege ──
  y = section(page1, "2. ERTRAGSDATEN", y);
  y = row(page1, "Soll-Mietertrag Wohnen p.a.",  formatCHF(valuation.rent_residential), false, y);
  y = row(page1, "Soll-Mietertrag Gewerbe p.a.", formatCHF(valuation.rent_commercial),  true,  y);

  const istW = propAny.rent_residential_actual;
  const istG = propAny.rent_commercial_actual;
  if (istW || istG) {
    y = row(page1, "Ist-Mietertrag Wohnen p.a.",  istW ? formatCHF(istW) : "= Soll", false, y);
    y = row(page1, "Ist-Mietertrag Gewerbe p.a.", istG ? formatCHF(istG) : "= Soll", true,  y);
  }

  y = row(page1, "Brutto-Sollertrag",       formatCHF(valuation.gross_income),     false, y);
  y = row(page1, "Effektiver Jahresertrag", formatCHF(valuation.effective_income),  true,  y);
  y = row(page1, "Leerstandsquote",         `${valuation.vacancy_rate} %`,          false, y);
  if (propAny.vacancy_avg5y > 0) y = row(page1, "Leerstand Ø 5 Jahre", `${propAny.vacancy_avg5y} %`, true, y);
  if (valuation.operating_costs > 0)   y = row(page1, "Betriebskosten p.a.",   formatCHF(valuation.operating_costs),   false, y);
  if (valuation.maintenance_costs > 0) y = row(page1, "Unterhaltskosten p.a.", formatCHF(valuation.maintenance_costs), true,  y);

  const aap = propAny.aap_count ?? 0;
  const ehp = propAny.ehp_count ?? 0;
  if (aap > 0 || ehp > 0) {
    y -= 3;
    page1.drawRectangle({ x: ML, y: y - 5, width: MR - ML, height: 14, color: rgb(0.93, 0.98, 0.93) });
    page1.drawText(`Parkplaetze: ${aap} AAP / ${ehp} EHP`, { x: ML + 6, y: y + 1, size: 8.5, font: norm, color: C.muted });
    page1.drawText(formatCHF(valuation.effective_income - valuation.rent_residential - valuation.rent_commercial), {
      x: MR - 4, y: y + 1, size: 8.5, font: bold, color: C.green,
    });
    y -= 14;
  }

  // ── Kap-Satz Herleitung ──
  y = section(page1, "3. KAPITALISIERUNGSSATZ-HERLEITUNG (IAZI-METHODIK)", y);

  const cb = valuation as any;
  const capRows = [
    ["Risikoloser Satz (Bundesobligationen)", formatPct(cb.base_cap_rate ? cb.base_cap_rate * 0.14 : 0.50)],
    ["Marktpraemie (" + getLageLabel((valuation.location_category as LocationCategory) ?? "durchschnitt") + ")", formatPct(cb.base_cap_rate ? cb.base_cap_rate * 0.86 : 3.40)],
    ["= Basis-Kap.-Satz", formatPct(cb.base_cap_rate ?? 0)],
    ["Makrolage-Korrektur", formatPct(0)],
    ["Gebaeudezustand", `${(cb.condition_delta ?? 0) >= 0 ? "+" : ""}${formatPct(cb.condition_delta ?? 0)}`],
    ["Gewerbeanteil", `+${formatPct(cb.commercial_surcharge ?? 0)}`],
    ["Mikrolage-Korrektur", `${(cb.micro_correction ?? 0) >= 0 ? "+" : ""}${formatPct(cb.micro_correction ?? 0)}`],
    ["OeV-Anbindung", `${(cb.oev_correction ?? 0) >= 0 ? "+" : ""}${formatPct(cb.oev_correction ?? 0)}`],
  ];

  capRows.forEach((r, i) => {
    const isBase = r[0].startsWith("=");
    if (isBase) {
      y -= 2;
      page1.drawRectangle({ x: ML, y: y - 5, width: MR - ML, height: 16, color: C.blueLight });
      page1.drawText(r[0], { x: ML + 6, y: y + 2, size: 8.5, font: bold, color: C.blueDark });
      page1.drawText(r[1], { x: MR - 4, y: y + 2, size: 8.5, font: bold, color: C.blue });
      y -= 18;
    } else {
      y = row(page1, r[0], r[1], i % 2 === 0, y);
    }
  });

  // Finaler Satz
  y -= 3;
  page1.drawRectangle({ x: ML, y: y - 6, width: MR - ML, height: 20, color: C.blue });
  page1.drawText("Finaler Kapitalisierungssatz", { x: ML + 6, y: y + 5, size: 9, font: bold, color: C.white });
  page1.drawText(formatPct(valuation.cap_rate), { x: MR - 4, y: y + 5, size: 11, font: bold, color: C.white });
  y -= 26;

  // ── Bewertungsergebnis ──
  y = section(page1, "4. BEWERTUNGSERGEBNIS", y);

  // Hauptwert
  page1.drawRectangle({ x: ML, y: y - 8, width: MR - ML, height: 38, color: C.blueLight });
  page1.drawRectangle({ x: ML, y: y - 8, width: 3, height: 38, color: C.blue });
  page1.drawText("Indikativer Marktwert (Ertragswert)", { x: ML + 10, y: y + 20, size: 8, font: bold, color: C.blueDark });
  page1.drawText(formatCHF(valuation.value_simple), { x: ML + 10, y: y + 5, size: 16, font: bold, color: C.blue });
  y -= 48;

  // Szenarien
  y -= 4;
  const bw = 0.30;
  [
    ["Konservativ  (+" + bw.toFixed(2) + "%)", formatCHF(valuation.value_conservative)],
    ["Neutral      (" + formatPct(valuation.cap_rate) + ")",  formatCHF(valuation.value_simple)],
    ["Optimistisch (-" + bw.toFixed(2) + "%)", formatCHF(valuation.value_optimistic)],
  ].forEach((r, i) => {
    y = row(page1, r[0], r[1], i % 2 === 0, y);
  });

  // Substanzwert
  y -= 4;
  page1.drawRectangle({ x: ML, y: y - 5, width: MR - ML, height: 14, color: rgb(0.94, 0.97, 0.94) });
  page1.drawText("Substanzwert (indikativ, ohne Landwert)", { x: ML + 6, y: y + 1, size: 8.5, font: norm, color: C.muted });
  page1.drawText(formatCHF((cb as any).substanz_value ?? 0), { x: MR - 4, y: y + 1, size: 8.5, font: bold, color: C.green });
  y -= 18;

  // Mietpotenzial
  const sollIstW = valuation.rent_residential - (istW || valuation.rent_residential);
  const sollIstG = valuation.rent_commercial  - (istG || valuation.rent_commercial);
  if (sollIstW > 500 || sollIstG > 500) {
    y -= 4;
    page1.drawRectangle({ x: ML, y: y - 8, width: MR - ML, height: 26, color: C.amberBg });
    page1.drawRectangle({ x: ML, y: y - 8, width: 3, height: 26, color: C.amber });
    page1.drawText("Mietpotenzial bei Neuvermietung", { x: ML + 10, y: y + 8, size: 9, font: bold, color: C.amber });
    const lines = [];
    if (sollIstW > 500) lines.push(`Wohnen: +${formatCHF(sollIstW)}/Jahr`);
    if (sollIstG > 500) lines.push(`Gewerbe: +${formatCHF(sollIstG)}/Jahr`);
    page1.drawText(lines.join("   "), { x: ML + 10, y: y - 2, size: 8, font: norm, color: C.amber, maxWidth: MR - ML - 20 });
    y -= 36;
  }

  // ── Seite 2: Sanierungsbedarf ──
  const renovItems = buildYear
    ? estimateRenovationNeeds(buildYear, renovYear ?? null, (valuation as any).properties?.living_area ?? 0, condition)
    : [];

  if (renovItems.length > 0) {
    const page2 = doc.addPage([W, 842]);
    drawHeader(page2);
    let y2 = 750;

    y2 = section(page2, "5. GESCHAETZTER SANIERUNGSBEDARF (NAECHSTE 10 JAHRE)", y2);
    y2 -= 4;
    page2.drawText("Indikative Schaetzung basierend auf Baujahr, Sanierungsjahr und Zustand (analog IAZI-Methodik)", {
      x: ML + 6, y: y2, size: 7.5, font: norm, color: C.muted, maxWidth: MR - ML - 12,
    });
    y2 -= 16;

    let totalMin = 0, totalMax = 0;
    renovItems.forEach((item, i) => {
      totalMin += item.costMin;
      totalMax += item.costMax;
      y2 = row(page2, item.element, `${formatCHF(item.costMin)} - ${formatCHF(item.costMax)}`, i % 2 === 0, y2);
    });

    y2 -= 4;
    page2.drawRectangle({ x: ML, y: y2 - 6, width: MR - ML, height: 20, color: C.redBg });
    page2.drawRectangle({ x: ML, y: y2 - 6, width: 3, height: 20, color: C.red });
    page2.drawText("Total Sanierungsbedarf (Bandbreite)", { x: ML + 10, y: y2 + 5, size: 9, font: bold, color: C.red });
    page2.drawText(`${formatCHF(totalMin)} - ${formatCHF(totalMax)}`, { x: MR - 4, y: y2 + 5, size: 9, font: bold, color: C.red });
    y2 -= 30;

    // Bereinigter Wert
    const renovMid = (totalMin + totalMax) / 2;
    y2 -= 4;
    page2.drawRectangle({ x: ML, y: y2 - 8, width: MR - ML, height: 38, color: C.blueLight });
    page2.drawRectangle({ x: ML, y: y2 - 8, width: 3, height: 38, color: C.blue });
    page2.drawText("Bereinigter Marktwert (nach Sanierungsabzug)", { x: ML + 10, y: y2 + 20, size: 8, font: bold, color: C.blueDark });
    page2.drawText(formatCHF(valuation.value_simple - renovMid), { x: ML + 10, y: y2 + 5, size: 16, font: bold, color: C.blue });
    y2 -= 50;

    // Footer Seite 2
    page2.drawText(`MFH Bewertung Schweiz  |  Erstellt: ${today}`, { x: ML, y: 20, size: 7, font: norm, color: C.muted });
    page2.drawText("Seite 2 / 2", { x: MR - 30, y: 20, size: 7, font: norm, color: C.muted });
  }

  // ── Disclaimer + Footer Seite 1 ──
  const disc = "Rechtlicher Hinweis: Indikative Schaetzung, ersetzt keine vollstaendige Verkehrswertschaetzung. Alle Angaben ohne Gewaehr.";
  const discLines = splitText(disc, 100);
  page1.drawRectangle({ x: ML, y: 35, width: MR - ML, height: discLines.length * 10 + 8, color: C.bg });
  discLines.forEach((line, i) => {
    page1.drawText(line, { x: ML + 6, y: 40 + (discLines.length - 1 - i) * 10, size: 7, font: norm, color: C.muted });
  });
  page1.drawText(`MFH Bewertung Schweiz  |  Erstellt: ${today}`, { x: ML, y: 20, size: 7, font: norm, color: C.muted });
  page1.drawText("Seite 1 / " + (renovItems.length > 0 ? "2" : "1"), { x: MR - 30, y: 20, size: 7, font: norm, color: C.muted });

  return doc.save();
}