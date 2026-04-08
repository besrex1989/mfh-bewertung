# MFH Bewertung Schweiz

Produktionsreife WebApp für die indikative Bewertung von Mehrfamilienhäusern in der Schweiz.
Ertragswertbasiert · Supabase Backend · Next.js 14 · Vercel-deploybar.

---

## Tech Stack

| Layer     | Technologie                          |
|-----------|--------------------------------------|
| Frontend  | Next.js 14 (App Router), TypeScript  |
| UI        | Tailwind CSS                         |
| Backend   | Supabase (Auth + PostgreSQL)         |
| PDF       | pdf-lib (serverseitig)               |
| Hosting   | Vercel                               |

---

## Schnellstart (lokal)

### 1. Repository klonen

```bash
git clone https://github.com/DEIN_USERNAME/mfh-bewertung-schweiz.git
cd mfh-bewertung-schweiz
```

### 2. Dependencies installieren

```bash
npm install
```

### 3. Supabase Projekt einrichten

#### a) Supabase Account erstellen
→ https://supabase.com → „New Project" → Name und Passwort wählen

#### b) SQL Schema ausführen

Im Supabase Dashboard:
1. Linke Sidebar → **SQL Editor**
2. Inhalt von `supabase/schema.sql` vollständig kopieren
3. Einfügen und **Run** klicken

Das Schema erstellt:
- `profiles` — Maklerprofile
- `properties` — Objekte
- `valuations` — Bewertungen
- Row Level Security (RLS) für alle Tabellen
- Auto-Trigger für `updated_at` und Profil-Erstellung

#### c) API Keys abrufen

Im Supabase Dashboard:
1. Linke Sidebar → **Project Settings** → **API**
2. Kopieren:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` Key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. Environment Variables

```bash
cp .env.local.example .env.local
```

Datei `.env.local` öffnen und ausfüllen:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5. App starten

```bash
npm run dev
```

→ App läuft auf http://localhost:3000

---

## App-Struktur

```
mfh-bewertung-schweiz/
├── app/
│   ├── page.tsx                  # Landing Page
│   ├── layout.tsx                # Root Layout
│   ├── globals.css               # Tailwind + Custom Styles
│   ├── auth/
│   │   ├── login/page.tsx        # Login
│   │   └── register/page.tsx     # Registrierung
│   ├── dashboard/page.tsx        # Übersicht aller Bewertungen
│   ├── new/page.tsx              # Neue Bewertung (Wizard)
│   ├── valuation/[id]/page.tsx   # Bewertungsdetail + PDF
│   └── api/pdf/route.ts          # PDF API Route
├── components/
│   ├── FormWizard.tsx            # 4-Schritt Eingabe-Wizard
│   ├── ResultCard.tsx            # Ergebnis-Darstellung
│   ├── ScenarioTable.tsx         # Szenario-Tabelle (konservativ/neutral/optimistisch)
│   ├── Navbar.tsx                # Navigation
│   └── PDFDownloadButton.tsx     # Client-side PDF Download
├── lib/
│   ├── supabaseClient.ts         # Supabase Initialisierung
│   ├── calculations.ts           # Bewertungslogik (Ertragswertmethode)
│   ├── db.ts                     # CRUD Funktionen
│   └── municipalities.ts         # BFS Mock-Daten (Gemeinden)
├── utils/
│   └── pdfGenerator.ts           # PDF-Generierung (pdf-lib)
├── types/
│   ├── index.ts                  # App-Typen
│   └── database.ts               # Supabase DB-Typen
├── supabase/
│   └── schema.sql                # Vollständiges DB Schema
├── middleware.ts                 # Auth-Middleware (Route Protection)
├── tailwind.config.ts
├── .env.local.example
└── README.md
```

---

## Bewertungslogik

Die App verwendet das **Ertragswertverfahren**:

```
Indikativer Marktwert = Effektiver Jahresertrag / Kapitalisierungssatz
```

**Kapitalisierungssatz-Herleitung:**

| Lagekategorie       | Basis-Satz     |
|---------------------|----------------|
| Sehr starke Lage    | 3,00 – 3,40 %  |
| Gute Lage           | 3,40 – 3,90 %  |
| Durchschnittliche Lage | 3,90 – 4,40 % |
| Sekundäre Lage      | 4,40 – 5,00 %  |

Korrekturen: Zustand (±0.10–0.30%), Gewerbeanteil (+0.00–0.30%), Mikrolage (±0.05%), ÖV (±0.05%)

---

## Deployment auf Vercel

### 1. GitHub Push

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/DEIN_USERNAME/mfh-bewertung-schweiz.git
git push -u origin main
```

### 2. Vercel verbinden

1. → https://vercel.com → **New Project**
2. GitHub Repository importieren
3. **Environment Variables** in Vercel Settings eintragen:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Deploy** klicken

### 3. Supabase Site URL konfigurieren

Im Supabase Dashboard:
1. **Authentication** → **URL Configuration**
2. **Site URL** → Ihre Vercel-URL eintragen: `https://mfh-bewertung.vercel.app`
3. **Redirect URLs** → `https://mfh-bewertung.vercel.app/**` hinzufügen

---

## Supabase CLI (optional, für Auto-Types)

```bash
npm install -g supabase
supabase login
supabase gen types typescript --project-id DEIN_PROJECT_ID > types/database.ts
```

---

## Weiterentwicklung

### BFS-Daten integrieren
→ `/lib/municipalities.ts` → `MUNICIPALITIES` Array durch echte BFS-CSV-Daten ersetzen.
→ BFS Gemeindetypen: https://www.bfs.admin.ch/bfs/de/home/grundlagen/agvch.html

### Bewertungsparameter anpassen
→ `/lib/calculations.ts` → `VALUATION_CONFIG` Objekt

### Neue Felder hinzufügen
1. SQL: `ALTER TABLE properties ADD COLUMN ...;`
2. TypeScript: `/types/index.ts` und `/types/database.ts` aktualisieren
3. UI: `/components/FormWizard.tsx`

---

## Lokale Befehle

```bash
npm run dev      # Entwicklungsserver (http://localhost:3000)
npm run build    # Production Build
npm run start    # Production Server
npm run lint     # ESLint
```

---

## Rechtlicher Hinweis

Die App generiert **indikative, modellbasierte Schätzungen**.
Sie ersetzt keine vollständige Verkehrswertschätzung, keine hedonische Bewertung
und kein gerichtsfestes Gutachten. Alle Angaben ohne Gewähr.
