import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Database } from "@/types/database";
import type { ValuationWithProperty } from "@/types";
import { formatCHF, formatPct } from "@/lib/calculations";
import Navbar from "@/components/Navbar";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createServerComponentClient<Database>({ cookies });

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/auth/login");

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  // Fetch valuations with property data
  const { data: valuations } = await supabase
    .from("valuations")
    .select("*, properties(name, address, city, canton)")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  const rows = (valuations ?? []) as ValuationWithProperty[];

  const totalValue  = rows.reduce((s, v) => s + (v.value_simple ?? 0), 0);
  const avgCapRate  = rows.length > 0
    ? rows.reduce((s, v) => s + v.cap_rate, 0) / rows.length
    : 0;

  return (
    <div className="min-h-screen bg-ink-950">
      <Navbar
        userEmail={session.user.email}
        userName={profile?.full_name}
      />

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink-50 mb-1">
              {profile?.full_name ? `Guten Tag, ${profile.full_name.split(" ")[0]}` : "Dashboard"}
            </h1>
            <p className="text-ink-400 text-sm">
              {profile?.company ? profile.company + " · " : ""}
              {rows.length} {rows.length === 1 ? "Bewertung" : "Bewertungen"}
            </p>
          </div>
          <Link href="/new" className="btn-accent px-5 py-2.5">
            + Neue Bewertung
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="kpi-card">
            <p className="text-[10px] text-ink-500 uppercase tracking-widest mb-1">Bewertungen</p>
            <p className="font-display text-3xl font-bold text-gold-400">{rows.length}</p>
          </div>
          <div className="kpi-card">
            <p className="text-[10px] text-ink-500 uppercase tracking-widest mb-1">Gesamtwert</p>
            <p className="font-display text-2xl font-bold text-gold-400">
              {totalValue > 0 ? formatCHF(totalValue) : "—"}
            </p>
          </div>
          <div className="kpi-card">
            <p className="text-[10px] text-ink-500 uppercase tracking-widest mb-1">Ø Kap.-Satz</p>
            <p className="font-display text-2xl font-bold text-gold-400">
              {avgCapRate > 0 ? formatPct(avgCapRate) : "—"}
            </p>
          </div>
        </div>

        {/* Valuation Table */}
        {rows.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-4xl mb-4">🏢</p>
            <h3 className="font-display text-xl font-bold text-ink-200 mb-2">
              Noch keine Bewertungen
            </h3>
            <p className="text-ink-400 text-sm mb-6">
              Starten Sie jetzt mit Ihrer ersten MFH-Bewertung.
            </p>
            <Link href="/new" className="btn-accent px-6 py-3">
              Erste Bewertung erstellen →
            </Link>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-ink-800 text-[10px] font-semibold text-ink-400 uppercase tracking-widest">
              <div className="col-span-3">Objekt</div>
              <div className="col-span-2">Ort</div>
              <div className="col-span-2">Indik. Wert</div>
              <div className="col-span-2">Kap.-Satz</div>
              <div className="col-span-2">Datum</div>
              <div className="col-span-1"></div>
            </div>

            {rows.map((v, idx) => (
              <div
                key={v.id}
                className={`grid grid-cols-12 gap-2 px-5 py-4 border-t border-ink-800 items-center transition-colors hover:bg-ink-900/60 ${
                  idx === 0 ? "border-t-0" : ""
                }`}
              >
                <div className="col-span-3">
                  <p className="text-sm font-semibold text-ink-100 truncate">
                    {v.properties?.name ?? "—"}
                  </p>
                  <p className="text-xs text-ink-500 truncate">
                    {v.properties?.address ?? ""}
                  </p>
                </div>
                <div className="col-span-2 text-sm text-ink-300">
                  {v.properties?.city ?? "—"}
                  <span className="text-ink-600 ml-1">{v.properties?.canton}</span>
                </div>
                <div className="col-span-2">
                  <span className="font-display text-base font-bold text-gold-400">
                    {formatCHF(v.value_simple)}
                  </span>
                </div>
                <div className="col-span-2 text-sm text-ink-300">
                  {formatPct(v.cap_rate)}
                </div>
                <div className="col-span-2 text-xs text-ink-500">
                  {new Date(v.created_at).toLocaleDateString("de-CH")}
                </div>
                <div className="col-span-1 flex justify-end gap-1">
                  <Link
                    href={`/valuation/${v.id}`}
                    className="text-xs text-gold-500 hover:text-gold-300 px-2 py-1 border border-gold-500/20 rounded-md transition-colors"
                  >
                    Ansehen
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
