"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName]   = useState("");
  const [company, setCompany]     = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Passwort muss mindestens 6 Zeichen lang sein."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) { setError(error.message); setLoading(false); return; }
    // Upsert profile
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").upsert({ id: user.id, full_name: fullName, company });
    }
    setSuccess(true);
    setLoading(false);
    setTimeout(() => router.push("/dashboard"), 1500);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-ink-950">
        <div className="text-center">
          <div className="text-4xl mb-4">✓</div>
          <h2 className="font-display text-2xl font-bold text-gold-500 mb-2">Registrierung erfolgreich!</h2>
          <p className="text-ink-400 text-sm">Sie werden weitergeleitet…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-ink-950 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-forest-700 to-gold-500 flex items-center justify-center">
              <span className="text-ink-950 text-sm font-black">M</span>
            </div>
            <span className="font-display font-bold text-lg text-ink-50 tracking-tight">
              MFH <span className="text-gold-500">Bewertung</span>
            </span>
          </Link>
          <h1 className="font-display text-3xl font-bold text-ink-50 mb-2">Konto erstellen</h1>
          <p className="text-ink-400 text-sm">Kostenlos · Keine Kreditkarte erforderlich</p>
        </div>

        <div className="card">
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            {error && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-lg px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="label">Vollständiger Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field"
                placeholder="Hans Müller"
                required
              />
            </div>

            <div>
              <label className="label">Unternehmen (optional)</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="input-field"
                placeholder="Müller Immobilien AG"
              />
            </div>

            <div>
              <label className="label">E-Mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="name@firma.ch"
                required
              />
            </div>

            <div>
              <label className="label">Passwort</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Min. 6 Zeichen"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn-accent w-full py-3 mt-2">
              {loading ? "Wird registriert…" : "Konto erstellen →"}
            </button>
          </form>
        </div>

        <p className="text-center text-ink-500 text-sm mt-5">
          Bereits ein Konto?{" "}
          <Link href="/auth/login" className="text-gold-500 hover:text-gold-400 font-medium">
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}
