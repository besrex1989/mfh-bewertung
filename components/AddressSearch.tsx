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

  // Close dropdown on outside click
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
        const label = attrs.label?.replace(/<[^>]*>/g, "") ?? "";
        // geo.admin.ch returns: "Strasse Nr, PLZ Ort"
        const street = attrs.featureId ? label.split(",")[0]?.trim() ?? "" : "";
        const zip = attrs.zd_plz ? String(attrs.zd_plz) : (attrs.origin === "address" ? label.match(/(\d{4})\s/)?.[1] ?? "" : "");
        const city = attrs.gemeindename ?? attrs.ort ?? "";
        const canton = attrs.kanton ?? "";
        return { label, street, zip, city, canton };
      }).filter((r: AddressResult) => r.street && r.city);
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
      <input
        type="text"
        value={query}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Strasse und Hausnummer eingeben..."
        className="input-field"
      />
      {loading && (
        <div className="absolute right-3 top-[38px] text-xs text-gray-400">...</div>
      )}
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
              <span className="text-xs text-gray-400 ml-2">{r.zip} {r.city}, {r.canton.toUpperCase()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
