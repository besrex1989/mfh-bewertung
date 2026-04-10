import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ValuationWithProperty, Profile } from "@/types";
import { formatCHF, formatPct, getLageLabel, getConditionLabel, CONDITION_OPTIONS, QUALITY_OPTIONS, estimateRenovationNeeds, calcParkingIncome } from "@/lib/calculations";
import type { LocationCategory } from "@/types";

// ── Clean RA-Style Colors ───────────────────────────────────
const C = {
  white:    rgb(1, 1, 1),
  bg:       rgb(0.975, 0.975, 0.98),
  text:     rgb(0.15, 0.15, 0.15),
  muted:    rgb(0.45, 0.45, 0.50),
  light:    rgb(0.70, 0.70, 0.72),
  line:     rgb(0.85, 0.85, 0.87),
  accent:   rgb(0.15, 0.40, 0.85),
  accentBg: rgb(0.94, 0.96, 1.0),
  green:    rgb(0.10, 0.55, 0.25),
  greenBg:  rgb(0.93, 0.97, 0.93),
  red:      rgb(0.75, 0.15, 0.15),
  redBg:    rgb(1.0, 0.95, 0.95),
  amber:    rgb(0.80, 0.55, 0.10),
  amberBg:  rgb(1.0, 0.97, 0.90),
  dark:     rgb(0.20, 0.22, 0.28),
};

function splitText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = w;
    } else {
      current = (current + " " + w).trim();
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

  const W = 595, H = 842, ML = 50, MR = 545;
  const CW = MR - ML; // content width
  const today = new Date().toLocaleDateString("de-CH");
  const prop = (valuation as any).properties ?? {};

  // ── Data extraction ────────────────────────────────────
  const buildYear = prop.build_year;
  const renovYear = prop.renov_year;
  const buildQuality = prop.build_quality ?? "gut";
  const condition = prop.condition ?? "stufe4";
  const numUnits = prop.num_units ?? 0;
  const livingArea = prop.living_area ?? 0;
  const commercialArea = prop.commercial_area ?? 0;
  const totalArea = livingArea + commercialArea;
  const aap = (valuation as any).aap_count ?? 0;
  const ehp = (valuation as any).ehp_count ?? 0;
  const istW = (valuation as any).rent_residential_actual;
  const istG = (valuation as any).rent_commercial_actual;
  const vacancyAvg5y = (valuation as any).vacancy_avg5y ?? 0;
  const locationCategory = (valuation.location_category as LocationCategory) ?? "durchschnitt";
  const parkingIncome = calcParkingIncome(aap, ehp, locationCategory);
  const pros = (valuation as any).pros;
  const cons = (valuation as any).cons;
  const cb = valuation as any;

  // Wohnungsraster
  const ZL = ["1 Zi","1.5 Zi","2 Zi","2.5 Zi","3 Zi","3.5 Zi","4 Zi","4.5 Zi","5 Zi","5+ Zi"];
  const ZK = ["units_1z","units_1_5z","units_2z","units_2_5z","units_3z","units_3_5z","units_4z","units_4_5z","units_5z","units_5plus"];
  const unitCounts = ZK.map(k => prop[k] ?? 0);
  const totalFromRaster = unitCounts.reduce((s: number, v: number) => s + v, 0);

  // Substanzwert
  const ageForSub = buildYear ? new Date().getFullYear() - (renovYear ?? buildYear) : 30;
  const depr = Math.min(ageForSub * 0.01, 0.50);
  const substanzValue = totalArea > 0 ? totalArea * 2800 * (1 - depr) : 0;

  // Sanierung
  const renovItems = buildYear ? estimateRenovationNeeds(buildYear, renovYear ?? null, livingArea, condition) : [];

  // Pages count
  const needsPage3 = renovItems.length > 0 || !!valuation.notes;
  const totalPages = needsPage3 ? 3 : 2;

  // ── Helper: right-align text ───────────────────────────
  const rText = (pg: any, t: string, y: number, sz: number, f: any, c: any) => {
    pg.drawText(t, { x: MR - f.widthOfTextAtSize(t, sz), y, size: sz, font: f, color: c });
  };

  // ── Helper: section title (RA style: bold + underline) ─
  const sectionTitle = (pg: any, title: string, y: number): number => {
    y -= 14;
    pg.drawText(title, { x: ML, y, size: 12, font: bold, color: C.dark });
    y -= 5;
    pg.drawLine({ start: { x: ML, y }, end: { x: MR, y }, thickness: 0.5, color: C.line });
    return y - 10;
  };

  // ── Helper: data row (RA style: label left, value right, thin line) ─
  const dataRow = (pg: any, label: string, value: string, y: number, opts?: { bold?: boolean; color?: any; indent?: number }): number => {
    if (y < 50) return y;
    const x = ML + (opts?.indent ?? 0);
    pg.drawText(label, { x, y, size: 9, font: norm, color: C.muted });
    const valFont = opts?.bold ? bold : bold;
    const valColor = opts?.color ?? C.text;
    rText(pg, value, y, 9, valFont, valColor);
    y -= 4;
    pg.drawLine({ start: { x: ML, y }, end: { x: MR, y }, thickness: 0.3, color: rgb(0.92, 0.92, 0.93) });
    return y - 10;
  };

  // ── Helper: footer ─────────────────────────────────────
  const drawFooter = (pg: any, pn: number) => {
    pg.drawLine({ start: { x: ML, y: 40 }, end: { x: MR, y: 40 }, thickness: 0.3, color: C.line });
    pg.drawText("Indikative Schaetzung · Ersetzt keine vollstaendige Verkehrswertschaetzung · Alle Angaben ohne Gewaehr", {
      x: ML, y: 28, size: 6.5, font: norm, color: C.light,
    });
    pg.drawText(`MFH Bewertung Schweiz`, { x: ML, y: 16, size: 7, font: norm, color: C.muted });
    const ft = `Seite ${pn} / ${totalPages}`;
    rText(pg, ft, 16, 7, norm, C.muted);
  };

  // ════════════════════════════════════════════════════════
  // SEITE 1: Deckblatt + Immobiliendetails + Ertragsdaten
  // ════════════════════════════════════════════════════════
  const p1 = doc.addPage([W, H]);
  let y = H - 50;

  // ── Titel-Bereich (clean, kein grosser farbiger Header) ──
  p1.drawText("Indikative Bewertung MFH", { x: ML, y, size: 10, font: bold, color: C.accent });
  y -= 22;
  p1.drawText(prop.name ?? "Mehrfamilienhaus", { x: ML, y, size: 22, font: bold, color: C.dark });
  y -= 18;
  p1.drawText(`${prop.address ?? ""}, ${prop.zip ?? ""} ${prop.city ?? ""}`, { x: ML, y, size: 11, font: norm, color: C.muted });
  rText(p1, `Erstellt: ${today}`, y, 9, norm, C.muted);
  y -= 8;
  p1.drawLine({ start: { x: ML, y }, end: { x: MR, y }, thickness: 1, color: C.accent });
  y -= 6;

  // Agent info (compact, right side)
  if (profile?.full_name || profile?.company) {
    const agentLine = [profile.full_name, profile.company, profile.phone].filter(Boolean).join("  ·  ");
    rText(p1, agentLine, y, 8, norm, C.muted);
    y -= 16;
  }

  // ── Immobiliendetails ──
  y = sectionTitle(p1, "Immobiliendetails", y);

  // Zwei-Spalten Layout
  const colL = ML;
  const colR = ML + CW / 2 + 10;
  const colW = CW / 2 - 10;
  let yL = y;
  let yR = y;

  // Linke Spalte: Gebaeude
  p1.drawText("Gebaeude", { x: colL, y: yL, size: 8, font: bold, color: C.accent });
  yL -= 14;
  const leftRows: [string, string][] = [
    ["Adresse", `${prop.address ?? ""}`],
    ["Ort", `${prop.zip ?? ""} ${prop.city ?? ""}`],
    ["Kanton", prop.canton ?? "—"],
    ["Baujahr", buildYear ? `${buildYear}` : "—"],
    ["Renovationsjahr", renovYear ? `${renovYear}` : "—"],
    ["Zustand", getConditionLabel(condition)],
    ["Bauqualitaet", QUALITY_OPTIONS.find(o => o.value === buildQuality)?.label ?? buildQuality],
    ["Anzahl Wohnungen", numUnits > 0 ? `${numUnits}` : "—"],
  ];
  leftRows.forEach(([l, v]) => {
    p1.drawText(l, { x: colL, y: yL, size: 8.5, font: norm, color: C.muted });
    const vw = bold.widthOfTextAtSize(v, 8.5);
    p1.drawText(v, { x: colL + colW - vw, y: yL, size: 8.5, font: bold, color: C.text });
    yL -= 13;
  });

  // Rechte Spalte: Flaechen & Parkplaetze
  p1.drawText("Flaechen & Parkplaetze", { x: colR, y: yR, size: 8, font: bold, color: C.accent });
  yR -= 14;
  const rightRows: [string, string][] = [
    ["Wohnflaeche", livingArea > 0 ? `${livingArea} m2` : "—"],
    ["Gewerbeflaeche", commercialArea > 0 ? `${commercialArea} m2` : "—"],
    ["Gesamtflaeche", totalArea > 0 ? `${totalArea} m2` : "—"],
    ["Innenparkplaetze (EHP)", ehp > 0 ? `${ehp}` : "—"],
    ["Aussenparkplaetze (AAP)", aap > 0 ? `${aap}` : "—"],
  ];
  rightRows.forEach(([l, v]) => {
    p1.drawText(l, { x: colR, y: yR, size: 8.5, font: norm, color: C.muted });
    const vw = bold.widthOfTextAtSize(v, 8.5);
    p1.drawText(v, { x: colR + colW - vw, y: yR, size: 8.5, font: bold, color: C.text });
    yR -= 13;
  });

  // Wohnungsraster
  if (totalFromRaster > 0) {
    yR -= 6;
    p1.drawText("Wohnungsmix", { x: colR, y: yR, size: 8, font: bold, color: C.accent });
    yR -= 14;
    unitCounts.forEach((cnt: number, i: number) => {
      if (cnt > 0) {
        p1.drawText(ZL[i], { x: colR, y: yR, size: 8.5, font: norm, color: C.muted });
        const cntText = `${cnt}`;
        const cntW = bold.widthOfTextAtSize(cntText, 8.5);
        p1.drawText(cntText, { x: colR + colW - cntW, y: yR, size: 8.5, font: bold, color: C.text });
        yR -= 13;
      }
    });
  }

  y = Math.min(yL, yR) - 10;
  p1.drawLine({ start: { x: ML, y }, end: { x: MR, y }, thickness: 0.3, color: C.line });
  y -= 10;

  // ── Ertragsdaten ──
  y = sectionTitle(p1, "Ertragsdaten", y);

  y = dataRow(p1, "Soll-Mietertrag Wohnen p.a.", formatCHF(valuation.rent_residential), y);
  if (valuation.rent_commercial > 0) {
    y = dataRow(p1, "Soll-Mietertrag Gewerbe p.a.", formatCHF(valuation.rent_commercial), y);
  }
  if (istW || istG) {
    y = dataRow(p1, "Ist-Mietertrag Wohnen p.a.", istW ? formatCHF(istW) : "= Soll", y);
    if (istG) y = dataRow(p1, "Ist-Mietertrag Gewerbe p.a.", formatCHF(istG), y);
  }
  if (parkingIncome > 0) {
    y = dataRow(p1, `Parkplatz-Ertrag p.a. (${aap} AAP / ${ehp} EHP)`, formatCHF(parkingIncome), y, { color: C.green });
  }
  y = dataRow(p1, "Brutto-Sollertrag", formatCHF(valuation.gross_income), y, { bold: true, color: C.accent });
  y = dataRow(p1, "Effektiver Jahresertrag", formatCHF(valuation.effective_income), y, { bold: true, color: C.accent });
  y = dataRow(p1, "Leerstandsquote", `${valuation.vacancy_rate} %`, y);
  if (vacancyAvg5y > 0) y = dataRow(p1, "Leerstand Ø 5 Jahre", `${vacancyAvg5y} %`, y);
  y = dataRow(p1, "Betriebskosten p.a.", formatCHF(valuation.operating_costs), y);
  y = dataRow(p1, "Unterhaltskosten p.a.", formatCHF(valuation.maintenance_costs), y);

  // Mietpotenzial
  const diffW = valuation.rent_residential - (istW || valuation.rent_residential);
  const diffG = valuation.rent_commercial - (istG || valuation.rent_commercial);
  if (diffW > 500 || diffG > 500) {
    y -= 6;
    p1.drawRectangle({ x: ML, y: y - 4, width: CW, height: 18, color: C.amberBg });
    const potParts: string[] = [];
    if (diffW > 500) potParts.push(`Wohnen +${formatCHF(diffW)}`);
    if (diffG > 500) potParts.push(`Gewerbe +${formatCHF(diffG)}`);
    p1.drawText(`Mietpotenzial bei Neuvermietung: ${potParts.join(" / ")}`, {
      x: ML + 6, y: y + 2, size: 8, font: bold, color: C.amber,
    });
    y -= 24;
  }

  drawFooter(p1, 1);

  // ════════════════════════════════════════════════════════
  // SEITE 2: Kapitalisierungssatz + Bewertungsergebnis
  // ════════════════════════════════════════════════════════
  const p2 = doc.addPage([W, H]);
  let y2 = H - 50;

  // Titel
  p2.drawText(prop.name ?? "Bewertung", { x: ML, y: y2, size: 14, font: bold, color: C.dark });
  y2 -= 8;
  p2.drawLine({ start: { x: ML, y: y2 }, end: { x: MR, y: y2 }, thickness: 0.5, color: C.accent });
  y2 -= 14;

  // ── Kapitalisierungssatz-Herleitung ──
  y2 = sectionTitle(p2, "Kapitalisierungssatz-Herleitung (IAZI-Methodik)", y2);

  y2 = dataRow(p2, "Risikoloser Satz (Bundesobligationen)", formatPct(cb.base_cap_rate ? cb.base_cap_rate * 0.14 : 0.50), y2);
  y2 = dataRow(p2, `Marktpraemie (${getLageLabel(locationCategory)})`, formatPct(cb.base_cap_rate ? cb.base_cap_rate * 0.86 : 3.40), y2);

  // Basis hervorgehoben
  y2 -= 2;
  p2.drawRectangle({ x: ML, y: y2 - 3, width: CW, height: 15, color: C.accentBg });
  p2.drawText("= Basis-Kapitalisierungssatz", { x: ML + 4, y: y2 + 1, size: 9, font: bold, color: C.accent });
  rText(p2, formatPct(cb.base_cap_rate ?? 0), y2 + 1, 9, bold, C.accent);
  y2 -= 18;

  y2 = dataRow(p2, "Makrolage-Korrektur", formatPct(0), y2);
  y2 = dataRow(p2, "Gebaeudezustand", `${(cb.condition_delta ?? 0) >= 0 ? "+" : ""}${formatPct(cb.condition_delta ?? 0)}`, y2);
  y2 = dataRow(p2, "Gewerbeanteil", `+${formatPct(cb.commercial_surcharge ?? 0)}`, y2);
  y2 = dataRow(p2, "Mikrolage-Korrektur", `${(cb.micro_correction ?? 0) >= 0 ? "+" : ""}${formatPct(cb.micro_correction ?? 0)}`, y2);
  y2 = dataRow(p2, "OeV-Anbindung", `${(cb.oev_correction ?? 0) >= 0 ? "+" : ""}${formatPct(cb.oev_correction ?? 0)}`, y2);

  // Finaler Satz
  y2 -= 4;
  p2.drawRectangle({ x: ML, y: y2 - 6, width: CW, height: 22, color: C.dark });
  p2.drawText("Finaler Kapitalisierungssatz", { x: ML + 8, y: y2 + 3, size: 10, font: bold, color: C.white });
  const fcText = formatPct(valuation.cap_rate);
  rText(p2, fcText, y2 + 3, 12, bold, C.white);
  y2 -= 34;

  // ── Bewertungsergebnis ──
  y2 = sectionTitle(p2, "Bewertungsergebnis", y2);

  // Hauptwert - grosser Block
  y2 -= 4;
  p2.drawRectangle({ x: ML, y: y2 - 10, width: CW, height: 50, color: C.accentBg });
  p2.drawRectangle({ x: ML, y: y2 - 10, width: 4, height: 50, color: C.accent });
  p2.drawText("Indikativer Marktwert (Ertragswert)", { x: ML + 14, y: y2 + 28, size: 9, font: norm, color: C.accent });
  p2.drawText(formatCHF(valuation.value_simple), { x: ML + 14, y: y2 + 8, size: 20, font: bold, color: C.accent });
  if (totalArea > 0) {
    const m2 = Math.round(valuation.value_simple / totalArea);
    rText(p2, `${formatCHF(m2)} / m2`, y2 + 8, 10, bold, C.dark);
  }
  y2 -= 60;

  // Szenario-Balken
  const bw = 0.30;
  const vMin = valuation.value_conservative;
  const vMax = valuation.value_optimistic;
  const vRange = vMax - vMin;
  const bL = ML + 60, bR = MR - 60, bW = bR - bL;

  p2.drawText("Konservativ", { x: ML, y: y2 + 2, size: 7, font: norm, color: C.muted });
  rText(p2, "Optimistisch", y2 + 2, 7, norm, C.muted);

  y2 -= 4;
  // Balken-Hintergrund
  p2.drawRectangle({ x: bL, y: y2, width: bW, height: 8, color: rgb(0.92, 0.94, 0.96) });
  // Farbbalken von konservativ bis optimistisch
  p2.drawRectangle({ x: bL, y: y2, width: bW, height: 8, color: rgb(0.82, 0.88, 0.98) });

  // Marker
  if (vRange > 0) {
    [
      { v: vMin, c: C.muted, label: formatCHF(vMin) },
      { v: valuation.value_simple, c: C.accent, label: formatCHF(valuation.value_simple) },
      { v: vMax, c: C.green, label: formatCHF(vMax) },
    ].forEach(m => {
      const xp = bL + ((m.v - vMin) / vRange) * bW;
      p2.drawRectangle({ x: xp - 3, y: y2 - 2, width: 6, height: 12, color: m.c });
    });
  }
  y2 -= 18;

  // Szenario-Zeilen
  const scenRows: [string, string][] = [
    [`Konservativ  (+${bw.toFixed(2)} %)`, formatCHF(valuation.value_conservative)],
    [`Neutral  (${formatPct(valuation.cap_rate)})`, formatCHF(valuation.value_simple)],
    [`Optimistisch  (-${bw.toFixed(2)} %)`, formatCHF(valuation.value_optimistic)],
  ];
  scenRows.forEach(([l, v]) => { y2 = dataRow(p2, l, v, y2); });

  // Substanzwert
  if (substanzValue > 0) {
    y2 -= 6;
    y2 = sectionTitle(p2, "Substanzwertmethode", y2);
    y2 = dataRow(p2, "Baukosten", `${totalArea} m2 x CHF 2'800`, y2);
    y2 = dataRow(p2, `Abschreibung (${ageForSub} Jahre x 1% = ${Math.round(depr * 100)}%)`, formatCHF(-totalArea * 2800 * depr), y2, { color: C.red });
    y2 = dataRow(p2, "Geschaetzter Substanzwert", formatCHF(substanzValue), y2, { bold: true, color: C.green });
  }

  // Wertfaktoren
  if (pros || cons) {
    y2 -= 6;
    if (pros) {
      p2.drawText("Wertsteigernde Faktoren", { x: ML, y: y2, size: 9, font: bold, color: C.green });
      y2 -= 12;
      splitText(pros, 85).forEach(line => {
        if (y2 < 50) return;
        p2.drawText("+ " + line, { x: ML + 8, y: y2, size: 8.5, font: norm, color: C.green });
        y2 -= 11;
      });
      y2 -= 4;
    }
    if (cons) {
      p2.drawText("Wertmindernde Faktoren", { x: ML, y: y2, size: 9, font: bold, color: C.red });
      y2 -= 12;
      splitText(cons, 85).forEach(line => {
        if (y2 < 50) return;
        p2.drawText("- " + line, { x: ML + 8, y: y2, size: 8.5, font: norm, color: C.red });
        y2 -= 11;
      });
    }
  }

  drawFooter(p2, 2);

  // ════════════════════════════════════════════════════════
  // SEITE 3: Sanierungsbedarf + Notizen (optional)
  // ════════════════════════════════════════════════════════
  if (needsPage3) {
    const p3 = doc.addPage([W, H]);
    let y3 = H - 50;

    p3.drawText(prop.name ?? "Bewertung", { x: ML, y: y3, size: 14, font: bold, color: C.dark });
    y3 -= 8;
    p3.drawLine({ start: { x: ML, y: y3 }, end: { x: MR, y: y3 }, thickness: 0.5, color: C.accent });
    y3 -= 14;

    if (renovItems.length > 0) {
      y3 = sectionTitle(p3, "Geschaetzter Sanierungsbedarf (naechste 10 Jahre)", y3);
      p3.drawText("Indikative Schaetzung basierend auf Baujahr, Sanierungsjahr und Zustand (analog IAZI-Methodik)", {
        x: ML, y: y3, size: 7.5, font: norm, color: C.light,
      });
      y3 -= 14;

      let totMin = 0, totMax = 0;
      renovItems.forEach(item => {
        totMin += item.costMin;
        totMax += item.costMax;
        y3 = dataRow(p3, item.element, `${formatCHF(item.costMin)} – ${formatCHF(item.costMax)}`, y3);
      });

      // Total
      y3 -= 4;
      p3.drawRectangle({ x: ML, y: y3 - 4, width: CW, height: 18, color: C.redBg });
      p3.drawText("Total Sanierungsbedarf (Bandbreite)", { x: ML + 6, y: y3 + 2, size: 9, font: bold, color: C.red });
      rText(p3, `${formatCHF(totMin)} – ${formatCHF(totMax)}`, y3 + 2, 9, bold, C.red);
      y3 -= 28;

      // Bereinigter Wert
      const rMid = (totMin + totMax) / 2;
      y3 -= 4;
      p3.drawRectangle({ x: ML, y: y3 - 10, width: CW, height: 40, color: C.accentBg });
      p3.drawRectangle({ x: ML, y: y3 - 10, width: 4, height: 40, color: C.accent });
      p3.drawText("Bereinigter Marktwert (nach Sanierungsabzug)", { x: ML + 14, y: y3 + 18, size: 8, font: norm, color: C.accent });
      p3.drawText(formatCHF(valuation.value_simple - rMid), { x: ML + 14, y: y3 + 2, size: 16, font: bold, color: C.accent });
      y3 -= 54;
    }

    if (valuation.notes) {
      y3 = sectionTitle(p3, "Notizen / Bemerkungen", y3);
      splitText(valuation.notes, 90).forEach(line => {
        if (y3 < 50) return;
        p3.drawText(line, { x: ML, y: y3, size: 9, font: norm, color: C.text });
        y3 -= 13;
      });
    }

    drawFooter(p3, 3);
  }

  return doc.save();
}
