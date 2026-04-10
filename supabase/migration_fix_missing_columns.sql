-- ============================================================
-- Migration: Fehlende Spalten hinzufuegen
-- Dieses Script im Supabase SQL Editor ausfuehren,
-- falls die Tabellen bereits existieren.
-- ============================================================

-- ── PROPERTIES: Fehlende Spalten ────────────────────────────
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS renov_year    INTEGER,
  ADD COLUMN IF NOT EXISTS build_quality TEXT DEFAULT 'gut',
  ADD COLUMN IF NOT EXISTS units_1z     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS units_1_5z   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS units_2z     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS units_2_5z   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS units_3z     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS units_3_5z   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS units_4z     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS units_4_5z   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS units_5z     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS units_5plus  INTEGER DEFAULT 0;

-- Condition CHECK-Constraint aktualisieren (stufe1-stufe6 statt sehr_gut/gut/mittel/renovations)
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_condition_check;
ALTER TABLE public.properties
  ADD CONSTRAINT properties_condition_check
  CHECK (condition IN ('stufe1','stufe2','stufe3','stufe4','stufe5','stufe6'));

-- ── VALUATIONS: Fehlende Spalten ────────────────────────────
ALTER TABLE public.valuations
  ADD COLUMN IF NOT EXISTS rent_residential_actual NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS rent_commercial_actual  NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS vacancy_avg5y           NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aap_count               INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ehp_count               INTEGER NOT NULL DEFAULT 0;
