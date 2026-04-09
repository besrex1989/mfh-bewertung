"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { createProperty, createValuation } from "@/lib/db";
import FormWizard from "@/components/FormWizard";
import type { ValuationResult } from "@/types";
import Link from "next/link";

export default function NewValuationPage() {
  const router  = useRouter();
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  async function handleComplete(
    propertyForm: any,
    valuationForm: any,
    result: ValuationResult
  ) {
    setError("");
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      const property = await createProperty(user.id, {
        name:            propertyForm.name,
        address:         propertyForm.address,
        city:            propertyForm.city,
        canton:          propertyForm.canton,
        zip:             propertyForm.zip || null,
        build_year:      propertyForm.build_year  ? +propertyForm.build_year  : null,
        renov_year:      propertyForm.renov_year  ? +propertyForm.renov_year  : null,
        build_quality:   propertyForm.build_quality || "gut",
        condition:       propertyForm.condition,
        num_units:       propertyForm.num_units   ? +propertyForm.num_units   : null,
        living_area:     propertyForm.living_area ? +propertyForm.living_area : null,
        commercial_area: propertyForm.commercial_area ? +propertyForm.commercial_area : null,
        units_1z:    +propertyForm.units_1z    || 0,
        units_1_5z:  +propertyForm.units_1_5z  || 0,
        units_2z:    +propertyForm.units_2z    || 0,
        units_2_5z:  +propertyForm.units_2_5z  || 0,
        units_3z:    +propertyForm.units_3z    || 0,
        units_3_5z:  +propertyForm.units_3_5z  || 0,
        units_4z:    +propertyForm.units_4z    || 0,
        units_4_5z:  +propertyForm.units_4_5z  || 0,
        units_5z:    +propertyForm.units_5z    || 0,
        units_5plus: +propertyForm.units_5plus || 0,
      });

      if (!property) throw new Error("Objekt konnte nicht gespeichert werden.");

      const valuation = await createValuation(user.id, {
        property_id:              property.id,
        rent_residential:         +valuationForm.rent_residential || 0,
        rent_commercial:          +valuationForm.rent_commercial  || 0,
        rent_residential_actual:  valuationForm.rent_residential_actual ? +valuationForm.rent_residential_actual : null,
        rent_commercial_actual:   valuationForm.rent_commercial_actual  ? +valuationForm.rent_commercial_actual  : null,
        actual_rent:              null,
        vacancy_rate:             +valuationForm.vacancy_rate     || 0,
        vacancy_avg5y:            +valuationForm.vacancy_avg5y    || 0,
        operating_costs:          +valuationForm.operating_costs  || 0,
        maintenance_costs:        +valuationForm.maintenance_costs|| 0,
        aap_count:                +valuationForm.aap_count        || 0,
        ehp_count:                +valuationForm.ehp_count        || 0,
        micro_location:           valuationForm.micro_location,
        macro_location:           valuationForm.macro_location,
        public_transport:         valuationForm.public_transport,
        cap_rate:                 result.capRateBreakdown.final,
        gross_income:             result.grossIncome,
        effective_income:         result.effectiveIncome,
        net_income:               result.netIncome > 0 ? result.netIncome : null,
        value_simple:             result.valueSimple,
        value_extended:           result.valueExtended > 0 ? result.valueExtended : null,
        value_conservative:       result.valueConservative,
        value_optimistic:         result.valueOptimistic,
        base_cap_rate:            result.capRateBreakdown.base,
        condition_delta:          result.capRateBreakdown.conditionDelta,
        commercial_surcharge:     result.capRateBreakdown.commercialSurcharge,
        micro_correction:         result.capRateBreakdown.microDelta,
        oev_correction:           result.capRateBreakdown.oevDelta,
        location_category:        result.locationCategory,
        confidence:               result.confidence,
        notes:                    valuationForm.notes || null,
        scenario:                 "neutral",
      });

      if (!valuation) throw new Error("Bewertung konnte nicht gespeichert werden.");

      router.push(`/valuation/${valuation.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
              <span className="text-white text-sm font-black">M</span>
            </div>
            <span className="font-bold text-base text-gray-900">
              MFH <span className="text-blue-600">Bewertung</span>
            </span>
          </Link>
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-800 text-sm transition-colors">
            ← Dashboard
          </Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-10 pb-20">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Neue Bewertung</h1>
          <p className="text-gray-400 text-sm">Erfassen Sie das Objekt Schritt fuer Schritt.</p>
        </div>

        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <FormWizard onComplete={handleComplete} saving={saving} />
      </main>
    </div>
  );
}