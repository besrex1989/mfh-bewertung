"use client";

import { useState, useRef, useEffect } from "react";

interface AddressResult {
  label: string;
  street: string;
  zip: string;
  city: string;
  canton: string;
}

interface AddressSearchProps {
  onSelect: (result: AddressResult) => void;
  initialValue?: string;
}

export default function AddressSearch({ onSelect, initialValue = "" }: AddressSearchProps) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<AddressResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function search(text: string) {
    if (text.length < 3) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText=${encodeURIComponent(text)}&type=locations&limit=6&origins=address`
      );
      const data = await res.json();
      const parsed: AddressResult[] = (data.results ?? []).map((r: any) => {
        const attrs = r.attrs ?? {};
        // label format: "Morillonstrasse 44 <b>3007 Bern</b>"
        const rawLabel = (attrs.label ?? "").replace(/<[^>]*>/g, "");
        // detail format: "morillonstrasse 44 3007 bern 351 bern ch be"
        const detail = (attrs.detail ?? "").toLowerCase();

        // Extract PLZ (4-digit Swiss postal code)
        const plzMatch = rawLabel.match(/(\d{4})\s+(\S.+)/);
        const zip = plzMatch ? plzMatch[1] : "";
        const city = plzMatch ? plzMatch[2].trim() : "";

        // Street = everything before the PLZ
        const street = plzMatch ? rawLabel.slice(0, rawLabel.indexOf(plzMatch[1])).trim() : rawLabel;

        // Canton = last 2 characters of detail
        const canton = detail.trim().slice(-2).toUpperCase();

        return { label: rawLabel, street, zip, city, canton };
      }).filter((r: AddressResult) => r.street.length > 0);

      setResults(parsed);
      setOpen(parsed.length > 0);
    } catch (e) {
      console.error("Address search error:", e);
      setResults([]);
    }
    setLoading(false);
  }

  function handleChange(text: string) {
    setQuery(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(text), 300);
  }

  function handleSelect(r: AddressResult) {
    setQuery(r.street);
    setOpen(false);
    onSelect(r);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="label">ADRESSE SUCHEN</label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Strasse und Hausnummer eingeben..."
          className="input-field pl-9"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-500">Suche...</div>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(r)}
              className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0"
            >
              <span className="text-sm font-medium text-gray-800">{r.street}</span>
              <span className="text-xs text-gray-400 ml-2">{r.zip} {r.city}, {r.canton}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
