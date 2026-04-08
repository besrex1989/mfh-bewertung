import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-5xl mb-4">🏚️</p>
        <h2 className="font-display text-2xl font-bold text-ink-50 mb-2">
          Bewertung nicht gefunden
        </h2>
        <p className="text-ink-400 text-sm mb-6">
          Diese Bewertung existiert nicht oder gehört einem anderen Benutzer.
        </p>
        <Link href="/dashboard" className="btn-accent px-6 py-3">
          → Zum Dashboard
        </Link>
      </div>
    </div>
  );
}
