"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { fetchBooking, sendPosition, startTrip, endTrip } from "@/lib/api";
import type { Booking } from "@/lib/types";
import { formatDateTime } from "@/lib/format";


export default function TrackPage() {
  const params = useParams();
  const code = String(params.code);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestPos = useRef<{ lat: number; lng: number; speed: number | null } | null>(null);

  const load = useCallback(async () => {
    try {
      setBooking(await fetchBooking(code));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking nahi mili.");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const stopSharing = useCallback(async () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setSharing(false);
    try {
      await endTrip(code);
    } catch {
      /* ignore */
    }
  }, [code]);

  const sendLatest = useCallback(async () => {
    if (!latestPos.current) return;
    try {
      await sendPosition(code, {
        lat: latestPos.current.lat,
        lng: latestPos.current.lng,
        speed: latestPos.current.speed,
        recorded_at: new Date().toISOString(),
      });
      setLastSent(new Date().toLocaleTimeString());
    } catch {
      /* ignore */
    }
  }, [code]);

  const startSharing = useCallback(async () => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Geolocation supported nahi hai is device par.");
      return;
    }
    try {
      await startTrip(code);
    } catch {
      /* ignore */
    }
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        latestPos.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speed: pos.coords.speed != null ? Math.round(pos.coords.speed * 3.6) : null,
        };
      },
      (err) => {
        setGeoError(err.message || "Location permission deny ho gayi. Dobara try karo.");
        void stopSharing();
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );
    setSharing(true);
    intervalRef.current = setInterval(() => void sendLatest(), 30000);
    setTimeout(() => void sendLatest(), 3000);
  }, [code, sendLatest, stopSharing]);

  useEffect(() => {
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-offwhite text-sm text-ink/60">Loading…</div>;
  }
  if (error || !booking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-offwhite p-6">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-stone-line">
          <p className="font-display text-xl font-bold text-charcoal">Booking nahi mili</p>
          <p className="mt-2 text-sm text-ink/60">{error || "Code check karo."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-offwhite px-4 py-6">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-line">
        <h1 className="font-display text-2xl font-bold text-charcoal">Trip Tracking</h1>
        <p className="mt-1 text-sm text-ink/60">{booking.booking_code} · {booking.car_name}</p>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-ink/50">Customer</dt><dd className="font-semibold text-charcoal">{booking.customer_name}</dd></div>
          <div><dt className="text-ink/50">Phone</dt><dd className="text-charcoal">{booking.customer_phone}</dd></div>
          <div><dt className="text-ink/50">Pickup</dt><dd className="text-charcoal">{formatDateTime(booking.pickup_datetime)}</dd></div>
          <div><dt className="text-ink/50">Return</dt><dd className="text-charcoal">{formatDateTime(booking.return_datetime)}</dd></div>
        </dl>

        <div className="mt-5 rounded-xl bg-offwhite p-4 text-sm text-ink/70">
          <p className="font-semibold text-charcoal">Privacy:</p>
          <p className="mt-1">Location sirf trip ke doran share hoti hai. &quot;End Trip&quot; dabate hi sharing band ho jati hai.</p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {!sharing ? (
            <button type="button" onClick={() => void startSharing()} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-charcoal hover:bg-brand-dark hover:text-white">
              Start Trip
            </button>
          ) : (
            <button type="button" onClick={() => void stopSharing()} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-red-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-800">
              End Trip
            </button>
          )}
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${sharing ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-700"}`}>
            {sharing ? "Sharing ON" : "Sharing OFF"}
          </span>
          {lastSent && <span className="text-xs text-ink/60">Last sent: {lastSent}</span>}
        </div>

        {geoError && (
          <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {geoError}
            <button type="button" onClick={() => void startSharing()} className="ms-3 underline">Dobara try karo</button>
          </div>
        )}

        {sharing && (
          <p className="mt-3 text-xs text-ink/50">Har 30 second par location send ho rahi hai.</p>
        )}
      </div>
    </div>
  );
}