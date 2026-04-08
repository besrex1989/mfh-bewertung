"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* NAV */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
              <span className="text-white text-sm font-black">M</span>
            </div>
            <span className="font-bold text-lg text-gray-900 tracking-tight">
              MFH <span className="text-blue-600">Bewertung</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors">
              Anmelden
            </Link>
            <Link href="/auth/register" className="btn-accent text-xs px-4 py-2">
              Kostenlos starten
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="bg-gradient-to-br from-blue-50 to-white px-4 pt-20 pb-24 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 rounded-full px-4 py-1.5 mb-6 text-xs font-semibold uppercase tracking-widest">
            Schweizer Immobilienbewertung
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 leading-tight mb-5 tracking-tight">
            Was ist Ihr<br />
            <span className="text-blue-600">Mehrfamilienhaus</span><br />
            wirklich wert?
          </h1>
          <p className="text-lg text-gray-500 max-w-md mx-auto mb-8 leading-relaxed">
            Kostenlose indikative Bewertung in weniger als 2 Minuten — auf Basis des Ertragswertmodells und Schweizer Marktdaten.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/auth/register" className="btn-accent px-8 py-3.5 text-base">
              Jetzt Bewertung starten →
            </Link>
            <Link href="/auth/login" className="btn-ghost px-8 py-3.5 text-base">
              Anmelden
            </Link>
          </div>
          <div className="flex gap-6 justify-center mt-8 flex-wrap">
            {["Schweizer Marktdaten", "Ertragswertbasiert", "Für Eigentümer & Investoren"].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <span className="text-blue-600 font-bold">✓</span>
                <span className="text-gray-500 text-sm">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-5xl mx-auto px-4 py-16 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { icon: "⚡", title: "Schnell", desc: "Ergebnis in unter 2 Minuten. Schritt-für-Schritt Wizard." },
          { icon: "🔍", title: "Transparent", desc: "Vollständige Herleitung des Kapitalisierungssatzes." },
          { icon: "📊", title: "Professionell", desc: "Ertragswertmethode nach Schweizer Standard." },
          { icon: "📄", title: "PDF-Export", desc: "Professioneller Bericht für Finanzierungsgespräche." },
        ].map((f) => (
          <div key={f.title} className="card hover:border-blue-300 hover:shadow-md transition-all cursor-default">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-16 px-4 text-center">
        <h2 className="text-3xl font-bold text-white mb-3">Bereit für Ihre Bewertung?</h2>
        <p className="text-blue-100 mb-8">Kostenlos · Keine Kreditkarte erforderlich · Sofortiges Ergebnis</p>
        <Link href="/auth/register" className="bg-white text-blue-600 font-bold px-10 py-3.5 rounded-xl text-base hover:bg-blue-50 transition-colors inline-block">
          Bewertung starten →
        </Link>
      </section>

      <footer className="border-t border-gray-200 py-5 px-4 text-center bg-white">
        <span className="text-xs text-gray-400">MFH Bewertung Schweiz · Indikatives Modell · Kein Gutachtenersatz</span>
      </footer>
    </div>
  );
}