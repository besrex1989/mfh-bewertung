"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Props {
  valuationId: string;
}

export default function PDFDownloadButton({ valuationId }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`/api/pdf?id=${valuationId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) throw new Error("Fehler");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Bewertung_${valuationId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("PDF konnte nicht generiert werden.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleDownload} disabled={loading} className="btn-accent px-4 py-2.5 text-sm">
      {loading ? "⏳ Generiert…" : "📄 PDF-Bericht"}
    </button>
  );
}