import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateValuationPDF } from "@/utils/pdfGenerator";
import type { ValuationWithProperty, Profile } from "@/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}
  );

  const { data: valuationData, error } = await supabase
    .from("valuations")
    .select("*, properties(*)")
    .eq("id", id)
    .single();

  if (error || !valuationData) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .limit(1)
    .single();

  try {
    const pdfBytes = await generateValuationPDF(
      valuationData as ValuationWithProperty,
      profileData as Profile | null
    );

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Bewertung_${id.slice(0, 8)}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("PDF error:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}