"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarPlus, User, UserRound } from "lucide-react";
import {
  checkAvailability,
  createBooking,
  fetchCars,
  fetchDrivers,
  fetchSettings,
} from "@/lib/api";
import type { BusinessSettings, Car, Driver, DurationUnit, PaymentPlan } from "@/lib/types";
import { PAYMENT_PLANS } from "@/lib/types";
import { formatPKR } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import {
  LoadingState,
  PageHeader,
  goldButtonClass,
  inputClass,
  labelClass,
  secondaryButtonClass,
} from "@/components/ui";

function rateFor(
  car: Car | undefined,
  settings: BusinessSettings | null,
  driver: "with_driver" | "self_drive",
  unit: DurationUnit,
): number {
  if (!settings) return 0;
  if (car) {
    if (driver === "with_driver") {
      if (unit === "days" && car.rate_with_driver_day != null) return car.rate_with_driver_day;
      if (unit === "hours" && car.rate_with_driver_hour != null) return car.rate_with_driver_hour;
    } else {
      if (unit === "days" && car.rate_self_day != null) return car.rate_self_day;
      if (unit === "hours" && car.rate_self_hour != null) return car.rate_self_hour;
    }
  }
  if (driver === "with_driver") {
    return unit === "days" ? settings.default_rate_with_driver_day : settings.default_rate_with_driver_hour;
  }
  return unit === "days" ? settings.default_rate_self_day : settings.default_rate_self_hour;
}

export default function NewBookingPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { canWrite } = useAuth();
  const [cars, setCars] = useState<Car[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [carId, setCarId] = useState("");
  const [pickup, setPickup] = useState("");
  const [ret, setRet] = useState("");
  const [driver, setDriver] = useState<"with_driver" | "self_drive">("with_driver");
  const [driverId, setDriverId] = useState("");
  const [unit, setUnit] = useState<DurationUnit>("days");
  const [plan, setPlan] = useState<PaymentPlan>("full_cash");
  const [advanceOverride, setAdvanceOverride] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    Promise.all([fetchCars(), fetchDrivers(), fetchSettings()])
      .then(([c, d, s]) => {
        setCars(c);
        setDrivers(d);
        setSettings(s);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Load nahi ho saka."))
      .finally(() => setLoading(false));
  }, []);

  const car = useMemo(() => cars.find((c) => c.id === carId), [cars, carId]);

  const hours = useMemo(() => {
    if (!pickup || !ret) return 0;
    const diff = (new Date(ret).getTime() - new Date(pickup).getTime()) / 3600000;
    return diff > 0 ? diff : 0;
  }, [pickup, ret]);

  const durationValue = useMemo(() => {
    if (hours <= 0) return 0;
    return unit === "days" ? Math.max(1, Math.ceil(hours / 24)) : Math.max(1, Math.ceil(hours));
  }, [hours, unit]);

  const rate = useMemo(
    () => rateFor(car, settings, driver, unit),
    [car, settings, driver, unit],
  );
  const total = rate * durationValue;

  // Advance defaults to the plan (half plans = half of total, full plans =
  // full total) until the manager types their own value. Derived during
  // render — no effect needed — and reset whenever the total changes.
  const defaultAdvance =
    total > 0
      ? plan === "half_now_half_later" || plan === "half_cash_half_bank"
        ? Math.round(total / 2)
        : total
      : 0;
  const advance = advanceOverride ?? String(defaultAdvance);

  const advanceNum = Number(advance) || 0;
  const balance = Math.max(0, total - advanceNum);
  const carUnavailable = car && car.status !== "available" && car.status !== "on_rent";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!canWrite) {
      setError("Demo View me booking save nahi hoti — pehle login karo.");
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      setError("Customer ka naam aur phone likhna zaroori hai.");
      return;
    }
    if (!carId) {
      setError("Gaari select karo.");
      return;
    }
    if (!pickup || !ret || hours <= 0) {
      setError("Pickup aur return ka sahi waqt likho — return pickup se baad me ho.");
      return;
    }
    if (total <= 0) {
      setError("Rate set nahi hai — Settings me default rate check karo.");
      return;
    }
    if (advanceNum < 0 || advanceNum > total) {
      setError(`Advance 0 se ${formatPKR(total)} ke beech me ho.`);
      return;
    }
    setSaving(true);
    try {
      const check = await checkAvailability(carId, pickup, ret);
      if (!check.available) {
        setError(
          `Double booking! Ye gaari us waqt pehle se booked hai (${check.conflicting_booking_code || "existing booking"}). Doosri gaari ya doosra waqt chuno.`,
        );
        setSaving(false);
        return;
      }
      const booking = await createBooking({
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        car_id: carId,
        pickup_datetime: pickup,
        return_datetime: ret,
        driver_option: driver,
        driver_id: driver === "with_driver" ? (driverId || null) : null,
        driver_name: driver === "with_driver" ? (drivers.find((d) => d.id === driverId)?.full_name || null) : null,
        duration_value: durationValue,
        duration_unit: unit,
        rate_per_unit: rate,
        total_amount: total,
        advance_amount: advanceNum,
        payment_plan: plan,
        notes: notes.trim() || undefined,
      });
      router.push(`/bookings/${booking.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking save nahi ho saki.");
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title={t("newBooking")}
        subtitle="Customer, gaari, waqt aur payment plan — rate Settings se auto-fill hota hai"
        actions={
          <Link href="/bookings" className={secondaryButtonClass}>
            {t("back")}
          </Link>
        }
      />

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line lg:col-span-2">
          {/* Customer */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cname" className={labelClass}>
                {t("customer")} {t("name")} *
              </label>
              <input id="cname" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Ahmed Raza" className={inputClass} />
            </div>
            <div>
              <label htmlFor="cphone" className={labelClass}>
                {t("customer")} {t("phone")} *
              </label>
              <input id="cphone" type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="03xx-xxxxxxx" className={inputClass} />
            </div>
          </div>

          {/* Car */}
          <div>
            <label htmlFor="car" className={labelClass}>
              {t("car")} *
            </label>
            <select id="car" value={carId} onChange={(e) => { setCarId(e.target.value); setAdvanceOverride(null); }} className={inputClass}>
              <option value="">— Select car —</option>
              {cars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.plate_no} · {c.status === "available" ? "Available" : c.status === "on_rent" ? "On Rent" : c.status === "maintenance" ? "Maintenance" : "Not Available"}
                </option>
              ))}
            </select>
            {carUnavailable && (
              <p className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Ye gaari abhi {car?.status === "maintenance" ? "maintenance" : "not available"} me hai — phir bhi booking kar sakte ho, lekin pehle status check kar lo.
              </p>
            )}
          </div>

          {/* Dates */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pickup" className={labelClass}>
                {t("pickup")} (date + time) *
              </label>
              <input id="pickup" type="datetime-local" value={pickup} onChange={(e) => { setPickup(e.target.value); setAdvanceOverride(null); }} className={inputClass} />
            </div>
            <div>
              <label htmlFor="ret" className={labelClass}>
                {t("return")} (date + time) *
              </label>
              <input id="ret" type="datetime-local" value={ret} onChange={(e) => { setRet(e.target.value); setAdvanceOverride(null); }} className={inputClass} />
            </div>
          </div>

          {/* Driver toggle */}
          <div>
            <span className={labelClass}>Driver *</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setDriver("with_driver"); setDriverId(""); setAdvanceOverride(null); }}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ring-1 ${
                  driver === "with_driver" ? "bg-charcoal text-white ring-charcoal" : "bg-white text-charcoal ring-stone-line"
                }`}
                aria-pressed={driver === "with_driver"}
              >
                <UserRound className="h-4 w-4" />
                {t("withDriver")}
              </button>
              <button
                type="button"
                onClick={() => { setDriver("self_drive"); setAdvanceOverride(null); }}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ring-1 ${
                  driver === "self_drive" ? "bg-charcoal text-white ring-charcoal" : "bg-white text-charcoal ring-stone-line"
                }`}
                aria-pressed={driver === "self_drive"}
              >
                <User className="h-4 w-4" />
                {t("selfDrive")}
              </button>
            </div>
          </div>

          {/* Driver assignment */}
          {driver === "with_driver" && (
            <div>
              <label htmlFor="driverSel" className={labelClass}>
                {t("driverAssigned")} *
              </label>
              <select
                id="driverSel"
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                className={inputClass}
              >
                <option value="">{t("selectDriver")}</option>
                {drivers
                  .filter((d) => d.status === "available")
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.full_name} · {d.phone}
                    </option>
                  ))}
              </select>
              <p className="mt-1.5 text-xs text-ink/50">{t("onlyAvailable")}</p>
            </div>
          )}

          {/* Duration unit */}
          <div>
            <span className={labelClass}>Duration</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => { setUnit("days"); setAdvanceOverride(null); }}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${unit === "days" ? "bg-charcoal text-white" : "bg-white text-charcoal ring-1 ring-stone-line"}`}
                aria-pressed={unit === "days"}
              >
                Days
              </button>
              <button
                type="button"
                onClick={() => { setUnit("hours"); setAdvanceOverride(null); }}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${unit === "hours" ? "bg-charcoal text-white" : "bg-white text-charcoal ring-1 ring-stone-line"}`}
                aria-pressed={unit === "hours"}
              >
                Hours
              </button>
              <span className="text-sm text-ink/60">
                {hours > 0 ? `${durationValue} ${unit === "days" ? "day(s)" : "hour(s)"} (${hours} hours total)` : "Pickup aur return likho to duration auto-calculate hogi."}
              </span>
            </div>
          </div>

          {/* Payment plan */}
          <div>
            <label htmlFor="plan" className={labelClass}>
              Payment Plan *
            </label>
            <select id="plan" value={plan} onChange={(e) => { setPlan(e.target.value as PaymentPlan); setAdvanceOverride(null); }} className={inputClass}>
              {PAYMENT_PLANS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.value === "full_cash" ? t("fullCash") : p.value === "full_bank" ? t("fullBank") : p.value === "half_cash_half_bank" ? t("halfCashHalfBank") : t("halfNowHalfLater")}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-ink/50">
              {plan === "half_cash_half_bank"
                ? "Aadhi raqam cash, aadhi bank — advance me dono ka total likho."
                : plan === "half_now_half_later"
                  ? "Aadhi abhi (advance), aadhi baad me — baaki balance booking par dikhega."
                  : "Poori raqam ek hi tareeqe se — advance = total."}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="advance" className={labelClass}>
                Advance Amount (PKR)
              </label>
              <input
                id="advance"
                type="number"
                min={0}
                max={total || undefined}
                value={advance}
                onChange={(e) => setAdvanceOverride(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="notes" className={labelClass}>
                Notes
              </label>
              <input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Airport pickup" className={inputClass} />
            </div>
          </div>

          {error && (
            <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          <button type="submit" disabled={saving || total <= 0} className={`${goldButtonClass} w-full`}>
            <CalendarPlus className="h-4 w-4" />
            {saving ? t("loading") : "Create Booking"}
          </button>
        </div>

        {/* Summary */}
        <aside className="h-fit rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line">
          <h2 className="font-display text-lg font-bold text-charcoal">Summary</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-ink/60">{t("car")}</dt>
              <dd className="text-end font-semibold text-charcoal">{car ? car.name : "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink/60">Rate</dt>
              <dd className="text-end font-semibold text-charcoal">
                {rate > 0 ? `${formatPKR(rate)} ${unit === "days" ? t("perDay") : t("perHour")}` : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink/60">Duration</dt>
              <dd className="text-end font-semibold text-charcoal">
                {durationValue > 0 ? `${durationValue} ${unit}` : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-2 border-t border-stone-line pt-3">
              <dt className="text-ink/60">{t("total")}</dt>
              <dd className="text-end font-display text-lg font-bold text-charcoal">{formatPKR(total)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink/60">Advance</dt>
              <dd className="text-end font-semibold text-charcoal">{formatPKR(advanceNum)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink/60">{t("balance")}</dt>
              <dd className="text-end font-semibold text-red-700">{formatPKR(balance)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-ink/50">
            Rate {car ? "is gaari ke override" : "default Settings"} se liya gaya hai. Rate badalna ho to
            Fleet (per-car) ya Settings (default) me badlo.
          </p>
        </aside>
      </form>
    </div>
  );
}
