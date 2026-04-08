import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title:       "MFH Bewertung Schweiz",
  description: "Indikative Bewertung von Mehrfamilienhäusern in der Schweiz — Ertragswertbasiert",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=DM+Sans:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-ink-950 text-ink-100 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
