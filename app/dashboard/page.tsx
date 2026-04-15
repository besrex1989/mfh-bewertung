"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { formatCHF, formatPct } from "@/lib/calculations";

// ── Status-Definitionen ───────────────────────────────
const STATUS_OPTIONS = [
  { value: "erstellt",   label: "Erstellt",    color: "bg-gray-100 text-gray-600" },
  { value: "versandt",   label: "Versandt",    color: "bg-blue-100 text-blue-600" },
  { value: "im_verkauf", label: "Im Verkauf",  color: "bg-amber-100 text-amber-600" },
  { value: "verkauft",   label: "Verkauft",    color: "bg-green-100 text-green-700" },
] as const;

function getStatusInfo(status: string | null | undefined) {
  return STATUS_OPTIONS.find(s => s.value === status) ?? STATUS_OPTIONS[0];
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [valuations, setValuations] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth/login"); return; }

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

  async function handleStatusChange(id: string, newStatus: string) {
    await supabase.from("valuations").update({ status: newStatus }).eq("id", id);
    setValuations(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  // Gefilterte Liste
  const filteredValuations = useMemo(() => {
    const q = search.toLowerCase().trim();
    return valuations.filter(v => {
      if (filterStatus !== "all" && (v.status ?? "erstellt") !== filterStatus) return false;
      if (!q) return true;
      const searchable = [
        v.properties?.name,
        v.properties?.address,
        v.properties?.city,
        v.properties?.canton,
      ].filter(Boolean).join(" ").toLowerCase();
      return searchable.includes(q);
    });
  }, [valuations, search, filterStatus]);

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

  // Status-Counts
  const statusCounts = STATUS_OPTIONS.reduce<Record<string, number>>((acc, s) => {
    acc[s.value] = valuations.filter(v => (v.status ?? "erstellt") === s.value).length;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
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
          <div className="flex items-center gap-2">
            <Link href="/new" className="hidden sm:inline-flex text-gray-500 hover:text-gray-800 text-sm transition-colors px-3">
              + Neue Bewertung
            </Link>
            <Link href="/settings" className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Einstellungen">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
            <button onClick={handleLogout} className="btn-ghost text-xs px-4 py-2">
              Abmelden
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8 pb-20">
        {/* Header */}
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

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Bewertungen</p>
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-2 0a2 2 0 01-2 2H9a2 2 0 01-2-2m9-14h.01M13 7h.01M9 7h.01" /></svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{valuations.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Portfoliowert</p>
              <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalValue > 0 ? formatCHF(totalValue) : "—"}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Ø Kap.-Satz</p>
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{avgCapRate > 0 ? formatPct(avgCapRate) : "—"}</p>
          </div>
        </div>

        {/* Empty State */}
        {valuations.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm text-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-2 0a2 2 0 01-2 2H9a2 2 0 01-2-2" /></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Noch keine Bewertungen</h3>
            <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
              Erfassen Sie Ihre erste MFH-Bewertung und erhalten Sie eine indikative Marktwertschaetzung.
            </p>
            <Link href="/new" className="btn-accent px-6 py-3 inline-flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Erste Bewertung erstellen
            </Link>
          </div>
        ) : (
          <>
            {/* Suche + Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Suche nach Objekt, Adresse, Ort..."
                  className="input-field pl-9"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Status-Filter Tabs */}
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
              <button
                onClick={() => setFilterStatus("all")}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  filterStatus === "all" ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                Alle ({valuations.length})
              </button>
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s.value}
                  onClick={() => setFilterStatus(s.value)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    filterStatus === s.value ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {s.label} ({statusCounts[s.value] ?? 0})
                </button>
              ))}
            </div>

            {/* Liste */}
            {filteredValuations.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm text-center py-12 px-6">
                <p className="text-gray-400 text-sm">Keine Bewertungen entsprechen den Filtern.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-400 px-1">{filteredValuations.length} von {valuations.length} Bewertungen</p>
                {filteredValuations.map((v) => {
                  const status = getStatusInfo(v.status);
                  return (
                    <div key={v.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group">
                      <div className="flex items-start justify-between gap-4">
                        <Link href={`/valuation/${v.id}`} className="flex items-start gap-4 min-w-0 flex-1 cursor-pointer">
                          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                {v.properties?.name ?? "—"}
                              </h3>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${status.color}`}>
                                {status.label}
                              </span>
                            </div>
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
                        </Link>
                        <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                          <p className="text-lg font-bold text-gray-900">{formatCHF(v.value_simple)}</p>
                          <select
                            value={v.status ?? "erstellt"}
                            onChange={e => handleStatusChange(v.id, e.target.value)}
                            onClick={e => e.stopPropagation()}
                            className="text-[10px] px-2 py-1 rounded-md border border-gray-200 bg-white text-gray-600 cursor-pointer hover:border-blue-300"
                          >
                            {STATUS_OPTIONS.map(s => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
