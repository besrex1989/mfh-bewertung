"use client";

import { useEffect, useRef } from "react";

interface AddressMapProps {
  lat: number;
  lon: number;
  label?: string;
  height?: number;
}

// Swiss geographic bounds check
function isInSwitzerland(lat: number, lon: number): boolean {
  return lat > 45.5 && lat < 48.0 && lon > 5.5 && lon < 11.0;
}

export default function AddressMap({ lat, lon, label, height = 280 }: AddressMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || !isInSwitzerland(lat, lon)) return;

    let cancelled = false;

    async function initMap() {
      // Dynamischer Import um SSR zu vermeiden
      const L = (await import("leaflet")).default;

      // Leaflet CSS laden
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      if (cancelled || !mapRef.current) return;

      // Custom marker icon
      const icon = L.divIcon({
        html: `<div style="background: #2563eb; width: 24px; height: 24px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        className: "",
      });

      if (!mapInstance.current) {
        mapInstance.current = L.map(mapRef.current, {
          center: [lat, lon],
          zoom: 17,
          zoomControl: true,
          scrollWheelZoom: false,
        });

        // swisstopo Pixelkarte farbig (offizielle Schweizer Karte)
        L.tileLayer("https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg", {
          attribution: '© <a href="https://www.swisstopo.admin.ch/">swisstopo</a>',
          maxZoom: 19,
        }).addTo(mapInstance.current);

        markerRef.current = L.marker([lat, lon], { icon }).addTo(mapInstance.current);
        if (label) {
          markerRef.current.bindPopup(label);
        }
      } else {
        mapInstance.current.setView([lat, lon], 17);
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lon]);
          if (label) markerRef.current.bindPopup(label);
        }
      }
    }

    initMap();

    return () => {
      cancelled = true;
    };
  }, [lat, lon, label]);

  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  if (!isInSwitzerland(lat, lon)) {
    return (
      <div
        style={{ height }}
        className="w-full bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center"
      >
        <p className="text-sm text-gray-400">Karte nur fuer Schweizer Adressen verfuegbar</p>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      style={{ height }}
      className="w-full rounded-xl overflow-hidden border border-gray-200 z-0"
    />
  );
}
