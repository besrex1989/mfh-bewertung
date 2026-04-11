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

  async function handleDelete(id: string) {
    if (!confirm("Bewertung wirklich loeschen?")) return;
    await supabase.from("valuations").delete().eq("id", id);
    setValuations(prev => prev.filter(v => v.id !== id));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Dashboard wird geladen...</p>
      </div>
    </div>
  );

  const totalValue = valuations.reduce((s, v) => s + (v.value_simple ?? 0), 0);
  const avgCapRate = valuations.length > 0
    ? valuations.reduce((s, v) => s + v.cap_rate, 0) / valuations.length : 0;
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Guten Morgen";
    if (h < 17) return "Guten Tag";
    return "Guten Abend";
  })();
  const firstName = profile?.full_name?.split(" ")[0] ?? "";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Navbar ── */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
              <span className="text-white text-sm font-black">M</span>
            </div>
            <span className="font-bold text-base text-gray-900">
              MFH <span className="text-blue-600">Bewertung</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/new" className="hidden sm:inline-flex text-gray-500 hover:text-gray-800 text-sm transition-colors">
              + Neue Bewertung
            </Link>
            <button onClick={handleLogout} className="btn-ghost text-xs px-4 py-2">
              Abmelden
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8 pb-20">
        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
              {firstName ? `${greeting}, ${firstName}` : "Dashboard"}
            </h1>
            <p className="text-gray-400 text-sm">
              {valuations.length === 0
                ? "Starten Sie mit Ihrer ersten Bewertung"
                : `${valuations.length} Bewertung${valuations.length !== 1 ? "en" : ""} erfasst`}
            </p>
          </div>
          <Link href="/new" className="btn-accent px-5 py-2.5 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Neue Bewertung
          </Link>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Bewertungen</p>
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-2 0a2 2 0 01-2 2H9a2 2 0 01-2-2m9-14h.01M13 7h.01M9 7h.01" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{valuations.length}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Portfoliowert</p>
              <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalValue > 0 ? formatCHF(totalValue) : "—"}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Ø Kap.-Satz</p>
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{avgCapRate > 0 ? formatPct(avgCapRate) : "—"}</p>
          </div>
        </div>

        {/* ── Bewertungen Liste ── */}
        {valuations.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm text-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-2 0a2 2 0 01-2 2H9a2 2 0 01-2-2" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Noch keine Bewertungen</h3>
            <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
              Erfassen Sie Ihre erste MFH-Bewertung und erhalten Sie eine indikative Marktwertschaetzung.
            </p>
            <Link href="/new" className="btn-accent px-6 py-3 inline-flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Erste Bewertung erstellen
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-gray-900">Ihre Bewertungen</h2>
              <p className="text-xs text-gray-400">{valuations.length} Objekte</p>
            </div>

            {valuations.map((v) => (
              <Link key={v.id} href={`/valuation/${v.id}`} className="block">
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Object info */}
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                          {v.properties?.name ?? "—"}
                        </h3>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {v.properties?.address ?? ""}, {v.properties?.city ?? ""}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-400">
                            {new Date(v.created_at).toLocaleDateString("de-CH")}
                          </span>
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-400">
                            Kap.-Satz {formatPct(v.cap_rate)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Value */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-gray-900">{formatCHF(v.value_simple)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Ertragswert</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
