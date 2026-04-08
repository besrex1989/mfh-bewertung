"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface NavbarProps {
  userEmail?: string | null;
  userName?:  string | null;
}

export default function Navbar({ userEmail, userName }: NavbarProps) {
  const router   = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors px-3 py-1.5 rounded-lg ${
        pathname === href
          ? "text-gold-400 bg-gold-500/10"
          : "text-ink-400 hover:text-ink-200 hover:bg-ink-800"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="border-b border-ink-800 bg-ink-900/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-forest-700 to-gold-500 flex items-center justify-center">
              <span className="text-ink-950 text-sm font-black">M</span>
            </div>
            <span className="font-display font-bold text-base text-ink-50 tracking-tight">
              MFH <span className="text-gold-500">Bewertung</span>
            </span>
          </Link>
          <span className="hidden sm:inline text-[10px] text-ink-600 bg-ink-800 rounded px-1.5 py-0.5 font-semibold tracking-wider">
            SCHWEIZ
          </span>
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {navLink("/dashboard", "Dashboard")}
          {navLink("/new", "Neue Bewertung")}
        </div>

        {/* User menu */}
        <div className="flex items-center gap-3">
          <span className="hidden md:block text-xs text-ink-500 truncate max-w-[160px]">
            {userName || userEmail}
          </span>
          <button onClick={handleLogout} className="btn-ghost text-xs px-4 py-2">
            Abmelden
          </button>
        </div>
      </div>
    </nav>
  );
}
