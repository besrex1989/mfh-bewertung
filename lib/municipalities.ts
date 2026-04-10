// ============================================================
// Schweizer Gemeindedaten
// Kuratierte Liste + dynamischer API-Fallback via Nominatim
// ============================================================

import type { Municipality, LocationCategory } from "@/types";

// ── Kuratierte Premium-/Sonderfaelle ────────────────────────
// Gemeinden mit besonderer Klassifikation die nicht rein aus
// der Einwohnerzahl abgeleitet werden kann
const CURATED: Municipality[] = [
  // ── sehrStark: Grossstaedte + Premium ──
  { name: "Zürich",          canton: "ZH", population: 430000, type: "Grossstadt",    locationClass: "sehrStark" },
  { name: "Genf",            canton: "GE", population: 203000, type: "Grossstadt",    locationClass: "sehrStark" },
  { name: "Basel",           canton: "BS", population: 178000, type: "Grossstadt",    locationClass: "sehrStark" },
  { name: "Lausanne",        canton: "VD", population: 140000, type: "Grossstadt",    locationClass: "sehrStark" },
  { name: "Bern",            canton: "BE", population: 134000, type: "Grossstadt",    locationClass: "sehrStark" },
  { name: "Luzern",          canton: "LU", population: 82000,  type: "Stadt",         locationClass: "sehrStark" },
  { name: "Zug",             canton: "ZG", population: 31000,  type: "Stadt",         locationClass: "sehrStark" },
  // Premium Agglo ZH
  { name: "Küsnacht",        canton: "ZH", population: 14000,  type: "Agglomeration", locationClass: "sehrStark" },
  { name: "Zollikon",        canton: "ZH", population: 13000,  type: "Agglomeration", locationClass: "sehrStark" },
  { name: "Kilchberg",       canton: "ZH", population: 9000,   type: "Agglomeration", locationClass: "sehrStark" },
  { name: "Rüschlikon",      canton: "ZH", population: 6000,   type: "Agglomeration", locationClass: "sehrStark" },
  { name: "Erlenbach",       canton: "ZH", population: 6000,   type: "Agglomeration", locationClass: "sehrStark" },
  { name: "Herrliberg",      canton: "ZH", population: 6000,   type: "Agglomeration", locationClass: "sehrStark" },
  { name: "Meilen",          canton: "ZH", population: 14000,  type: "Agglomeration", locationClass: "sehrStark" },
  { name: "Thalwil",         canton: "ZH", population: 18000,  type: "Agglomeration", locationClass: "sehrStark" },
  { name: "Horgen",          canton: "ZH", population: 24000,  type: "Agglomeration", locationClass: "sehrStark" },
  // Premium Agglo ZG/SZ
  { name: "Baar",            canton: "ZG", population: 25000,  type: "Agglomeration", locationClass: "sehrStark" },
  { name: "Cham",            canton: "ZG", population: 17000,  type: "Agglomeration", locationClass: "sehrStark" },
  { name: "Wollerau",        canton: "SZ", population: 8000,   type: "Agglomeration", locationClass: "sehrStark" },
  { name: "Freienbach",      canton: "SZ", population: 16000,  type: "Agglomeration", locationClass: "sehrStark" },
  { name: "Feusisberg",      canton: "SZ", population: 5000,   type: "Agglomeration", locationClass: "sehrStark" },
  // Premium GE/VD
  { name: "Carouge",         canton: "GE", population: 23000,  type: "Agglomeration", locationClass: "sehrStark" },
  { name: "Lancy",           canton: "GE", population: 33000,  type: "Agglomeration", locationClass: "sehrStark" },
  { name: "Vernier",         canton: "GE", population: 35000,  type: "Agglomeration", locationClass: "sehrStark" },
  { name: "Onex",            canton: "GE", population: 19000,  type: "Agglomeration", locationClass: "sehrStark" },
  { name: "Meyrin",          canton: "GE", population: 26000,  type: "Agglomeration", locationClass: "sehrStark" },
  { name: "Pully",           canton: "VD", population: 18000,  type: "Agglomeration", locationClass: "sehrStark" },
  { name: "Morges",          canton: "VD", population: 16000,  type: "Agglomeration", locationClass: "sehrStark" },
  { name: "Nyon",            canton: "VD", population: 21000,  type: "Stadt",         locationClass: "sehrStark" },
  // Premium BS/BL
  { name: "Riehen",          canton: "BS", population: 21000,  type: "Agglomeration", locationClass: "sehrStark" },
  { name: "Binningen",       canton: "BL", population: 16000,  type: "Agglomeration", locationClass: "sehrStark" },
  { name: "Bottmingen",      canton: "BL", population: 7000,   type: "Agglomeration", locationClass: "sehrStark" },

  // ── gut: Staedte + gute Agglo + Tourismus ──
  { name: "Winterthur",      canton: "ZH", population: 115000, type: "Stadt",         locationClass: "gut" },
  { name: "St. Gallen",      canton: "SG", population: 76000,  type: "Stadt",         locationClass: "gut" },
  { name: "Biel/Bienne",     canton: "BE", population: 56000,  type: "Stadt",         locationClass: "gut" },
  { name: "Thun",            canton: "BE", population: 44000,  type: "Stadt",         locationClass: "gut" },
  { name: "Köniz",           canton: "BE", population: 42000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Fribourg",        canton: "FR", population: 38000,  type: "Stadt",         locationClass: "gut" },
  { name: "Schaffhausen",    canton: "SH", population: 37000,  type: "Stadt",         locationClass: "gut" },
  { name: "Uster",           canton: "ZH", population: 36000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Chur",            canton: "GR", population: 38000,  type: "Stadt",         locationClass: "gut" },
  { name: "Rapperswil-Jona", canton: "SG", population: 27000,  type: "Stadt",         locationClass: "gut" },
  { name: "Dübendorf",       canton: "ZH", population: 30000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Dietikon",        canton: "ZH", population: 28000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Wädenswil",       canton: "ZH", population: 25000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Kloten",          canton: "ZH", population: 20000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Opfikon",         canton: "ZH", population: 21000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Wallisellen",     canton: "ZH", population: 17000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Illnau-Effretikon", canton: "ZH", population: 17000, type: "Agglomeration", locationClass: "gut" },
  { name: "Bülach",          canton: "ZH", population: 22000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Regensdorf",      canton: "ZH", population: 18000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Adliswil",        canton: "ZH", population: 19000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Volketswil",      canton: "ZH", population: 19000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Wettingen",       canton: "AG", population: 21000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Baden",           canton: "AG", population: 19000,  type: "Stadt",         locationClass: "gut" },
  { name: "Aarau",           canton: "AG", population: 22000,  type: "Stadt",         locationClass: "gut" },
  { name: "Solothurn",       canton: "SO", population: 17000,  type: "Stadt",         locationClass: "gut" },
  { name: "Olten",           canton: "SO", population: 18000,  type: "Stadt",         locationClass: "gut" },
  { name: "Emmen",           canton: "LU", population: 31000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Kriens",          canton: "LU", population: 28000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Horw",            canton: "LU", population: 14000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Ebikon",          canton: "LU", population: 14000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Muri bei Bern",   canton: "BE", population: 13000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Ostermundigen",   canton: "BE", population: 18000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Spiegel bei Bern", canton: "BE", population: 11000, type: "Agglomeration", locationClass: "gut" },
  { name: "Ittigen",         canton: "BE", population: 12000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Worb",            canton: "BE", population: 12000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Steffisburg",     canton: "BE", population: 16000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Spiez",           canton: "BE", population: 13000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Bellinzona",      canton: "TI", population: 44000,  type: "Stadt",         locationClass: "gut" },
  { name: "Lugano",          canton: "TI", population: 63000,  type: "Stadt",         locationClass: "gut" },
  { name: "Locarno",         canton: "TI", population: 16000,  type: "Stadt",         locationClass: "gut" },
  { name: "Mendrisio",       canton: "TI", population: 15000,  type: "Stadt",         locationClass: "gut" },
  { name: "Neuchâtel",       canton: "NE", population: 34000,  type: "Stadt",         locationClass: "gut" },
  { name: "La Chaux-de-Fonds", canton: "NE", population: 37000, type: "Stadt",        locationClass: "gut" },
  { name: "Yverdon-les-Bains", canton: "VD", population: 31000, type: "Stadt",        locationClass: "gut" },
  { name: "Vevey",           canton: "VD", population: 20000,  type: "Stadt",         locationClass: "gut" },
  { name: "Montreux",        canton: "VD", population: 26000,  type: "Stadt",         locationClass: "gut" },
  { name: "Renens",          canton: "VD", population: 22000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Ecublens",        canton: "VD", population: 14000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Prilly",          canton: "VD", population: 12000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Allschwil",       canton: "BL", population: 21000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Reinach",         canton: "BL", population: 19000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Muttenz",         canton: "BL", population: 18000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Pratteln",        canton: "BL", population: 16000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Liestal",         canton: "BL", population: 14000,  type: "Stadt",         locationClass: "gut" },
  { name: "Arth",            canton: "SZ", population: 12000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Schwyz",          canton: "SZ", population: 16000,  type: "Stadt",         locationClass: "gut" },
  { name: "Wil",             canton: "SG", population: 24000,  type: "Stadt",         locationClass: "gut" },
  { name: "Gossau",          canton: "SG", population: 19000,  type: "Agglomeration", locationClass: "gut" },
  { name: "Herisau",         canton: "AR", population: 16000,  type: "Stadt",         locationClass: "gut" },
  { name: "Kreuzlingen",     canton: "TG", population: 23000,  type: "Stadt",         locationClass: "gut" },
  { name: "Frauenfeld",      canton: "TG", population: 25000,  type: "Stadt",         locationClass: "gut" },
  { name: "Sierre",          canton: "VS", population: 17000,  type: "Stadt",         locationClass: "gut" },
  { name: "Sion",            canton: "VS", population: 35000,  type: "Stadt",         locationClass: "gut" },
  { name: "Martigny",        canton: "VS", population: 18000,  type: "Stadt",         locationClass: "gut" },
  { name: "Brig-Glis",       canton: "VS", population: 13000,  type: "Stadt",         locationClass: "gut" },
  { name: "Delémont",        canton: "JU", population: 12000,  type: "Stadt",         locationClass: "gut" },
  { name: "Sarnen",          canton: "OW", population: 10000,  type: "Stadt",         locationClass: "gut" },
  { name: "Stans",           canton: "NW", population: 8000,   type: "Stadt",         locationClass: "gut" },
  { name: "Altdorf",         canton: "UR", population: 9000,   type: "Stadt",         locationClass: "gut" },
  { name: "Glarus",          canton: "GL", population: 13000,  type: "Stadt",         locationClass: "gut" },
  { name: "Appenzell",       canton: "AI", population: 6000,   type: "Stadt",         locationClass: "gut" },
  // Tourismus
  { name: "Davos",           canton: "GR", population: 11000,  type: "Touristisch",   locationClass: "gut" },
  { name: "St. Moritz",      canton: "GR", population: 5000,   type: "Touristisch",   locationClass: "gut" },
  { name: "Verbier",         canton: "VS", population: 3500,   type: "Touristisch",   locationClass: "gut" },
  { name: "Zermatt",         canton: "VS", population: 5800,   type: "Touristisch",   locationClass: "gut" },
  { name: "Interlaken",      canton: "BE", population: 6000,   type: "Touristisch",   locationClass: "gut" },
  { name: "Grindelwald",     canton: "BE", population: 4000,   type: "Touristisch",   locationClass: "gut" },
  { name: "Gstaad",          canton: "BE", population: 3500,   type: "Touristisch",   locationClass: "gut" },
  { name: "Crans-Montana",   canton: "VS", population: 6000,   type: "Touristisch",   locationClass: "gut" },
  { name: "Ascona",          canton: "TI", population: 5500,   type: "Touristisch",   locationClass: "gut" },
  { name: "Arosa",           canton: "GR", population: 3200,   type: "Touristisch",   locationClass: "gut" },
  { name: "Laax",            canton: "GR", population: 1600,   type: "Touristisch",   locationClass: "gut" },
  { name: "Flims",           canton: "GR", population: 3000,   type: "Touristisch",   locationClass: "gut" },
  { name: "Engelberg",       canton: "OW", population: 4200,   type: "Touristisch",   locationClass: "gut" },
  { name: "Wengen",          canton: "BE", population: 1300,   type: "Touristisch",   locationClass: "gut" },
  { name: "Lenzerheide",     canton: "GR", population: 2500,   type: "Touristisch",   locationClass: "gut" },
  { name: "Saas-Fee",        canton: "VS", population: 1700,   type: "Touristisch",   locationClass: "gut" },
  { name: "Klosters",        canton: "GR", population: 4000,   type: "Touristisch",   locationClass: "gut" },
  { name: "Pontresina",      canton: "GR", population: 2000,   type: "Touristisch",   locationClass: "gut" },
  { name: "Adelboden",       canton: "BE", population: 3500,   type: "Touristisch",   locationClass: "gut" },
  { name: "Kandersteg",      canton: "BE", population: 1300,   type: "Touristisch",   locationClass: "gut" },
  { name: "Mürren",          canton: "BE", population: 450,    type: "Touristisch",   locationClass: "gut" },
];

// ── Dynamische Klassifikation ───────────────────────────────
// Fuer Gemeinden die NICHT in der kuratierten Liste sind
function classifyByPopulation(population: number): { type: string; locationClass: LocationCategory } {
  if (population >= 100000) return { type: "Grossstadt",      locationClass: "sehrStark" };
  if (population >= 50000)  return { type: "Stadt",           locationClass: "gut" };
  if (population >= 20000)  return { type: "Stadt",           locationClass: "gut" };
  if (population >= 10000)  return { type: "Agglomeration",   locationClass: "durchschnitt" };
  if (population >= 5000)   return { type: "Mittelgross",     locationClass: "durchschnitt" };
  if (population >= 2000)   return { type: "Kleine Gemeinde", locationClass: "sekundaer" };
  return                           { type: "Ländlich",        locationClass: "sekundaer" };
}

// ── Dynamischer Cache ───────────────────────────────────────
// Speichert via API aufgeloeste Gemeinden fuer die Session
const dynamicCache = new Map<string, Municipality>();

// ── Oeffentliches API ───────────────────────────────────────
export const MUNICIPALITIES = CURATED;

export const KANTONE = [
  "AG","AI","AR","BE","BL","BS","FR","GE","GL","GR",
  "JU","LU","NE","NW","OW","SG","SH","SO","SZ","TG",
  "TI","UR","VD","VS","ZG","ZH",
];

export function findMunicipality(name: string): Municipality | undefined {
  // 1. Kuratierte Liste pruefen
  const found = CURATED.find(m => m.name.toLowerCase() === name.toLowerCase());
  if (found) return found;

  // 2. Dynamischer Cache pruefen
  const cached = dynamicCache.get(name.toLowerCase());
  if (cached) return cached;

  return undefined;
}

// Async: Gemeinde via Nominatim API aufloesen (mit Einwohnerzahl)
export async function lookupMunicipality(cityName: string, canton?: string): Promise<Municipality | null> {
  // Zuerst lokale Liste pruefen
  const local = findMunicipality(cityName);
  if (local) return local;

  try {
    const q = canton
      ? `${cityName}, ${canton}, Switzerland`
      : `${cityName}, Switzerland`;
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=de&extratags=1`,
      { headers: { "User-Agent": "MFH-Bewertung-Schweiz/1.0" } }
    );
    const data = await res.json();
    if (!data || data.length === 0) return null;

    const item = data[0];
    const pop = parseInt(item.extratags?.population ?? "0", 10);
    if (pop <= 0) return null;

    const { type, locationClass } = classifyByPopulation(pop);
    const muni: Municipality = {
      name: cityName,
      canton: canton ?? "",
      population: pop,
      type,
      locationClass,
    };

    // In Cache speichern
    dynamicCache.set(cityName.toLowerCase(), muni);
    return muni;
  } catch (e) {
    console.error("lookupMunicipality error:", e);
    return null;
  }
}
