"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Camera, Plus, Search } from "lucide-react";
import { deleteDriver, fetchDrivers, updateDriver } from "@/lib/api";
import type { Driver } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import {
  Badge,
  ConnectionError,
  EmptyState,
  LoadingState,
  PageHeader,
  goldButtonClass,
  inputClass,
  secondaryButtonClass,
} from "@/components/ui";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function statusTone(status: Driver["status"]): "green" | "blue" | "grey" {
  if (status === "available") return "green";
  if (status === "on_trip") return "blue";
  return "grey";
}

function statusLabel(status: Driver["status"], t: (k: string) => string): string {
  if (status === "available") return t("driverAvailable");
  if (status === "on_trip") return t("driverOnTrip");
  return t("driverOffDuty");
}

export default function DriversPage() {
  const { t } = useLanguage();
  const { canWrite } = useAuth();
  const [rows, setRows] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await fetchDrivers());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    void load();
  }, [load]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  function guardWrite(): boolean {
    if (!canWrite) {
      setNotice("Demo View me kuch save nahi hota — pehle login karo.");
      return false;
    }
    return true;
  }

  const filtered = rows.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.full_name.toLowerCase().includes(q) ||
      d.phone.includes(q) ||
      d.cnic.includes(q) ||
      d.licence_no.toLowerCase().includes(q)
    );
  });

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

  async function handlePhotoUpload(d: Driver, file: File) {
    if (!canWrite) { setNotice("Demo View me kuch save nahi hota — pehle login karo."); return; }
    setUploadingId(d.id);
    try {
      const photo = await resizeImage(file);
      await updateDriver(d.id, { photo });
      setNotice("");
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Photo upload nahi ho saki.");
    } finally {
      setUploadingId(null);
    }
  }

  async function doDelete(d: Driver) {
    if (!guardWrite()) return;
    if (!window.confirm(`"${d.full_name}" delete karni hai?`)) return;
    try {
      await deleteDriver(d.id);
      setNotice("");
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Delete nahi ho saka.");
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ConnectionError error={error} onRetry={reload} />;

  return (
    <div>
      <PageHeader
        title={t("drivers")}
        subtitle="Drivers — profile, status, licence expiry"
        actions={
          <Link href="/drivers/new" className={goldButtonClass}>
            <Plus className="h-4 w-4" />
            {t("addDriver")}
          </Link>
        }
      />

      {notice && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
          {notice}
        </p>
      )}

      <div className="mb-4 relative w-full sm:w-72">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`${t("search")}…`}
          className={`${inputClass} ps-9`}
          aria-label={t("search")}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((d) => (
            <article key={d.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line">
              <div className="flex items-start gap-3">
                <label className="group relative block h-12 w-12 cursor-pointer overflow-hidden rounded-full ring-1 ring-stone-line">
                  {d.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.photo} alt={d.full_name} className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-sm font-bold text-brand-dark">
                      {initials(d.full_name)}
                    </div>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <Camera className="h-4 w-4 text-white" />
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    disabled={uploadingId === d.id}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handlePhotoUpload(d, f);
                      e.target.value = "";
                    }}
                  />
                </label>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-display text-lg font-bold text-charcoal">{d.full_name}</h2>
                  <p className="text-xs text-ink/60">{t("age")}: {d.age} · {d.phone}</p>
                </div>
                <Badge tone={statusTone(d.status)}>{statusLabel(d.status, t)}</Badge>
              </div>

              <dl className="mt-4 space-y-1.5 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-ink/60">{t("cnic")}</dt>
                  <dd className="font-mono text-xs text-charcoal">{d.cnic}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink/60">{t("licenceNo")}</dt>
                  <dd className="text-charcoal">{d.licence_no}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink/60">{t("licenceExpiry")}</dt>
                  <dd className="text-charcoal">{d.licence_expiry.slice(0, 10)}</dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-line pt-4">
                <Link href={`/drivers/${d.id}`} className={secondaryButtonClass}>
                  {t("view")}
                </Link>
                <Link href={`/drivers/${d.id}/edit`} className={secondaryButtonClass}>
                  {t("edit")}
                </Link>
                <button type="button" onClick={() => void doDelete(d)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800">
                  {t("delete")}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}