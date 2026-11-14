"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { createCar, deleteCar, fetchCars, updateCar } from "@/lib/api";
import type { Car, CarCategory, CarStatus, Fuel, Transmission } from "@/lib/types";
import { CAR_CATEGORIES } from "@/lib/types";
import { formatPKR } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import {
  Badge,
  ConnectionError,
  EmptyState,
  LoadingState,
  Modal,
  PageHeader,
  carStatusTone,
  dangerButtonClass,
  goldButtonClass,
  inputClass,
  labelClass,
  secondaryButtonClass,
} from "@/components/ui";

const STATUS_FILTERS: { value: string; labelKey: string }[] = [
  { value: "all", labelKey: "all" },
  { value: "available", labelKey: "available" },
  { value: "on_rent", labelKey: "onRent" },
  { value: "maintenance", labelKey: "maintenance" },
  { value: "not_available", labelKey: "notAvailable" },
];

interface CarForm {
  name: string;
  category: CarCategory;
  seats: string;
  transmission: Transmission;
  fuel: Fuel;
  plate_no: string;
  status: CarStatus;
  rate_with_driver_hour: string;
  rate_with_driver_day: string;
  rate_self_hour: string;
  rate_self_day: string;
  notes: string;
}

const EMPTY_FORM: CarForm = {
  name: "",
  category: "SUV",
  seats: "5",
  transmission: "Automatic",
  fuel: "Petrol",
  plate_no: "",
  status: "available",
  rate_with_driver_hour: "",
  rate_with_driver_day: "",
  rate_self_hour: "",
  rate_self_day: "",
  notes: "",
};

function statusLabel(status: CarStatus, t: (k: string) => string): string {
  if (status === "available") return t("available");
  if (status === "on_rent") return t("onRent");
  if (status === "maintenance") return t("maintenance");
  return t("notAvailable");
}

export default function FleetPage() {
  const { t } = useLanguage();
  const { canWrite } = useAuth();
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Car | null>(null);
  const [form, setForm] = useState<CarForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setCars(await fetchCars());
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
    // Defer the first fetch to after mount so state updates land in an
    // async callback, not synchronously inside the effect body.
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

  const filtered = cars.filter((c) => {
    if (filter !== "all" && c.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !c.plate_no.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  function openAdd() {
    if (!guardWrite()) return;
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(car: Car) {
    if (!guardWrite()) return;
    setEditing(car);
    setForm({
      name: car.name,
      category: car.category,
      seats: String(car.seats),
      transmission: car.transmission,
      fuel: car.fuel,
      plate_no: car.plate_no,
      status: car.status,
      rate_with_driver_hour: car.rate_with_driver_hour != null ? String(car.rate_with_driver_hour) : "",
      rate_with_driver_day: car.rate_with_driver_day != null ? String(car.rate_with_driver_day) : "",
      rate_self_hour: car.rate_self_hour != null ? String(car.rate_self_hour) : "",
      rate_self_day: car.rate_self_day != null ? String(car.rate_self_day) : "",
      notes: car.notes || "",
    });
    setModalOpen(true);
  }

  async function toggleAvailability(car: Car) {
    if (!guardWrite()) return;
    const next: CarStatus = car.status === "available" ? "not_available" : "available";
    await updateCar(car.id, { status: next });
    await load();
  }

  async function doDelete(car: Car) {
    if (!guardWrite()) return;
    if (!window.confirm(`"${car.name}" delete karni hai?`)) return;
    await deleteCar(car.id);
    await load();
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.plate_no.trim()) {
      setNotice("Gaari ka naam aur plate number likhna zaroori hai.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        category: form.category,
        seats: Math.max(1, Number(form.seats) || 5),
        transmission: form.transmission,
        fuel: form.fuel,
        plate_no: form.plate_no.trim(),
        status: form.status,
        rate_with_driver_hour: form.rate_with_driver_hour ? Number(form.rate_with_driver_hour) : null,
        rate_with_driver_day: form.rate_with_driver_day ? Number(form.rate_with_driver_day) : null,
        rate_self_hour: form.rate_self_hour ? Number(form.rate_self_hour) : null,
        rate_self_day: form.rate_self_day ? Number(form.rate_self_day) : null,
        notes: form.notes.trim() || null,
      };
      if (editing) await updateCar(editing.id, body);
      else await createCar(body);
      setModalOpen(false);
      setNotice("");
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Save nahi ho saka.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={t("fleet")}
        subtitle="Stock — kaunsi gaari available hai, kaunsi rent par, kaunsi maintenance me"
        actions={
          <button type="button" onClick={openAdd} className={goldButtonClass}>
            <Plus className="h-4 w-4" />
            {t("addCar")}
          </button>
        }
      />

      {notice && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
          {notice}
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              filter === f.value ? "bg-charcoal text-white" : "bg-white text-charcoal ring-1 ring-stone-line hover:bg-offwhite"
            }`}
            aria-pressed={filter === f.value}
          >
            {t(f.labelKey)}
          </button>
        ))}
        <div className="relative ms-auto w-full sm:w-72">
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
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ConnectionError error={error} onRetry={reload} />
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((car) => (
            <article key={car.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate font-display text-lg font-bold text-charcoal">{car.name}</h2>
                  <p className="mt-0.5 text-xs text-ink/60">
                    {car.category} · {car.seats} seats · {car.transmission} · {car.fuel} · {car.plate_no}
                  </p>
                </div>
                <Badge tone={carStatusTone(car.status)}>{statusLabel(car.status, t)}</Badge>
              </div>

              <dl className="mt-4 space-y-1.5 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-ink/60">{t("withDriver")} {t("perDay")}</dt>
                  <dd className="font-semibold text-charcoal">
                    {car.rate_with_driver_day != null ? formatPKR(car.rate_with_driver_day) : "Default rate"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink/60">{t("withDriver")} {t("perHour")}</dt>
                  <dd className="font-semibold text-charcoal">
                    {car.rate_with_driver_hour != null ? formatPKR(car.rate_with_driver_hour) : "Default rate"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink/60">{t("selfDrive")} {t("perDay")}</dt>
                  <dd className="font-semibold text-charcoal">
                    {car.rate_self_day != null ? formatPKR(car.rate_self_day) : "Default rate"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink/60">{t("selfDrive")} {t("perHour")}</dt>
                  <dd className="font-semibold text-charcoal">
                    {car.rate_self_hour != null ? formatPKR(car.rate_self_hour) : "Default rate"}
                  </dd>
                </div>
              </dl>
              {car.notes && <p className="mt-3 text-xs text-ink/60">{car.notes}</p>}

              <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-line pt-4">
                <button type="button" onClick={() => toggleAvailability(car)} className={secondaryButtonClass}>
                  {car.status === "available" ? "Mark Not Available" : "Mark Available"}
                </button>
                <button type="button" onClick={() => openEdit(car)} className={secondaryButtonClass}>
                  <Pencil className="h-4 w-4" />
                  {t("edit")}
                </button>
                <button type="button" onClick={() => doDelete(car)} className={dangerButtonClass} aria-label={`Delete ${car.name}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal title={editing ? `${t("edit")} — ${editing.name}` : t("addCar")} onClose={() => setModalOpen(false)}>
          <form onSubmit={submitForm} className="space-y-4">
            <div>
              <label htmlFor="f-name" className={labelClass}>{t("car")} {t("name")} *</label>
              <input id="f-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Toyota Corolla Grande" className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="f-cat" className={labelClass}>Category</label>
                <select id="f-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as CarCategory })} className={inputClass}>
                  {CAR_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="f-seats" className={labelClass}>Seats</label>
                <input id="f-seats" type="number" min={1} value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label htmlFor="f-trans" className={labelClass}>Transmission</label>
                <select id="f-trans" value={form.transmission} onChange={(e) => setForm({ ...form, transmission: e.target.value as Transmission })} className={inputClass}>
                  <option value="Automatic">Automatic</option>
                  <option value="Manual">Manual</option>
                </select>
              </div>
              <div>
                <label htmlFor="f-fuel" className={labelClass}>Fuel</label>
                <select id="f-fuel" value={form.fuel} onChange={(e) => setForm({ ...form, fuel: e.target.value as Fuel })} className={inputClass}>
                  <option value="Petrol">Petrol</option>
                  <option value="Diesel">Diesel</option>
                </select>
              </div>
              <div>
                <label htmlFor="f-plate" className={labelClass}>Plate No. *</label>
                <input id="f-plate" value={form.plate_no} onChange={(e) => setForm({ ...form, plate_no: e.target.value })} placeholder="KHI-1234" className={inputClass} />
              </div>
              <div>
                <label htmlFor="f-status" className={labelClass}>{t("status")}</label>
                <select id="f-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as CarStatus })} className={inputClass}>
                  <option value="available">{t("available")}</option>
                  <option value="on_rent">{t("onRent")}</option>
                  <option value="maintenance">{t("maintenance")}</option>
                  <option value="not_available">{t("notAvailable")}</option>
                </select>
              </div>
            </div>

            <div className="rounded-lg bg-offwhite p-3">
              <p className="text-sm font-semibold text-charcoal">Rates (PKR) — khaali chhoro to default rate lagega</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="f-wd-day" className={labelClass}>{t("withDriver")} / day</label>
                  <input id="f-wd-day" type="number" min={0} value={form.rate_with_driver_day} onChange={(e) => setForm({ ...form, rate_with_driver_day: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="f-wd-hr" className={labelClass}>{t("withDriver")} / hour</label>
                  <input id="f-wd-hr" type="number" min={0} value={form.rate_with_driver_hour} onChange={(e) => setForm({ ...form, rate_with_driver_hour: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="f-sd-day" className={labelClass}>{t("selfDrive")} / day</label>
                  <input id="f-sd-day" type="number" min={0} value={form.rate_self_day} onChange={(e) => setForm({ ...form, rate_self_day: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="f-sd-hr" className={labelClass}>{t("selfDrive")} / hour</label>
                  <input id="f-sd-hr" type="number" min={0} value={form.rate_self_hour} onChange={(e) => setForm({ ...form, rate_self_hour: e.target.value })} className={inputClass} />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="f-notes" className={labelClass}>Notes</label>
              <input id="f-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
            </div>

            <button type="submit" disabled={saving} className={`${goldButtonClass} w-full`}>
              {saving ? t("loading") : t("save")}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
