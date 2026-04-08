// ============================================================
// MFH Bewertung – Datenbank CRUD Funktionen
// ============================================================

import { supabase } from "@/lib/supabaseClient";
import type { Property, Valuation, ValuationWithProperty, Profile } from "@/types";

// ── Profile ─────────────────────────────────────────────────
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) { console.error("getProfile:", error); return null; }
  return data as Profile;
}

export async function upsertProfile(
  userId: string,
  updates: { full_name?: string; company?: string; phone?: string }
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...updates }, { onConflict: "id" })
    .select()
    .single();
  if (error) { console.error("upsertProfile:", error); return null; }
  return data as Profile;
}

// ── Properties ───────────────────────────────────────────────
export async function getProperties(userId: string): Promise<Property[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) { console.error("getProperties:", error); return []; }
  return (data ?? []) as Property[];
}

export async function getProperty(id: string): Promise<Property | null> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single();
  if (error) { console.error("getProperty:", error); return null; }
  return data as Property;
}

export async function createProperty(
  userId: string,
  property: Omit<Property, "id" | "user_id" | "created_at" | "updated_at">
): Promise<Property | null> {
  const { data, error } = await supabase
    .from("properties")
    .insert({ ...property, user_id: userId })
    .select()
    .single();
  if (error) { console.error("createProperty:", error); return null; }
  return data as Property;
}

export async function updateProperty(
  id: string,
  updates: Partial<Omit<Property, "id" | "user_id" | "created_at">>
): Promise<Property | null> {
  const { data, error } = await supabase
    .from("properties")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) { console.error("updateProperty:", error); return null; }
  return data as Property;
}

export async function deleteProperty(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", id);
  if (error) { console.error("deleteProperty:", error); return false; }
  return true;
}

// ── Valuations ───────────────────────────────────────────────
export async function getValuations(userId: string): Promise<ValuationWithProperty[]> {
  const { data, error } = await supabase
    .from("valuations")
    .select(`*, properties(name, address, city, canton)`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) { console.error("getValuations:", error); return []; }
  return (data ?? []) as ValuationWithProperty[];
}

export async function getValuation(id: string): Promise<ValuationWithProperty | null> {
  const { data, error } = await supabase
    .from("valuations")
    .select(`*, properties(name, address, city, canton)`)
    .eq("id", id)
    .single();
  if (error) { console.error("getValuation:", error); return null; }
  return data as ValuationWithProperty;
}

export async function getValuationsForProperty(propertyId: string): Promise<Valuation[]> {
  const { data, error } = await supabase
    .from("valuations")
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });
  if (error) { console.error("getValuationsForProperty:", error); return []; }
  return (data ?? []) as Valuation[];
}

export async function createValuation(
  userId: string,
  valuation: Omit<Valuation, "id" | "user_id" | "created_at" | "updated_at">
): Promise<Valuation | null> {
  const { data, error } = await supabase
    .from("valuations")
    .insert({ ...valuation, user_id: userId })
    .select()
    .single();
  if (error) { console.error("createValuation:", error); return null; }
  return data as Valuation;
}

export async function updateValuation(
  id: string,
  updates: Partial<Omit<Valuation, "id" | "user_id" | "created_at">>
): Promise<Valuation | null> {
  const { data, error } = await supabase
    .from("valuations")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) { console.error("updateValuation:", error); return null; }
  return data as Valuation;
}

export async function deleteValuation(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("valuations")
    .delete()
    .eq("id", id);
  if (error) { console.error("deleteValuation:", error); return false; }
  return true;
}
