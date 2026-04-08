"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* ── NAV ─────────────────────────────────── */}
      <nav className="border-b border-ink-800 bg-ink-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-forest-700 to-gold-500 flex items-center justify-center">
              <span className="text-ink-950 text-sm font-black">M</span>
            </div>
            <span className="font-display font-bold text-lg text-ink-50 tracking-tight">
              MFH <span className="text-gold-500">Bewertung</span>
            </span>
            <span className="text-[10px] text-ink-600 bg-ink-800 rounded px-1.5 py-0.5 font-semibold tracking-wider">
              SCHWEIZ
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-ink-400 hover:text-ink-200 text-sm transition-colors">
              Anmelden
            </Link>
            <Link href="/auth/register" className="btn-accent text-xs px-4 py-2">
              Kostenlos starten
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────── */}
      <main className="flex-1">
        <section className="relative overflow-hidden px-4 pt-24 pb-28 text-center">
          {/* BG decoration */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-forest-900/30 blur-3xl" />
            <div className="absolute top-10 right-[10%] w-48 h-48 rounded-full border border-ink-800/60 opacity-40" />
            <div className="absolute bottom-10 left-[8%] w-28 h-28 rounded-full border border-ink-800/60 opacity-30" />
          </div>

          <div className="relative max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-gold-500/10 border border-gold-500/20 rounded-full px-4 py-1.5 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-500 inline-block" />
              <span className="text-[11px] text-gold-400 font-semibold tracking-widest uppercase">
                Schweizer Immobilienbewertung
              </span>
            </div>

            <h1 className="font-display font-black text-5xl md:text-6xl text-ink-50 leading-[1.06] mb-5 tracking-tight">
              Was ist Ihr<br />
              <span className="text-gold-500">Mehrfamilienhaus</span><br />
              wirklich wert?
            </h1>

            <p className="text-lg text-ink-400 max-w-md mx-auto mb-10 leading-relaxed">
              Kostenlose indikative Bewertung in weniger als 2 Minuten — auf Basis des
              Ertragswertmodells und Schweizer Marktdaten.
            </p>

            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/auth/register" className="btn-accent px-8 py-3.5 text-base">
                Jetzt Bewertung starten →
              </Link>
              <Link href="/auth/login" className="btn-ghost px-8 py-3.5 text-base">
                Anmelden
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex gap-6 justify-center mt-10 flex-wrap">
              {["Schweizer Marktdaten", "Ertragswertbasiert", "Für Eigentümer & Investoren"].map((t) => (
                <div key={t} className="flex items-center gap-2">
                  <span className="text-gold-500 text-base">✓</span>
                  <span className="text-ink-400 text-sm">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4 pb-20 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: "⚡", title: "Schnell", desc: "Ergebnis in unter 2 Minuten. Schritt-für-Schritt Wizard." },
            { icon: "🔍", title: "Transparent", desc: "Vollständige Herleitung des Kapitalisierungssatzes." },
            { icon: "📊", title: "Professionell", desc: "Ertragswertmethode nach Schweizer Standard." },
            { icon: "📄", title: "PDF-Export", desc: "Professioneller Bericht — geeignet für Finanzierungsgespräche." },
          ].map((f) => (
            <div
              key={f.title}
              className="card transition-colors hover:border-gold-500/30 cursor-default"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-display text-lg font-bold text-ink-50 mb-2">{f.title}</h3>
              <p className="text-ink-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </section>

        {/* ── SECOND CTA ───────────────────────────── */}
        <section className="bg-ink-900 border-t border-ink-800 py-16 px-4 text-center">
          <h2 className="font-display text-3xl font-bold text-ink-50 mb-3">
            Bereit für Ihre Bewertung?
          </h2>
          <p className="text-ink-400 mb-8">
            Kostenlos · Keine Kreditkarte erforderlich · Sofortiges Ergebnis
          </p>
          <Link href="/auth/register" className="btn-accent px-10 py-3.5 text-base">
            Bewertung starten →
          </Link>
        </section>
      </main>

      <footer className="border-t border-ink-800 py-5 px-4 text-center">
        <span className="text-xs text-ink-600">
          MFH Bewertung Schweiz · Indikatives Modell · Kein Gutachtenersatz
        </span>
      </footer>
    </div>
  );
}
