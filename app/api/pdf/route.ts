import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { generateValuationPDF } from "@/utils/pdfGenerator";
import type { Database } from "@/types/database";
import type { ValuationWithProperty, Profile } from "@/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  // Auth check
  const supabase = createServerComponentClient<Database>({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch valuation
  const { data: valuationData, error: vError } = await supabase
    .from("valuations")
    .select("*, properties(name, address, city, canton)")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single();

  if (vError || !valuationData) {
    return NextResponse.json({ error: "Valuation not found" }, { status: 404 });
  }

  // Fetch profile
  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  try {
    const pdfBytes = await generateValuationPDF(
      valuationData as ValuationWithProperty,
      profileData as Profile | null
    );

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="Bewertung_${id.slice(0, 8)}.pdf"`,
        "Cache-Control":       "no-store",
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
