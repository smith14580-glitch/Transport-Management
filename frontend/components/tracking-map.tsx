"use client";

import React from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import type { LiveTrip, TripPosition } from "@/lib/types";

// Fix default marker icon paths for webpack/next.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const KARACHI_CENTER: [number, number] = [24.95, 67.03];

function markerIcon(color: string, label: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};color:#fff;font-weight:700;font-size:11px;padding:4px 6px;border-radius:999px;box-shadow:0 2px 6px rgba(0,0,0,.3);white-space:nowrap;">${label}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export function TrackingMap({ trips }: { trips: LiveTrip[] }) {
  const lines: Array<{ id: string; positions: [number, number][]; color: string }> = [];
  const markers: Array<{ id: string; pos: TripPosition; trip: LiveTrip; color: string }> = [];

  for (const trip of trips) {
    const positions = trip.positions || [];
    if (positions.length > 1) {
      lines.push({
        id: trip.booking_id,
        positions: positions.map((p) => [p.lat, p.lng]),
        color: trip.status === "live" ? "#16a34a" : trip.status === "stale" ? "#d97706" : "#6b7280",
      });
    }
    const last = trip.last_position;
    if (last) {
      markers.push({
        id: trip.booking_id,
        pos: last,
        trip,
        color: trip.status === "live" ? "#16a34a" : trip.status === "stale" ? "#d97706" : "#6b7280",
      });
    }
  }

  return (
    <MapContainer center={KARACHI_CENTER} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {lines.map((l) => (
        <Polyline key={l.id} positions={l.positions} pathOptions={{ color: l.color, weight: 4, opacity: 0.7 }} />
      ))}
      {markers.map((m) => (
        <Marker key={m.id} position={[m.pos.lat, m.pos.lng]} icon={markerIcon(m.color, m.trip.car_name)}>
          <Popup>
            <div className="text-sm">
              <p className="font-bold">{m.trip.car_name}</p>
              <p>{m.trip.customer_name}</p>
              <p className="text-xs">Driver: {m.trip.driver_name || "—"}</p>
              <p className="text-xs">Speed: {m.pos.speed != null ? `${m.pos.speed} km/h` : "—"}</p>
              <p className="text-xs">Last: {new Date(m.pos.recorded_at).toLocaleTimeString()}</p>
              <a href={`/bookings/${m.trip.booking_id}`} className="text-xs font-semibold text-blue-700 underline">View booking</a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}