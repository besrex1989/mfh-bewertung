"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { createProperty, createValuation } from "@/lib/db";
import FormWizard from "@/components/FormWizard";
import type { PropertyFormData, ValuationFormData, ValuationResult } from "@/types";
import Link from "next/link";

export default function NewValuationPage() {
  const router  = useRouter();
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  async function handleComplete(
    propertyForm:  PropertyFormData,
    valuationForm: ValuationFormData,
    result:        ValuationResult
  ) {
    setError("");
    setSaving(true);

    try {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      // 2. Create property
      const property = await createProperty(user.id, {
        name:            propertyForm.name,
        address:         propertyForm.address,
        city:            propertyForm.city,
        canton:          propertyForm.canton,
        zip:             propertyForm.zip || null,
        build_year:      propertyForm.build_year ? +propertyForm.build_year : null,
        condition:       propertyForm.condition,
        num_units:       propertyForm.num_units ? +propertyForm.num_units : null,
        living_area:     propertyForm.living_area ? +propertyForm.living_area : null,
        commercial_area: propertyForm.commercial_area ? +propertyForm.commercial_area : null,
      });

      if (!property) throw new Error("Objekt konnte nicht gespeichert werden.");

      // 3. Create valuation
      const valuation = await createValuation(user.id, {
        property_id:          property.id,
        rent_residential:     +valuationForm.rent_residential || 0,
        rent_commercial:      +valuationForm.rent_commercial || 0,
        actual_rent:          valuationForm.actual_rent ? +valuationForm.actual_rent : null,
        vacancy_rate:         +valuationForm.vacancy_rate || 0,
        operating_costs:      +valuationForm.operating_costs || 0,
        maintenance_costs:    +valuationForm.maintenance_costs || 0,
        micro_location:       valuationForm.micro_location,
        macro_location:       valuationForm.macro_location,
        public_transport:     valuationForm.public_transport,
        cap_rate:             result.capRateBreakdown.final,
        gross_income:         result.grossIncome,
        effective_income:     result.effectiveIncome,
        net_income:           result.netIncome > 0 ? result.netIncome : null,
        value_simple:         result.valueSimple,
        value_extended:       result.valueExtended > 0 ? result.valueExtended : null,
        value_conservative:   result.valueConservative,
        value_optimistic:     result.valueOptimistic,
        base_cap_rate:        result.capRateBreakdown.base,
        condition_delta:      result.capRateBreakdown.conditionDelta,
        commercial_surcharge: result.capRateBreakdown.commercialSurcharge,
        micro_correction:     result.capRateBreakdown.microCorrection,
        oev_correction:       result.capRateBreakdown.oevCorrection,
        location_category:    result.locationCategory,
        confidence:           result.confidence,
        notes:                valuationForm.notes || null,
        scenario:             "neutral",
      });

      if (!valuation) throw new Error("Bewertung konnte nicht gespeichert werden.");

      router.push(`/valuation/${valuation.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-950">
      {/* Minimal nav */}
      <nav className="border-b border-ink-800 bg-ink-900/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-forest-700 to-gold-500 flex items-center justify-center">
              <span className="text-ink-950 text-sm font-black">M</span>
            </div>
            <span className="font-display font-bold text-base text-ink-50 tracking-tight">
              MFH <span className="text-gold-500">Bewertung</span>
            </span>
          </Link>
          <Link href="/dashboard" className="text-ink-400 hover:text-ink-200 text-sm transition-colors">
            ← Dashboard
          </Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-10 pb-20">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-ink-50 mb-2">Neue Bewertung</h1>
          <p className="text-ink-400 text-sm">Erfassen Sie das Objekt Schritt für Schritt.</p>
        </div>

        {error && (
          <div className="mb-5 bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <FormWizard onComplete={handleComplete} saving={saving} />
      </main>
    </div>
  );
}
