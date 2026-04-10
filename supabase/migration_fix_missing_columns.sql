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

-- SCHRITT 1: ALLE Check-Constraints auf properties entfernen
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.properties'::regclass
    AND contype = 'c'
  ) LOOP
    EXECUTE 'ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
  END LOOP;
END $$;

-- SCHRITT 2: Alte Werte konvertieren
UPDATE public.properties SET condition = 'stufe5' WHERE condition = 'sehr_gut';
UPDATE public.properties SET condition = 'stufe4' WHERE condition = 'gut';
UPDATE public.properties SET condition = 'stufe3' WHERE condition = 'mittel';
UPDATE public.properties SET condition = 'stufe2' WHERE condition = 'renovations';
UPDATE public.properties SET condition = 'stufe4' WHERE condition IS NOT NULL
  AND condition NOT IN ('stufe1','stufe2','stufe3','stufe4','stufe5','stufe6');

-- SCHRITT 3: Neuen Constraint setzen
ALTER TABLE public.properties
  ADD CONSTRAINT properties_condition_check
  CHECK (condition IN ('stufe1','stufe2','stufe3','stufe4','stufe5','stufe6'));

-- ── VALUATIONS: Fehlende Spalten ────────────────────────────
ALTER TABLE public.valuations
  ADD COLUMN IF NOT EXISTS rent_residential_actual NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS rent_commercial_actual  NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS vacancy_avg5y           NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aap_count               INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ehp_count               INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pros                    TEXT,
  ADD COLUMN IF NOT EXISTS cons                    TEXT;
