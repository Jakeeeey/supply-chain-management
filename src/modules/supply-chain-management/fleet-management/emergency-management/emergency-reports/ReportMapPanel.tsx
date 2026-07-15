"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useEffect } from "react";

// Fix Leaflet's broken default icon paths when bundled with webpack/Next.js
function fixLeafletIcons() {
  delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

type Props = {
  latitude: number;
  longitude: number;
  locationName: string | null;
};

export default function ReportMapPanel({ latitude, longitude, locationName }: Props) {
  useEffect(() => {
    fixLeafletIcons();
  }, []);

  const label = locationName || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

  return (
    <div className="overflow-hidden rounded-lg border" style={{ height: 280 }}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]}>
          <Popup>{label}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}