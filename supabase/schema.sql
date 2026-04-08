-- ============================================================
-- MFH Bewertung Schweiz – Supabase SQL Schema
-- Dieses Script im Supabase SQL Editor ausführen
-- ============================================================

-- ── EXTENSIONS ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── PROFILES (extends auth.users) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  company     TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── PROPERTIES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.properties (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  address      TEXT NOT NULL,
  city         TEXT NOT NULL,
  canton       TEXT NOT NULL,
  zip          TEXT,
  build_year   INTEGER,
  condition    TEXT CHECK (condition IN ('sehr_gut','gut','mittel','renovations')),
  num_units    INTEGER,
  living_area  NUMERIC(10,2),
  commercial_area NUMERIC(10,2),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own properties"
  ON public.properties FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── VALUATIONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.valuations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id       UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Ertragsdaten
  rent_residential  NUMERIC(14,2) NOT NULL DEFAULT 0,
  rent_commercial   NUMERIC(14,2) NOT NULL DEFAULT 0,
  actual_rent       NUMERIC(14,2),
  vacancy_rate      NUMERIC(5,2)  NOT NULL DEFAULT 0,
  operating_costs   NUMERIC(14,2) NOT NULL DEFAULT 0,
  maintenance_costs NUMERIC(14,2) NOT NULL DEFAULT 0,

  -- Lagefaktoren
  micro_location    TEXT CHECK (micro_location IN ('sehr_gut','gut','mittel','schwach')),
  macro_location    TEXT CHECK (macro_location IN ('sehr_gut','gut','mittel','schwach')),
  public_transport  TEXT CHECK (public_transport IN ('sehr_gut','gut','mittel','schwach')),

  -- Berechnungsresultate
  cap_rate          NUMERIC(6,4)  NOT NULL,
  gross_income      NUMERIC(14,2) NOT NULL,
  effective_income  NUMERIC(14,2) NOT NULL,
  net_income        NUMERIC(14,2),
  value_simple      NUMERIC(14,2) NOT NULL,
  value_extended    NUMERIC(14,2),
  value_conservative NUMERIC(14,2),
  value_optimistic  NUMERIC(14,2),

  -- Kapitalisierungssatz-Herleitung
  base_cap_rate     NUMERIC(6,4),
  condition_delta   NUMERIC(6,4),
  commercial_surcharge NUMERIC(6,4),
  micro_correction  NUMERIC(6,4),
  oev_correction    NUMERIC(6,4),

  -- Lageklasse
  location_category TEXT,
  confidence        TEXT CHECK (confidence IN ('High','Medium','Low')),

  -- Notizen
  notes             TEXT,
  scenario          TEXT DEFAULT 'neutral',

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.valuations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own valuations"
  ON public.valuations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── UPDATED_AT TRIGGER ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_valuations_updated_at
  BEFORE UPDATE ON public.valuations
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- ── INDEXES ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON public.properties(user_id);
CREATE INDEX IF NOT EXISTS idx_valuations_property_id ON public.valuations(property_id);
CREATE INDEX IF NOT EXISTS idx_valuations_user_id ON public.valuations(user_id);
CREATE INDEX IF NOT EXISTS idx_valuations_created_at ON public.valuations(created_at DESC);
