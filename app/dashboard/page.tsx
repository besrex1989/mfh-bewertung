"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { formatCHF, formatPct } from "@/lib/calculations";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [valuations, setValuations] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth/login"); return; }
      setUser(session.user);

      const { data: prof } = await supabase
        .from("profiles").select("*").eq("id", session.user.id).single();
      setProfile(prof);

      const { data: vals } = await supabase
        .from("valuations")
        .select("*, properties(name, address, city, canton)")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      setValuations(vals ?? []);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center">
      <p className="text-ink-400">Laden…</p>
    </div>
  );

  const totalValue = valuations.reduce((s, v) => s + (v.value_simple ?? 0), 0);
  const avgCapRate = valuations.length > 0
    ? valuations.reduce((s, v) => s + v.cap_rate, 0) / valuations.length : 0;

  return (
    <div className="min-h-screen bg-ink-950">
      <nav className="border-b border-ink-800 bg-ink-900/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-forest-700 to-gold-500 flex items-center justify-center">
              <span className="text-ink-950 text-sm font-black">M</span>
            </div>
            <span className="font-display font-bold text-base text-ink-50 tracking-tight">
              MFH <span className="text-gold-500">Bewertung</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/new" className="text-ink-400 hover:text-ink-200 text-sm transition-colors">
              + Neue Bewertung
            </Link>
            <button onClick={handleLogout} className="btn-ghost text-xs px-4 py-2">
              Abmelden
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink-50 mb-1">
              {profile?.full_name ? `Guten Tag, ${profile.full_name.split(" ")[0]}` : "Dashboard"}
            </h1>
            <p className="text-ink-400 text-sm">{valuations.length} Bewertungen</p>
          </div>
          <Link href="/new" className="btn-accent px-5 py-2.5">+ Neue Bewertung</Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="kpi-card">
            <p className="text-[10px] text-ink-500 uppercase tracking-widest mb-1">Bewertungen</p>
            <p className="font-display text-3xl font-bold text-gold-400">{valuations.length}</p>
          </div>
          <div className="kpi-card">
            <p className="text-[10px] text-ink-500 uppercase tracking-widest mb-1">Gesamtwert</p>
            <p className="font-display text-2xl font-bold text-gold-400">{totalValue > 0 ? formatCHF(totalValue) : "—"}</p>
          </div>
          <div className="kpi-card">
            <p className="text-[10px] text-ink-500 uppercase tracking-widest mb-1">Ø Kap.-Satz</p>
            <p className="font-display text-2xl font-bold text-gold-400">{avgCapRate > 0 ? formatPct(avgCapRate) : "—"}</p>
          </div>
        </div>

        {valuations.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-4xl mb-4">🏢</p>
            <h3 className="font-display text-xl font-bold text-ink-200 mb-2">Noch keine Bewertungen</h3>
            <p className="text-ink-400 text-sm mb-6">Starten Sie jetzt mit Ihrer ersten MFH-Bewertung.</p>
            <Link href="/new" className="btn-accent px-6 py-3">Erste Bewertung erstellen →</Link>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-ink-800 text-[10px] font-semibold text-ink-400 uppercase tracking-widest">
              <div className="col-span-3">Objekt</div>
              <div className="col-span-2">Ort</div>
              <div className="col-span-3">Indik. Wert</div>
              <div className="col-span-2">Kap.-Satz</div>
              <div className="col-span-1">Datum</div>
              <div className="col-span-1"></div>
            </div>
            {valuations.map((v) => (
              <div key={v.id} className="grid grid-cols-12 gap-2 px-5 py-4 border-t border-ink-800 items-center hover:bg-ink-900/60 transition-colors">
                <div className="col-span-3">
                  <p className="text-sm font-semibold text-ink-100 truncate">{v.properties?.name ?? "—"}</p>
                  <p className="text-xs text-ink-500 truncate">{v.properties?.address ?? ""}</p>
                </div>
                <div className="col-span-2 text-sm text-ink-300">{v.properties?.city ?? "—"}</div>
                <div className="col-span-3">
                  <span className="font-display text-base font-bold text-gold-400">{formatCHF(v.value_simple)}</span>
                </div>
                <div className="col-span-2 text-sm text-ink-300">{formatPct(v.cap_rate)}</div>
                <div className="col-span-1 text-xs text-ink-500">{new Date(v.created_at).toLocaleDateString("de-CH")}</div>
                <div className="col-span-1 flex justify-end">
                  <Link href={`/valuation/${v.id}`} className="text-xs text-gold-500 hover:text-gold-300 px-2 py-1 border border-gold-500/20 rounded-md transition-colors">
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