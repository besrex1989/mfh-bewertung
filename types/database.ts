// ============================================================
// Supabase Database Type Stubs
// For full auto-generated types run:
//   npx supabase gen types typescript --project-id <YOUR_PROJECT_ID> > types/database.ts
// ============================================================

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id:         string;
          full_name:  string | null;
          company:    string | null;
          phone:      string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      properties: {
        Row: {
          id:              string;
          user_id:         string;
          name:            string;
          address:         string;
          city:            string;
          canton:          string;
          zip:             string | null;
          build_year:      number | null;
          condition:       string | null;
          num_units:       number | null;
          living_area:     number | null;
          commercial_area: number | null;
          created_at:      string;
          updated_at:      string;
        };
        Insert: Omit<Database["public"]["Tables"]["properties"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["properties"]["Insert"]>;
      };
      valuations: {
        Row: {
          id:                   string;
          property_id:          string;
          user_id:              string;
          rent_residential:     number;
          rent_commercial:      number;
          actual_rent:          number | null;
          vacancy_rate:         number;
          operating_costs:      number;
          maintenance_costs:    number;
          micro_location:       string | null;
          macro_location:       string | null;
          public_transport:     string | null;
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
          confidence:           string | null;
          notes:                string | null;
          scenario:             string | null;
          created_at:           string;
          updated_at:           string;
        };
        Insert: Omit<Database["public"]["Tables"]["valuations"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["valuations"]["Insert"]>;
      };
    };
  };
};
