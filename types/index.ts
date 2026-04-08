// ============================================================
// MFH Bewertung – TypeScript Type Definitions
// ============================================================

export type LocationCategory = "sehrStark" | "gut" | "durchschnitt" | "sekundaer";
export type ConditionType    = "sehr_gut" | "gut" | "mittel" | "renovations";
export type LocationRating   = "sehr_gut" | "gut" | "mittel" | "schwach";
export type ConfidenceLevel  = "High" | "Medium" | "Low";

// ── Database Row Types ───────────────────────────────────────
export interface Profile {
  id:         string;
  full_name:  string | null;
  company:    string | null;
  phone:      string | null;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id:              string;
  user_id:         string;
  name:            string;
  address:         string;
  city:            string;
  canton:          string;
  zip:             string | null;
  build_year:      number | null;
  condition:       ConditionType | null;
  num_units:       number | null;
  living_area:     number | null;
  commercial_area: number | null;
  created_at:      string;
  updated_at:      string;
}

export interface Valuation {
  id:                   string;
  property_id:          string;
  user_id:              string;
  rent_residential:     number;
  rent_commercial:      number;
  actual_rent:          number | null;
  vacancy_rate:         number;
  operating_costs:      number;
  maintenance_costs:    number;
  micro_location:       LocationRating | null;
  macro_location:       LocationRating | null;
  public_transport:     LocationRating | null;
  cap_rate:             number;
  gross_income:         number;
  effective_income:     number;
  net_income:           number | null;
  value_simple:         number;
  value_extended:       number | null;
  value_conservative:   number;
  value_optimistic:     number;
  base_cap_rate:        number | null;
  condition_delta:      number | null;
  commercial_surcharge: number | null;
  micro_correction:     number | null;
  oev_correction:       number | null;
  location_category:    string | null;
  confidence:           ConfidenceLevel | null;
  notes:                string | null;
  scenario:             string | null;
  created_at:           string;
  updated_at:           string;
}

export interface ValuationWithProperty extends Valuation {
  properties: Pick<Property, "name" | "address" | "city" | "canton">;
}

// ── Form State Types ─────────────────────────────────────────
export interface PropertyFormData {
  name:            string;
  address:         string;
  city:            string;
  canton:          string;
  zip:             string;
  build_year:      string;
  condition:       ConditionType;
  num_units:       string;
  living_area:     string;
  commercial_area: string;
}

export interface ValuationFormData {
  rent_residential:  string;
  rent_commercial:   string;
  actual_rent:       string;
  vacancy_rate:      string;
  operating_costs:   string;
  maintenance_costs: string;
  micro_location:    LocationRating;
  macro_location:    LocationRating;
  public_transport:  LocationRating;
  notes:             string;
}

export interface FullFormData {
  property: PropertyFormData;
  valuation: ValuationFormData;
}

// ── Calculation Result Types ─────────────────────────────────
export interface CapRateBreakdown {
  base:                number;
  conditionDelta:      number;
  commercialSurcharge: number;
  microCorrection:     number;
  oevCorrection:       number;
  final:               number;
}

export interface ValuationResult {
  grossIncome:       number;
  effectiveIncome:   number;
  netIncome:         number;
  capRateBreakdown:  CapRateBreakdown;
  valueSimple:       number;
  valueExtended:     number;
  valueConservative: number;
  valueOptimistic:   number;
  locationCategory:  LocationCategory;
  commercialShare:   number;
  residentialShare:  number;
  gwInfo:            string;
  confidence:        ConfidenceLevel;
  plausiText:        string;
}

// ── Municipality Mock Data ────────────────────────────────────
export interface Municipality {
  name:          string;
  canton:        string;
  population:    number;
  type:          string;
  locationClass: LocationCategory;
}
