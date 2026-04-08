// ============================================================
// Schweizer Gemeindedaten (BFS Mock)
// TODO: Ersetzen durch echte BFS CSV/API Anbindung
//       https://www.bfs.admin.ch/bfs/de/home/grundlagen/agvch.html
// ============================================================

import type { Municipality } from "@/types";

export const MUNICIPALITIES: Municipality[] = [
  { name: "Zürich",        canton: "ZH", population: 430000, type: "Grossstadt",      locationClass: "sehrStark" },
  { name: "Genf",          canton: "GE", population: 203000, type: "Grossstadt",      locationClass: "sehrStark" },
  { name: "Basel",         canton: "BS", population: 178000, type: "Grossstadt",      locationClass: "sehrStark" },
  { name: "Bern",          canton: "BE", population: 134000, type: "Grossstadt",      locationClass: "sehrStark" },
  { name: "Lausanne",      canton: "VD", population: 140000, type: "Grossstadt",      locationClass: "sehrStark" },
  { name: "Zug",           canton: "ZG", population: 31000,  type: "Stadt",           locationClass: "sehrStark" },
  { name: "Küsnacht",      canton: "ZH", population: 14000,  type: "Agglomeration",   locationClass: "sehrStark" },
  { name: "Winterthur",    canton: "ZH", population: 115000, type: "Stadt",           locationClass: "gut" },
  { name: "Luzern",        canton: "LU", population: 82000,  type: "Stadt",           locationClass: "gut" },
  { name: "St. Gallen",    canton: "SG", population: 76000,  type: "Stadt",           locationClass: "gut" },
  { name: "Biel/Bienne",   canton: "BE", population: 56000,  type: "Stadt",           locationClass: "gut" },
  { name: "Thun",          canton: "BE", population: 44000,  type: "Stadt",           locationClass: "gut" },
  { name: "Davos",         canton: "GR", population: 11000,  type: "Touristisch",     locationClass: "gut" },
  { name: "Verbier",       canton: "VS", population: 3500,   type: "Touristisch",     locationClass: "gut" },
  { name: "Köniz",         canton: "BE", population: 42000,  type: "Agglomeration",   locationClass: "gut" },
  { name: "Uster",         canton: "ZH", population: 36000,  type: "Agglomeration",   locationClass: "gut" },
  { name: "Frauenfeld",    canton: "TG", population: 25000,  type: "Mittelgross",     locationClass: "durchschnitt" },
  { name: "Burgdorf",      canton: "BE", population: 16000,  type: "Mittelgross",     locationClass: "durchschnitt" },
  { name: "Olten",         canton: "SO", population: 18000,  type: "Mittelgross",     locationClass: "durchschnitt" },
  { name: "Reinach",       canton: "AG", population: 9000,   type: "Mittelgross",     locationClass: "durchschnitt" },
  { name: "Sursee",        canton: "LU", population: 10000,  type: "Mittelgross",     locationClass: "durchschnitt" },
  { name: "Langnau",       canton: "BE", population: 9000,   type: "Kleine Gemeinde", locationClass: "sekundaer" },
  { name: "Sumiswald",     canton: "BE", population: 5000,   type: "Ländlich",        locationClass: "sekundaer" },
  { name: "Schwarzenburg",  canton: "BE", population: 6000,  type: "Kleine Gemeinde", locationClass: "sekundaer" },
];

export const KANTONE = [
  "AG","AI","AR","BE","BL","BS","FR","GE","GL","GR",
  "JU","LU","NE","NW","OW","SG","SH","SO","SZ","TG",
  "TI","UR","VD","VS","ZG","ZH",
];

export function findMunicipality(name: string): Municipality | undefined {
  return MUNICIPALITIES.find(
    (m) => m.name.toLowerCase() === name.toLowerCase()
  );
}
