// ============================================================
// MFH Bewertung – PDF Generator (server-side, pdf-lib)
// ============================================================

import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import type { ValuationWithProperty, Profile } from "@/types";
import { formatCHF, formatPct, getLageLabel, getConditionLabel, buildScenarios } from "@/lib/calculations";
import type { LocationCategory, ConditionType } from "@/types";

// ── Farben ─────────────────────────────────────────────────
const C = {
  bg:     rgb(0.043, 0.059, 0.051),   // #0b0f0d
  dark:   rgb(0.067, 0.102, 0.078),   // #111812
  gold:   rgb(0.784, 0.659, 0.294),   // #c8a84b
  white:  rgb(0.957, 0.969, 0.961),   // #f4f7f5
  gray:   rgb(0.478, 0.573, 0.510),   // #7a9282
  light:  rgb(0.784, 0.867, 0.804),   // #c8dece
  green:  rgb(0.176, 0.290, 0.184),   // #2d4a2f
};

interface PDFContext {
  doc:    PDFDocument;
  page:   PDFPage;
  bold:   PDFFont;
  normal: PDFFont;
  y:      number;
  W:      number;
  H:      number;
  ML:     number; // margin left
  MR:     number; // margin right
}

function addPage(doc: PDFDocument, bold: PDFFont, normal: PDFFont): PDFContext {
  const page = doc.addPage([595, 842]); // A4
  const { width: W, height: H } = page.getSize();
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.bg });
  return { doc, page, bold, normal, y: H - 40, W, H, ML: 40, MR: W - 40 };
}

function checkNewPage(ctx: PDFContext, needed = 40): PDFContext {
  if (ctx.y < needed + 40) {
    const newCtx = addPage(ctx.doc, ctx.bold, ctx.normal);
    return newCtx;
  }
  return ctx;
}

function drawSectionHeader(ctx: PDFContext, title: string): PDFContext {
  ctx = checkNewPage(ctx, 30);
  ctx.page.drawRectangle({ x: ctx.ML, y: ctx.y - 20, width: ctx.MR - ctx.ML, height: 22, color: C.green });
  ctx.page.drawText(title.toUpperCase(), {
    x: ctx.ML + 8, y: ctx.y - 13,
    size: 9, font: ctx.bold, color: C.gold,
  });
  ctx.y -= 30;
  return ctx;
}

function drawRow(ctx: PDFContext, label: string, value: string, shade = false): PDFContext {
  ctx = checkNewPage(ctx, 16);
  if (shade) {
    ctx.page.drawRectangle({ x: ctx.ML, y: ctx.y - 12, width: ctx.MR - ctx.ML, height: 16, color: C.dark });
  }
  ctx.page.drawText(label, { x: ctx.ML + 6, y: ctx.y - 4, size: 9, font: ctx.normal, color: C.gray });
  ctx.page.drawText(value, { x: ctx.MR - 6, y: ctx.y - 4, size: 9, font: ctx.bold, color: C.white, maxWidth: 160 });
  ctx.y -= 16;
  return ctx;
}

// ── Haupt-Export-Funktion ───────────────────────────────────
export async function generateValuationPDF(
  valuation: ValuationWithProperty,
  profile:   Profile | null
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const bold   = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const normal = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let ctx = addPage(pdfDoc, bold, normal);
  const { W, H, ML, MR } = ctx;

  // ── TITELBLATT ─────────────────────────────────────────
  // Header Bar
  ctx.page.drawRectangle({ x: 0, y: H - 70, width: W, height: 70, color: C.dark });
  ctx.page.drawRectangle({ x: 0, y: H - 73, width: W, height: 3, color: C.gold });

  ctx.page.drawText("INDIKATIVER BEWERTUNGSBERICHT", {
    x: ML, y: H - 22, size: 9, font: bold, color: C.gold,
  });
  ctx.page.drawText("Mehrfamilienhaus Schweiz", {
    x: ML, y: H - 42, size: 18, font: bold, color: C.white,
  });

  const propertyLabel = [
    valuation.properties?.name,
    valuation.properties?.address,
    `${valuation.properties?.city}, ${valuation.properties?.canton}`,
  ].filter(Boolean).join("  ·  ");

  ctx.page.drawText(propertyLabel, {
    x: ML, y: H - 60, size: 9, font: normal, color: C.gray, maxWidth: W - 80,
  });

  const today = new Date().toLocaleDateString("de-CH");
  ctx.page.drawText(`Erstellt: ${today}`, {
    x: MR - 80, y: H - 60, size: 8, font: normal, color: C.gray,
  });

  ctx.y = H - 100;

  // ── MAKLER / AUFTRAGGEBER ──────────────────────────────
  if (profile?.full_name || profile?.company) {
    ctx = drawSectionHeader(ctx, "Erstellt durch");
    if (profile.full_name) ctx = drawRow(ctx, "Name", profile.full_name, false);
    if (profile.company)   ctx = drawRow(ctx, "Unternehmen", profile.company, true);
    if (profile.phone)     ctx = drawRow(ctx, "Telefon", profile.phone, false);
    ctx.y -= 8;
  }

  // ── OBJEKTÜBERSICHT ────────────────────────────────────
  ctx = drawSectionHeader(ctx, "1. Objektübersicht");
  ctx = drawRow(ctx, "Bezeichnung",   valuation.properties?.name    ?? "—", false);
  ctx = drawRow(ctx, "Adresse",       valuation.properties?.address ?? "—", true);
  ctx = drawRow(ctx, "Ort",           `${valuation.properties?.city ?? ""}, ${valuation.properties?.canton ?? ""}`, false);
  ctx = drawRow(ctx, "Erfasst am",    new Date(valuation.created_at).toLocaleDateString("de-CH"), true);
  ctx.y -= 8;

  // ── ERTRAGSDATEN ──────────────────────────────────────
  ctx = drawSectionHeader(ctx, "2. Ertragsdaten");
  ctx = drawRow(ctx, "Soll-Mietertrag Wohnen p.a.",  formatCHF(valuation.rent_residential), false);
  ctx = drawRow(ctx, "Soll-Mietertrag Gewerbe p.a.", formatCHF(valuation.rent_commercial), true);
  ctx = drawRow(ctx, "Brutto-Sollertrag",             formatCHF(valuation.gross_income), false);
  ctx = drawRow(ctx, "Effektiver Jahresertrag",        formatCHF(valuation.effective_income), true);
  ctx = drawRow(ctx, "Leerstandsquote",               `${valuation.vacancy_rate} %`, false);
  if (valuation.operating_costs > 0)   ctx = drawRow(ctx, "Betriebskosten p.a.",   formatCHF(valuation.operating_costs), true);
  if (valuation.maintenance_costs > 0) ctx = drawRow(ctx, "Unterhaltskosten p.a.", formatCHF(valuation.maintenance_costs), false);
  ctx.y -= 8;

  // ── KAPITALIERUNGSSATZ ─────────────────────────────────
  ctx = drawSectionHeader(ctx, "3. Kapitalisierungssatz-Herleitung");
  ctx = drawRow(ctx, "Lagekategorie",       getLageLabel((valuation.location_category as LocationCategory) ?? "durchschnitt"), false);
  ctx = drawRow(ctx, "Basis-Kap.-Satz",     formatPct(valuation.base_cap_rate ?? 0), true);
  ctx = drawRow(ctx, "Zustandsanpassung",   `${(valuation.condition_delta ?? 0) >= 0 ? "+" : ""}${formatPct(valuation.condition_delta ?? 0)}`, false);
  ctx = drawRow(ctx, "Gewerbezuschlag",     `+${formatPct(valuation.commercial_surcharge ?? 0)}`, true);
  ctx = drawRow(ctx, "Mikrolage-Korrektur", `${(valuation.micro_correction ?? 0) >= 0 ? "+" : ""}${formatPct(valuation.micro_correction ?? 0)}`, false);

  // Highlight final cap rate
  ctx = checkNewPage(ctx, 20);
  ctx.page.drawRectangle({ x: ML, y: ctx.y - 14, width: MR - ML, height: 18, color: C.gold });
  ctx.page.drawText("Finaler Kapitalisierungssatz", { x: ML + 6, y: ctx.y - 6, size: 10, font: bold, color: C.bg });
  ctx.page.drawText(formatPct(valuation.cap_rate), { x: MR - 6, y: ctx.y - 6, size: 11, font: bold, color: C.bg });
  ctx.y -= 26;

  // ── ERGEBNIS ─────────────────────────────────────────
  ctx = drawSectionHeader(ctx, "4. Bewertungsergebnis");

  // Main value highlighted
  ctx = checkNewPage(ctx, 40);
  ctx.page.drawRectangle({ x: ML, y: ctx.y - 34, width: MR - ML, height: 38, color: C.dark });
  ctx.page.drawRectangle({ x: ML, y: ctx.y - 34, width: 4, height: 38, color: C.gold });
  ctx.page.drawText("Indikativer Marktwert (Einfacher Modus)", { x: ML + 12, y: ctx.y - 12, size: 10, font: bold, color: C.light });
  ctx.page.drawText(formatCHF(valuation.value_simple), { x: ML + 12, y: ctx.y - 28, size: 18, font: bold, color: C.gold });
  ctx.y -= 46;

  // Scenarios
  const scenarios = buildScenarios(valuation.effective_income, valuation.cap_rate);
  scenarios.forEach((s, i) => {
    ctx = drawRow(ctx, s.label, formatCHF(s.value), i % 2 === 0);
  });
  if (valuation.value_extended && valuation.value_extended > 0) {
    ctx = drawRow(ctx, "Nettowert (erweiterter Modus)", formatCHF(valuation.value_extended), false);
  }
  ctx.y -= 8;

  // ── NOTIZEN ─────────────────────────────────────────
  if (valuation.notes) {
    ctx = drawSectionHeader(ctx, "5. Notizen");
    ctx = checkNewPage(ctx, 20);
    ctx.page.drawText(valuation.notes, {
      x: ML + 6, y: ctx.y - 4, size: 9, font: normal, color: C.gray, maxWidth: MR - ML - 12,
    });
    ctx.y -= 20;
  }

  // ── CTA ──────────────────────────────────────────────
  ctx = checkNewPage(ctx, 40);
  ctx.page.drawRectangle({ x: ML, y: ctx.y - 34, width: MR - ML, height: 38, color: C.green });
  ctx.page.drawRectangle({ x: ML, y: ctx.y - 34, width: 3, height: 38, color: C.gold });
  ctx.page.drawText("Nächste Schritte", { x: ML + 10, y: ctx.y - 12, size: 10, font: bold, color: C.gold });
  ctx.page.drawText("Kontaktieren Sie uns für eine präzise Bewertung oder Verkaufsberatung.", {
    x: ML + 10, y: ctx.y - 26, size: 9, font: normal, color: C.light, maxWidth: MR - ML - 20,
  });
  ctx.y -= 50;

  // ── DISCLAIMER ───────────────────────────────────────
  const disclaimer =
    "Rechtlicher Hinweis: Diese Berechnung ist eine indikative, modellbasierte Einschätzung. " +
    "Sie ersetzt keine vollständige Verkehrswertschätzung, keine hedonische Bewertung " +
    "und kein gerichtsfestes Gutachten. Alle Angaben ohne Gewähr.";

  ctx = checkNewPage(ctx, 30);
  ctx.page.drawRectangle({ x: ML, y: ctx.y - 26, width: MR - ML, height: 30, color: C.dark });
  ctx.page.drawText(disclaimer, {
    x: ML + 6, y: ctx.y - 8, size: 7, font: normal, color: C.gray, maxWidth: MR - ML - 12,
  });

  // ── FOOTER (alle Seiten) ─────────────────────────────
  const pages = pdfDoc.getPages();
  pages.forEach((p, idx) => {
    p.drawText(`MFH Bewertung Schweiz  |  Erstellt: ${today}`, {
      x: ML, y: 20, size: 7, font: normal, color: C.gray,
    });
    p.drawText(`Seite ${idx + 1} / ${pages.length}`, {
      x: MR - 50, y: 20, size: 7, font: normal, color: C.gray,
    });
  });

  return pdfDoc.save();
}
