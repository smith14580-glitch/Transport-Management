"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, Camera, Pencil } from "lucide-react";
import { fetchDriver, fetchDriverTrips, updateDriver } from "@/lib/api";
import type { Booking, Driver } from "@/lib/types";
import { formatDateTime, formatPKR } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import {
  Badge,
  ConnectionError,
  EmptyState,
  LoadingState,
  PageHeader,
  bookingStatusTone,
  secondaryButtonClass,
} from "@/components/ui";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 9999;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export default function DriverDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const { t } = useLanguage();
  const { canWrite } = useAuth();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [uploading, setUploading] = useState(false);
  const [trips, setTrips] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    try {
      const [d, tr] = await Promise.all([fetchDriver(id), fetchDriverTrips(id)]);
      setDriver(d);
      setTrips(tr);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function resizeImage(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 256;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d");
          if (!ctx) { resolve(String(reader.result || "")); return; }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.src = String(reader.result || "");
      };
      reader.readAsDataURL(file);
    });
  }

  async function handlePhotoUpload(file: File) {
    if (!driver || !canWrite) return;
    setUploading(true);
    try {
      const photo = await resizeImage(file);
      const updated = await updateDriver(driver.id, { photo });
      setDriver(updated);
    } catch {
      // ignore; could show notice
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ConnectionError error={error} onRetry={() => void load()} />;
  if (!driver) return <EmptyState />;

  const expiring = daysUntil(driver.licence_expiry) <= 30;
  const currentTrip = driver.status === "on_trip"
    ? trips.find((b) => b.status === "active" || b.status === "upcoming")
    : undefined;

  return (
    <div>
      <PageHeader
        title={driver.full_name}
        subtitle={`${t("driverDetail")} · ${driver.phone}`}
        actions={
          <>
            <Link href="/drivers" className={secondaryButtonClass}>
              {t("back")}
            </Link>
            <Link href={`/drivers/${id}/edit`} className={secondaryButtonClass}>
              <Pencil className="h-4 w-4" />
              {t("edit")}
            </Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line lg:col-span-2">
          <div className="flex items-start gap-4">
            <label className="group relative block h-20 w-20 cursor-pointer overflow-hidden rounded-full ring-2 ring-stone-line">
              {driver.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={driver.photo} alt={driver.full_name} className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-light text-2xl font-bold text-brand-dark">
                  {initials(driver.full_name)}
                </div>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-5 w-5 text-white" />
              </span>
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 cursor-pointer opacity-0"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handlePhotoUpload(f);
                  e.target.value = "";
                }}
              />
            </label>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={driver.status === "available" ? "green" : driver.status === "on_trip" ? "blue" : "grey"}>
                  {driver.status === "available" ? t("driverAvailable") : driver.status === "on_trip" ? t("driverOnTrip") : t("driverOffDuty")}
                </Badge>
                {expiring && (
                  <Badge tone="amber">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    {t("expiringSoon")}
                  </Badge>
                )}
              </div>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div><dt className="text-ink/50">{t("age")}</dt><dd className="font-semibold text-charcoal">{driver.age}</dd></div>
                <div><dt className="text-ink/50">{t("dateOfBirth")}</dt><dd className="font-semibold text-charcoal">{driver.date_of_birth}</dd></div>
                <div><dt className="text-ink/50">{t("cnic")}</dt><dd className="font-mono text-xs text-charcoal">{driver.cnic}</dd></div>
                <div><dt className="text-ink/50">{t("phone")}</dt><dd className="font-semibold text-charcoal">{driver.phone}</dd></div>
                <div><dt className="text-ink/50">{t("licenceNo")}</dt><dd className="text-charcoal">{driver.licence_no}</dd></div>
                <div><dt className="text-ink/50">{t("licenceExpiry")}</dt><dd className={expiring ? "font-semibold text-amber-700" : "text-charcoal"}>{driver.licence_expiry.slice(0, 10)}</dd></div>
                {driver.address && <div className="sm:col-span-2"><dt className="text-ink/50">{t("address")}</dt><dd className="text-charcoal">{driver.address}</dd></div>}
                {driver.emergency_contact && <div className="sm:col-span-2"><dt className="text-ink/50">{t("emergencyContact")}</dt><dd className="text-charcoal">{driver.emergency_contact}</dd></div>}
                {driver.notes && <div className="sm:col-span-2"><dt className="text-ink/50">Notes</dt><dd className="text-charcoal">{driver.notes}</dd></div>}
              </dl>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line">
          <h2 className="font-display text-lg font-bold text-charcoal">{t("currentAssignment")}</h2>
          {currentTrip ? (
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-charcoal">{currentTrip.car_name}</p>
              <p className="text-ink/60">{currentTrip.customer_name} · {currentTrip.customer_phone}</p>
              <p className="text-ink/60">{t("pickup")}: {formatDateTime(currentTrip.pickup_datetime)}</p>
              <p className="text-ink/60">{t("return")}: {formatDateTime(currentTrip.return_datetime)}</p>
              <Link href={`/bookings/${currentTrip.id}`} className="text-sm font-semibold text-brand-dark underline">
                {t("view")} booking
              </Link>
            </div>
          ) : (
            <p className="text-sm text-ink/60">{t("noDriver")}</p>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line">
        <h2 className="font-display text-lg font-bold text-charcoal">{t("tripHistory")}</h2>
        {trips.length === 0 ? (
          <p className="mt-3 text-sm text-ink/60">{t("noData")}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-stone-line text-start text-xs uppercase tracking-wide text-ink/50">
                  <th className="px-4 py-3 text-start">{t("car")}</th>
                  <th className="px-4 py-3 text-start">{t("customer")}</th>
                  <th className="px-4 py-3 text-start">{t("pickup")}</th>
                  <th className="px-4 py-3 text-start">{t("return")}</th>
                  <th className="px-4 py-3 text-start">{t("status")}</th>
                  <th className="px-4 py-3 text-end">{t("latePenalty")}</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((b) => {
                  const late = (b.late_penalty_amount || 0) > 0;
                  return (
                    <tr key={b.id} className="border-b border-stone-line/60 hover:bg-offwhite">
                      <td className="px-4 py-3 text-charcoal">{b.car_name}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-charcoal">{b.customer_name}</p>
                        <p className="text-xs text-ink/60">{b.customer_phone}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-ink/70">{formatDateTime(b.pickup_datetime)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-ink/70">{formatDateTime(b.return_datetime)}</td>
                      <td className="px-4 py-3">
                        <Badge tone={b.status === "completed" ? "grey" : bookingStatusTone(b.status)}>
                          {b.status === "completed" ? t("completed") : b.status === "cancelled" ? t("cancelled") : b.status}
                        </Badge>
                        <span className={`ms-2 text-xs font-semibold ${late ? "text-red-700" : "text-emerald-700"}`}>
                          {late ? t("late") : t("onTime")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-end font-semibold text-red-700">
                        {late ? formatPKR(b.late_penalty_amount || 0) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}