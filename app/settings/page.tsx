"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth/login"); return; }
      setEmail(session.user.email ?? "");

      const { data: prof } = await supabase
        .from("profiles").select("*").eq("id", session.user.id).single();
      if (prof) {
        setFullName(prof.full_name ?? "");
        setCompany(prof.company ?? "");
        setPhone(prof.phone ?? "");
      }
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSaveProfile() {
    setSaving(true); setMsg(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }

    const { error } = await supabase.from("profiles").upsert({
      id: session.user.id,
      full_name: fullName || null,
      company: company || null,
      phone: phone || null,
    }, { onConflict: "id" });

    if (error) setMsg({ type: "err", text: `Profil-Fehler: ${error.message}` });
    else setMsg({ type: "ok", text: "Profil gespeichert." });
    setSaving(false);
  }

  async function handleChangeEmail() {
    setSaving(true); setMsg(null);
    const { error } = await supabase.auth.updateUser({ email });
    if (error) setMsg({ type: "err", text: `E-Mail-Fehler: ${error.message}` });
    else setMsg({ type: "ok", text: "Bestaetigungs-Mail an neue Adresse gesendet." });
    setSaving(false);
  }

  async function handleChangePassword() {
    if (newPassword.length < 8) {
      setMsg({ type: "err", text: "Passwort muss mindestens 8 Zeichen haben." });
      return;
    }
    setSaving(true); setMsg(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setMsg({ type: "err", text: `Passwort-Fehler: ${error.message}` });
    else { setMsg({ type: "ok", text: "Passwort geaendert." }); setNewPassword(""); }
    setSaving(false);
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
              <span className="text-white text-sm font-black">M</span>
            </div>
            <span className="font-bold text-base text-gray-900">
              MFH <span className="text-blue-600">Bewertung</span>
            </span>
          </div>
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-800 text-sm">← Dashboard</Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8 pb-20">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Einstellungen</h1>
          <p className="text-gray-400 text-sm">Verwalten Sie Ihr Profil und Konto</p>
        </div>

        {msg && (
          <div className={`mb-5 rounded-xl px-4 py-3 text-sm ${
            msg.type === "ok" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-600"
          }`}>
            {msg.text}
          </div>
        )}

        {/* Profil */}
        <div className="card mb-5">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Profil</h2>
          <p className="text-gray-400 text-sm mb-5">Wird im PDF-Bericht angezeigt</p>
          <div className="space-y-4">
            <div>
              <label className="label">Vollstaendiger Name</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="input-field" placeholder="z. B. Max Muster" />
            </div>
            <div>
              <label className="label">Unternehmen</label>
              <input type="text" value={company} onChange={e => setCompany(e.target.value)} className="input-field" placeholder="z. B. Muster Immobilien AG" />
            </div>
            <div>
              <label className="label">Telefon</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="input-field" placeholder="z. B. +41 79 123 45 67" />
            </div>
            <button onClick={handleSaveProfile} disabled={saving} className="btn-accent px-5 py-2.5">
              {saving ? "Wird gespeichert..." : "Profil speichern"}
            </button>
          </div>
        </div>

        {/* E-Mail */}
        <div className="card mb-5">
          <h2 className="text-lg font-bold text-gray-900 mb-1">E-Mail-Adresse</h2>
          <p className="text-gray-400 text-sm mb-5">Bestaetigung wird an neue Adresse gesendet</p>
          <div className="space-y-4">
            <div>
              <label className="label">E-Mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" />
            </div>
            <button onClick={handleChangeEmail} disabled={saving} className="btn-primary px-5 py-2.5">
              E-Mail aendern
            </button>
          </div>
        </div>

        {/* Passwort */}
        <div className="card mb-5">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Passwort</h2>
          <p className="text-gray-400 text-sm mb-5">Mindestens 8 Zeichen</p>
          <div className="space-y-4">
            <div>
              <label className="label">Neues Passwort</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input-field" placeholder="••••••••" />
            </div>
            <button onClick={handleChangePassword} disabled={saving || newPassword.length < 8} className="btn-primary px-5 py-2.5">
              Passwort aendern
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
