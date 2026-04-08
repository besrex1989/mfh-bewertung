"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    console.log("Login result:", { data, error });
    if (error) { 
      setError(error.message); 
      setLoading(false); 
      return; 
    }
    window.location.href = "/dashboard";
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-ink-950">
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
          <h1 className="font-display text-3xl font-bold text-ink-50 mb-2">Willkommen zurück</h1>
          <p className="text-ink-400 text-sm">Melden Sie sich bei Ihrem Konto an</p>
        </div>

        <div className="card">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {error && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-lg px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

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
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn-accent w-full py-3 mt-2">
              {loading ? "Anmelden…" : "Anmelden →"}
            </button>
          </form>
        </div>

        <p className="text-center text-ink-500 text-sm mt-5">
          Noch kein Konto?{" "}
          <Link href="/auth/register" className="text-gold-500 hover:text-gold-400 font-medium">
            Kostenlos registrieren
          </Link>
        </p>
      </div>
    </div>
  );
}
