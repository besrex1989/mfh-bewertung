export type LocationCategory = "sehrStark" | "gut" | "durchschnitt" | "sekundaer";
export type ConditionType    = "stufe1" | "stufe2" | "stufe3" | "stufe4" | "stufe5" | "stufe6";
export type LocationRating   = "sehr_gut" | "gut" | "mittel" | "schwach";
export type ConfidenceLevel  = "High" | "Medium" | "Low";

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
  renov_year:      number | null;
  build_quality:   string | null;
  condition:       string | null;
  num_units:       number | null;
  living_area:     number | null;
  commercial_area: number | null;
  commercial_units: number | null;
  // Wohnungsraster
  units_1z:        number | null;
  units_1_5z:      number | null;
  units_2z:        number | null;
  units_2_5z:      number | null;
  units_3z:        number | null;
  units_3_5z:      number | null;
  units_4z:        number | null;
  units_4_5z:      number | null;
  units_5z:        number | null;
  units_5plus:     number | null;
  created_at:      string;
  updated_at:      string;
}

export interface Valuation {
  id:                    string;
  property_id:           string;
  user_id:               string;
  rent_residential:      number; // Soll Wohnen
  rent_commercial:       number; // Soll Gewerbe
  rent_residential_actual: number | null; // Ist Wohnen
  rent_commercial_actual:  number | null; // Ist Gewerbe
  actual_rent:           number | null;
  vacancy_rate:          number;
  vacancy_avg5y:         number;
  operating_costs:       number;
  maintenance_costs:     number;
  aap_count:             number;
  ehp_count:             number;
  micro_location:        LocationRating | null;
  macro_location:        LocationRating | null;
  public_transport:      LocationRating | null;
  cap_rate:              number;
  gross_income:          number;
  effective_income:      number;
  net_income:            number | null;
  value_simple:          number;
  value_extended:        number | null;
  value_conservative:    number;
  value_optimistic:      number;
  base_cap_rate:         number | null;
  condition_delta:       number | null;
  commercial_surcharge:  number | null;
  micro_correction:      number | null;
  oev_correction:        number | null;
  location_category:     string | null;
  confidence:            ConfidenceLevel | null;
  notes:                 string | null;
  pros:                  string | null;
  cons:                  string | null;
  scenario:              string | null;
  created_at:            string;
  updated_at:            string;
}

export interface ValuationWithProperty extends Valuation {
  properties: Pick<Property, "name" | "address" | "city" | "canton">;
}

export interface ValuationResult {
  grossIncome:          number;
  effectiveIncome:      number;
  netIncome:            number;
  sustainableIncome:    number;
  parkingIncome:        number;
  substanzValue:        number;
  capRateBreakdown:     CapRateBreakdown;
  valueSimple:          number;
  valueSustainable:     number;
  valueExtended:        number;
  valueConservative:    number;
  valueOptimistic:      number;
  locationCategory:     LocationCategory;
  commercialShare:      number;
  residentialShare:     number;
  gwInfo:               string;
  confidence:           ConfidenceLevel;
  plausiText:           string;
  sollIstDiffWohnen:    number;
  sollIstDiffGewerbe:   number;
  hasUptidePotential:   boolean;
}

export interface CapRateBreakdown {
  riskFreeRate:        number;
  marketPremium:       number;
  macroDelta:          number;
  microDelta:          number;
  conditionDelta:      number;
  ageDelta:            number;
  qualityDelta:        number;
  commercialSurcharge: number;
  oevDelta:            number;
  base:                number;
  final:               number;
}

export interface Municipality {
  name:          string;
  canton:        string;
  population:    number;
  type:          string;
  locationClass: LocationCategory;
}