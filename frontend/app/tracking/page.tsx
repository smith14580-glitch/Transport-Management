"use client";

import React, { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AlertTriangle, Radio } from "lucide-react";
import { fetchLiveTrips } from "@/lib/api";
import type { LiveTrip, TripPosition } from "@/lib/types";


import {
  Badge,
  ConnectionError,
  EmptyState,
  LoadingState,
  PageHeader,
} from "@/components/ui";

const TrackingMap = dynamic(() => import("@/components/tracking-map").then((m) => m.TrackingMap), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-ink/60">Map load ho raha hai…</div>,
});

const KARACHI_BOUNDS = { minLat: 24.7, maxLat: 25.1, minLng: 66.9, maxLng: 67.3 };

function inBounds(p: TripPosition): boolean {
  return p.lat >= KARACHI_BOUNDS.minLat && p.lat <= KARACHI_BOUNDS.maxLat && p.lng >= KARACHI_BOUNDS.minLng && p.lng <= KARACHI_BOUNDS.maxLng;
}

function statusChip(status: LiveTrip["status"]): "green" | "amber" | "grey" {
  if (status === "live") return "green";
  if (status === "stale") return "amber";
  return "grey";
}

export default function TrackingPage() {

  const [trips, setTrips] = useState<LiveTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    try {
      setTrips(await fetchLiveTrips());
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    const id = setInterval(() => void load(), 10000);
    return () => { clearTimeout(timer); clearInterval(id); };
  }, [load]);

  if (loading) return <LoadingState />;
  if (error) return <ConnectionError error={error} onRetry={() => void load()} />;

  const staleTrips = trips.filter((tr) => tr.status === "stale");
  const outOfBounds = trips.filter((tr) => tr.last_position && !inBounds(tr.last_position));

  return (
    <div>
      <PageHeader
        title="Live Tracking"
        subtitle="Phone-based live location — driver ke phone ki GPS se"
        actions={
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand-dark">
            <Radio className="h-3.5 w-3.5" />
            {trips.filter((t) => t.status === "live").length} live
          </span>
        }
      />

      {staleTrips.length > 0 && (
        <section className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-amber-800">Location off</h2>
              <ul className="mt-2 space-y-1 text-sm text-amber-700">
                {staleTrips.map((tr) => (
                  <li key={tr.booking_id}>
                    {tr.car_name} · {tr.customer_name} — last seen{" "}
                    {tr.last_position ? new Date(tr.last_position.recorded_at).toLocaleTimeString() : "—"}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {outOfBounds.length > 0 && (
        <section className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-red-800">Geofence alert — Karachi bounds ke bahar</h2>
              <ul className="mt-2 space-y-1 text-sm text-red-700">
                {outOfBounds.map((tr) => (
                  <li key={tr.booking_id}>{tr.car_name} · {tr.customer_name}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="h-[420px] overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-line sm:h-[520px]">
            {trips.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-ink/60">Koi active trip nahi hai.</div>
            ) : (
              <TrackingMap trips={trips} />
            )}
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="font-display text-lg font-bold text-charcoal">Active trips</h2>
          {trips.length === 0 ? (
            <EmptyState message="Koi active trip nahi hai." />
          ) : (
            trips.map((tr) => (
              <div key={tr.booking_id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-line">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-charcoal">{tr.car_name}</p>
                    <p className="text-xs text-ink/60">{tr.customer_name}</p>
                    {tr.driver_name && <p className="text-xs text-ink/60">Driver: {tr.driver_name}</p>}
                  </div>
                  <Badge tone={statusChip(tr.status)}>
                    {tr.status === "live" ? "Live" : tr.status === "stale" ? "Location Off" : "Ended"}
                  </Badge>
                </div>
                {tr.last_position && (
                  <p className="mt-2 text-xs text-ink/60">
                    Speed: {tr.last_position.speed != null ? `${tr.last_position.speed} km/h` : "—"} · Last:{" "}
                    {new Date(tr.last_position.recorded_at).toLocaleTimeString()}
                  </p>
                )}
                <Link href={`/bookings/${tr.booking_id}`} className="mt-2 inline-block text-xs font-semibold text-brand-dark underline">
                  View booking →
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}