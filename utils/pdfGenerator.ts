import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ValuationWithProperty, Profile } from "@/types";
import { formatCHF, formatPct, getLageLabel, getConditionLabel, buildScenarios, CONDITION_OPTIONS, QUALITY_OPTIONS, estimateRenovationNeeds, calcParkingIncome } from "@/lib/calculations";
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
  greenBg:   rgb(0.93, 0.98, 0.93),
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

  const W = 595, H = 842, ML = 40, MR = 555;
  const today = new Date().toLocaleDateString("de-CH");
  const prop = (valuation as any).properties ?? {};

  // ── Helper functions ───────────────────────────────────
  const drawHeader = (page: any) => {
    page.drawRectangle({ x: 0, y: 762, width: W, height: 80, color: C.blue });
    page.drawText("INDIKATIVER BEWERTUNGSBERICHT MFH", { x: ML, y: 822, size: 8, font: bold, color: rgb(0.7, 0.85, 1) });
    page.drawText("Mehrfamilienhaus Schweiz", { x: ML, y: 804, size: 16, font: bold, color: C.white });
    const addr = [prop.name, prop.address, `${prop.city ?? ""}, ${prop.canton ?? ""}`].filter(Boolean).join("  |  ");
    page.drawText(addr.slice(0, 80), { x: ML, y: 786, size: 8, font: norm, color: rgb(0.7, 0.85, 1) });
    const erstelltText = `Erstellt: ${today}`;
    const erstelltW = norm.widthOfTextAtSize(erstelltText, 8);
    page.drawText(erstelltText, { x: MR - erstelltW, y: 786, size: 8, font: norm, color: rgb(0.7, 0.85, 1) });
  };

  const drawFooter = (page: any, pageNum: number, totalPages: number) => {
    page.drawText(`MFH Bewertung Schweiz  |  Erstellt: ${today}`, { x: ML, y: 20, size: 7, font: norm, color: C.muted });
    const ft = `Seite ${pageNum} / ${totalPages}`;
    const fw = norm.widthOfTextAtSize(ft, 7);
    page.drawText(ft, { x: MR - fw, y: 20, size: 7, font: norm, color: C.muted });
  };

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
    page.drawText(label, { x: ML + 6, y: yPos + 1, size: 8.5, font: norm, color: C.muted, maxWidth: 260 });
    const valColor = highlight === "blue" ? C.blue : highlight === "green" ? C.green : highlight === "red" ? C.red : highlight === "amber" ? C.amber : C.text;
    const valWidth = bold.widthOfTextAtSize(value, 8.5);
    page.drawText(value, { x: MR - 6 - valWidth, y: yPos + 1, size: 8.5, font: bold, color: valColor });
    return yPos - 14;
  };

  const rightText = (page: any, text: string, yPos: number, size: number, font: any, color: any) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: MR - 6 - w, y: yPos, size, font, color });
  };

  // ── Extract property data ──────────────────────────────
  const buildYear = prop.build_year;
  const renovYear = prop.renov_year;
  const buildQuality = prop.build_quality ?? "gut";
  const condition = prop.condition ?? "stufe4";
  const numUnits = prop.num_units ?? 0;
  const livingArea = prop.living_area ?? 0;
  const commercialArea = prop.commercial_area ?? 0;
  const aap = (valuation as any).aap_count ?? 0;
  const ehp = (valuation as any).ehp_count ?? 0;
  const istW = (valuation as any).rent_residential_actual;
  const istG = (valuation as any).rent_commercial_actual;
  const vacancyAvg5y = (valuation as any).vacancy_avg5y ?? 0;
  const locationCategory = (valuation.location_category as LocationCategory) ?? "durchschnitt";

  // Wohnungsraster
  const ZIMMER_LABELS = ["1 Zi", "1.5 Zi", "2 Zi", "2.5 Zi", "3 Zi", "3.5 Zi", "4 Zi", "4.5 Zi", "5 Zi", "5+ Zi"];
  const ZIMMER_KEYS = ["units_1z","units_1_5z","units_2z","units_2_5z","units_3z","units_3_5z","units_4z","units_4_5z","units_5z","units_5plus"];
  const unitCounts = ZIMMER_KEYS.map(k => prop[k] ?? 0);
  const totalFromRaster = unitCounts.reduce((s: number, v: number) => s + v, 0);
  const hasRaster = totalFromRaster > 0;

  // Parkplatz-Ertrag
  const parkingIncome = calcParkingIncome(aap, ehp, locationCategory);

  // ── Seite 1 ─────────────────────────────────────────────
  const page1 = doc.addPage([W, H]);
  drawHeader(page1);
  let y = 750;

  // ── Makler ──
  if (profile?.full_name || profile?.company) {
    y = section(page1, "ERSTELLT DURCH", y);
    if (profile.full_name) y = row(page1, "Name",        profile.full_name, false, y);
    if (profile.company)   y = row(page1, "Unternehmen", profile.company,   true,  y);
    if (profile.phone)     y = row(page1, "Telefon",     profile.phone,     false, y);
  }

  // ── 1. Objekt ──
  y = section(page1, "1. OBJEKTUEBERSICHT", y);
  y = row(page1, "Bezeichnung", prop.name ?? "—", false, y);
  y = row(page1, "Adresse",     `${prop.address ?? ""}, ${prop.zip ?? ""} ${prop.city ?? ""}`, true, y);
  y = row(page1, "Kanton",      prop.canton ?? "—", false, y);

  if (buildYear) {
    const yearText = renovYear ? `${buildYear}  /  Sanierung ${renovYear}` : `${buildYear}`;
    y = row(page1, "Baujahr / Sanierung", yearText, true, y);
  }
  y = row(page1, "Zustand",      getConditionLabel(condition), false, y);
  y = row(page1, "Bauqualitaet", QUALITY_OPTIONS.find(o => o.value === buildQuality)?.label ?? buildQuality, true, y);

  if (numUnits > 0) y = row(page1, "Anzahl Wohnungen", `${numUnits}`, false, y);
  if (livingArea > 0 || commercialArea > 0) {
    const areaText = commercialArea > 0 ? `${livingArea} m2 Wohnen  /  ${commercialArea} m2 Gewerbe` : `${livingArea} m2`;
    y = row(page1, "Flaeche", areaText, true, y);
  }

  // Wohnungsraster (kompakt)
  if (hasRaster) {
    y -= 3;
    page1.drawRectangle({ x: ML, y: y - 5, width: MR - ML, height: 14, color: C.blueLight });
    page1.drawText("Wohnungsraster:", { x: ML + 6, y: y + 1, size: 8, font: bold, color: C.blueDark });
    const rasterParts: string[] = [];
    unitCounts.forEach((count: number, i: number) => {
      if (count > 0) rasterParts.push(`${count}x ${ZIMMER_LABELS[i]}`);
    });
    const rasterText = rasterParts.join("  |  ");
    const rasterW = norm.widthOfTextAtSize(rasterText, 8);
    page1.drawText(rasterText, { x: MR - 6 - rasterW, y: y + 1, size: 8, font: norm, color: C.blueDark });
    y -= 14;
  }

  y = row(page1, "Erfasst am", new Date(valuation.created_at).toLocaleDateString("de-CH"), false, y);

  // ── 2. Ertragsdaten ──
  y = section(page1, "2. ERTRAGSDATEN", y);

  // Soll-Ertraege
  y = row(page1, "Soll-Mietertrag Wohnen p.a.",  formatCHF(valuation.rent_residential), false, y);
  if (valuation.rent_commercial > 0) {
    y = row(page1, "Soll-Mietertrag Gewerbe p.a.", formatCHF(valuation.rent_commercial), true, y);
  }

  // Ist-Ertraege (wenn vorhanden)
  if (istW || istG) {
    y = row(page1, "Ist-Mietertrag Wohnen p.a.",  istW ? formatCHF(istW) : "= Soll", false, y);
    if (valuation.rent_commercial > 0 || istG) {
      y = row(page1, "Ist-Mietertrag Gewerbe p.a.", istG ? formatCHF(istG) : "= Soll", true, y);
    }
  }

  // Parkplaetze
  if (aap > 0 || ehp > 0) {
    y = row(page1, `Parkplaetze (${aap} AAP / ${ehp} EHP)`, formatCHF(parkingIncome) + " /Jahr", false, y, "green");
  }

  // Zusammenfassung Ertraege
  y -= 2;
  page1.drawRectangle({ x: ML, y: y - 5, width: MR - ML, height: 14, color: C.blueLight });
  page1.drawText("Brutto-Sollertrag", { x: ML + 6, y: y + 1, size: 8.5, font: bold, color: C.blueDark });
  rightText(page1, formatCHF(valuation.gross_income), y + 1, 8.5, bold, C.blue);
  y -= 16;

  y = row(page1, "Effektiver Jahresertrag", formatCHF(valuation.effective_income), false, y, "blue");

  // Leerstand
  y = row(page1, "Leerstandsquote aktuell", `${valuation.vacancy_rate} %`, true, y);
  if (vacancyAvg5y > 0) y = row(page1, "Leerstand Ø 5 Jahre", `${vacancyAvg5y} %`, false, y);

  // Kosten
  y = row(page1, "Betriebskosten p.a.",   formatCHF(valuation.operating_costs),   true, y);
  y = row(page1, "Unterhaltskosten p.a.", formatCHF(valuation.maintenance_costs), false, y);

  // Netto-Ertrag
  if (valuation.net_income && valuation.net_income > 0) {
    y -= 2;
    page1.drawRectangle({ x: ML, y: y - 5, width: MR - ML, height: 14, color: C.blueLight });
    page1.drawText("Netto-Ertrag", { x: ML + 6, y: y + 1, size: 8.5, font: bold, color: C.blueDark });
    rightText(page1, formatCHF(valuation.net_income), y + 1, 8.5, bold, C.blue);
    y -= 16;
  }

  // Mietpotenzial
  const sollIstW = valuation.rent_residential - (istW || valuation.rent_residential);
  const sollIstG = valuation.rent_commercial  - (istG || valuation.rent_commercial);
  if (sollIstW > 500 || sollIstG > 500) {
    y -= 3;
    page1.drawRectangle({ x: ML, y: y - 6, width: MR - ML, height: 22, color: C.amberBg });
    page1.drawRectangle({ x: ML, y: y - 6, width: 3, height: 22, color: C.amber });
    page1.drawText("Mietpotenzial bei Neuvermietung:", { x: ML + 10, y: y + 5, size: 8, font: bold, color: C.amber });
    const potParts: string[] = [];
    if (sollIstW > 500) potParts.push(`Wohnen +${formatCHF(sollIstW)}`);
    if (sollIstG > 500) potParts.push(`Gewerbe +${formatCHF(sollIstG)}`);
    const potText = potParts.join("  /  ");
    const potW = bold.widthOfTextAtSize(potText, 8);
    page1.drawText(potText, { x: MR - 6 - potW, y: y + 5, size: 8, font: bold, color: C.amber });
    y -= 28;
  }

  // ── 3. Kap-Satz Herleitung ──
  y = section(page1, "3. KAPITALISIERUNGSSATZ-HERLEITUNG (IAZI-METHODIK)", y);

  const cb = valuation as any;
  const capRows = [
    ["Risikoloser Satz (Bundesobligationen)", formatPct(cb.base_cap_rate ? cb.base_cap_rate * 0.14 : 0.50)],
    ["Marktpraemie (" + getLageLabel(locationCategory) + ")", formatPct(cb.base_cap_rate ? cb.base_cap_rate * 0.86 : 3.40)],
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
      rightText(page1, r[1], y + 2, 8.5, bold, C.blue);
      y -= 18;
    } else {
      y = row(page1, r[0], r[1], i % 2 === 0, y);
    }
  });

  // Finaler Satz
  y -= 3;
  const finalCapText = formatPct(valuation.cap_rate);
  const finalCapW = bold.widthOfTextAtSize(finalCapText, 11);
  page1.drawRectangle({ x: ML, y: y - 6, width: MR - ML, height: 20, color: C.blue });
  page1.drawText("Finaler Kapitalisierungssatz", { x: ML + 6, y: y + 5, size: 9, font: bold, color: C.white });
  page1.drawText(finalCapText, { x: MR - 6 - finalCapW, y: y + 5, size: 11, font: bold, color: C.white });
  y -= 26;

  // ── 4. Bewertungsergebnis ──
  y = section(page1, "4. BEWERTUNGSERGEBNIS", y);

  // Hauptwert
  page1.drawRectangle({ x: ML, y: y - 8, width: MR - ML, height: 38, color: C.blueLight });
  page1.drawRectangle({ x: ML, y: y - 8, width: 3, height: 38, color: C.blue });
  page1.drawText("Indikativer Marktwert (Ertragswert)", { x: ML + 10, y: y + 20, size: 8, font: bold, color: C.blueDark });
  page1.drawText(formatCHF(valuation.value_simple), { x: ML + 10, y: y + 5, size: 16, font: bold, color: C.blue });

  // Preis pro m2 (rechts im Hauptwert-Block)
  if (livingArea > 0) {
    const priceM2 = Math.round(valuation.value_simple / (livingArea + commercialArea));
    const m2Text = `${formatCHF(priceM2)} / m2`;
    rightText(page1, m2Text, y + 5, 9, bold, C.blueDark);
  }
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
  const totalArea = livingArea + commercialArea;
  const ageForSubstanz = buildYear ? new Date().getFullYear() - (renovYear ?? buildYear) : 30;
  const depreciationRate = Math.min(ageForSubstanz * 0.01, 0.50);
  const substanzValue = totalArea > 0 ? totalArea * 2800 * (1 - depreciationRate) : 0;
  if (substanzValue > 0) {
    const substanzText = formatCHF(substanzValue);
    page1.drawRectangle({ x: ML, y: y - 5, width: MR - ML, height: 14, color: C.greenBg });
    page1.drawText("Substanzwert (indikativ, ohne Landwert)", { x: ML + 6, y: y + 1, size: 8.5, font: norm, color: C.muted });
    rightText(page1, substanzText, y + 1, 8.5, bold, C.green);
    y -= 18;
  }

  // ── Disclaimer + Footer Seite 1 ──
  const disc = "Rechtlicher Hinweis: Indikative Schaetzung, ersetzt keine vollstaendige Verkehrswertschaetzung. Alle Angaben ohne Gewaehr.";
  const discLines = splitText(disc, 100);
  page1.drawRectangle({ x: ML, y: 35, width: MR - ML, height: discLines.length * 10 + 8, color: C.bg });
  discLines.forEach((line, i) => {
    page1.drawText(line, { x: ML + 6, y: 40 + (discLines.length - 1 - i) * 10, size: 7, font: norm, color: C.muted });
  });

  // ── Seite 2: Sanierungsbedarf + Notizen ──
  const renovItems = buildYear
    ? estimateRenovationNeeds(buildYear, renovYear ?? null, livingArea, condition)
    : [];
  const hasNotes = !!valuation.notes;
  const needsPage2 = renovItems.length > 0 || hasNotes;
  const totalPages = needsPage2 ? 2 : 1;

  drawFooter(page1, 1, totalPages);

  if (needsPage2) {
    const page2 = doc.addPage([W, H]);
    drawHeader(page2);
    let y2 = 750;

    // Sanierungsbedarf
    if (renovItems.length > 0) {
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
      const renovTotalText = `${formatCHF(totalMin)} - ${formatCHF(totalMax)}`;
      page2.drawRectangle({ x: ML, y: y2 - 6, width: MR - ML, height: 20, color: C.redBg });
      page2.drawRectangle({ x: ML, y: y2 - 6, width: 3, height: 20, color: C.red });
      page2.drawText("Total Sanierungsbedarf (Bandbreite)", { x: ML + 10, y: y2 + 5, size: 9, font: bold, color: C.red });
      rightText(page2, renovTotalText, y2 + 5, 9, bold, C.red);
      y2 -= 30;

      // Bereinigter Wert
      const renovMid = (totalMin + totalMax) / 2;
      y2 -= 4;
      page2.drawRectangle({ x: ML, y: y2 - 8, width: MR - ML, height: 38, color: C.blueLight });
      page2.drawRectangle({ x: ML, y: y2 - 8, width: 3, height: 38, color: C.blue });
      page2.drawText("Bereinigter Marktwert (nach Sanierungsabzug)", { x: ML + 10, y: y2 + 20, size: 8, font: bold, color: C.blueDark });
      page2.drawText(formatCHF(valuation.value_simple - renovMid), { x: ML + 10, y: y2 + 5, size: 16, font: bold, color: C.blue });
      y2 -= 50;
    }

    // Notizen / Bemerkungen
    if (hasNotes) {
      y2 = section(page2, "6. NOTIZEN / BEMERKUNGEN", y2);
      y2 -= 4;
      const noteLines = splitText(valuation.notes!, 90);
      noteLines.forEach(line => {
        if (y2 < 60) return;
        page2.drawText(line, { x: ML + 6, y: y2, size: 8.5, font: norm, color: C.text, maxWidth: MR - ML - 12 });
        y2 -= 12;
      });
    }

    drawFooter(page2, 2, totalPages);
  }

  return doc.save();
}
