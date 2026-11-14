"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BellRing,
  CalendarCheck,
  Car,
  CarFront,
  CircleAlert,
  Plus,
  Wallet,
  WalletCards,
} from "lucide-react";
import { fetchBookings, fetchDashboardSummary, fetchPayments, fetchSettings } from "@/lib/api";
import type { Booking, BusinessSettings, DashboardSummary, Payment } from "@/lib/types";
import { formatDate, formatDateTime, formatPKR, formatTime, todayISO } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import {
  Badge,
  ConnectionError,
  EmptyState,
  LoadingState,
  PageHeader,
  StatCard,
  goldButtonClass,
  paymentStatusTone,
  secondaryButtonClass,
} from "@/components/ui";

function isToday(b: Booking, today: string): boolean {
  return b.status === "active" && b.pickup_datetime.slice(0, 10) <= today && b.return_datetime.slice(0, 10) >= today;
}

function isLate(b: Booking, settings: BusinessSettings | null): { late: boolean; hours: number; penalty: number } {
  if (b.status !== "active") return { late: false, hours: 0, penalty: 0 };
  const ms = Date.now() - new Date(b.return_datetime).getTime();
  if (ms <= 0) return { late: false, hours: 0, penalty: 0 };
  const hours = Math.ceil(ms / 3600000);
  const penalty = settings?.late_penalty_enabled ? hours * (settings.late_return_penalty_per_hour || 0) : 0;
  return { late: true, hours, penalty };
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [all, setAll] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    try {
      const [s, rows, pays, st] = await Promise.all([
        fetchDashboardSummary(),
        fetchBookings({}),
        fetchPayments(),
        fetchSettings(),
      ]);
      setSummary(s);
      setAll(rows);
      setPayments(pays.slice(0, 5));
      setSettings(st);
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

  if (loading) return <LoadingState />;
  if (error) return <ConnectionError error={error} onRetry={reload} />;
  if (!summary) return <EmptyState />;

  const today = todayISO();
  const outToday = all.filter((b) => isToday(b, today));
  const lateBookings = all.filter((b) => isLate(b, settings).late);
  const upcoming = all
    .filter((b) => b.status === "upcoming")
    .sort((a, b) => a.pickup_datetime.localeCompare(b.pickup_datetime))
    .slice(0, 7);
  const nextUpcoming = upcoming[0];
  const heroBooking = outToday[0] || nextUpcoming;
  const heroIsRent = outToday.length > 0;

  const advanceReceived = payments.reduce((s, p) => s + p.amount, 0);
  const balanceDue = all.filter((b) => b.status !== "cancelled").reduce((s, b) => s + b.balance_amount, 0);

  return (
    <div>
      <PageHeader
        title="HK Transport — Dashboard"
        subtitle="Rent a Car · Shadman Town, Karachi"
        actions={
          <>
            <Link href="/bookings/new" className={goldButtonClass}>
              <Plus className="h-4 w-4" />
              {t("newBooking")}
            </Link>
            <Link href="/fleet" className={secondaryButtonClass}>
              <Car className="h-4 w-4" />
              {t("addCar")}
            </Link>
          </>
        }
      />

      {/* Late return alert */}
      {lateBookings.length > 0 && (
        <section className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg font-bold text-red-800">{t("lateReturnAlert")}</h2>
              <ul className="mt-3 space-y-2">
                {lateBookings.map((b) => {
                  const info = isLate(b, settings);
                  return (
                    <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/70 px-3 py-2 ring-1 ring-red-100">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-charcoal">{b.car_name} · {b.customer_name}</p>
                        <p className="text-xs text-red-700">
                          {info.hours} {t("hoursLateSuffix")} · {t("latePenalty")}: {formatPKR(info.penalty)}
                        </p>
                      </div>
                      <Link href={`/bookings/${b.id}`} className="text-xs font-semibold text-red-700 underline">
                        {t("view")}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Hero banner */}
      {heroBooking && (
        <section className="mb-6 rounded-2xl bg-charcoal p-6 text-white shadow-sm ring-1 ring-charcoal-soft">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">
            {heroIsRent ? t("todayOnRent") : t("nextBooking")}
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
            {heroIsRent
              ? `${heroBooking.car_name} — ${heroBooking.customer_name}`
              : `${heroBooking.customer_name} — ${heroBooking.car_name}`}
          </h2>
          <p className="mt-2 text-sm text-white/70">
            {heroIsRent
              ? `${formatTime(heroBooking.pickup_datetime)} – ${formatTime(heroBooking.return_datetime)} · ${heroBooking.driver_option === "with_driver" ? (heroBooking.driver_name || t("withDriver")) : t("selfDrive")}`
              : `${formatDate(heroBooking.pickup_datetime)} · ${formatTime(heroBooking.pickup_datetime)}`}
          </p>
          {heroIsRent && outToday.length > 1 && (
            <p className="mt-1 text-xs text-white/60">
              {t("moreCars")}: {outToday.length - 1}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <span className="rounded-full bg-white/10 px-3 py-1.5">
              {t("advanceReceived")}: <strong className="text-brand">{formatPKR(advanceReceived)}</strong>
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1.5">
              {t("balanceDue")}: <strong className="text-red-300">{formatPKR(balanceDue)}</strong>
            </span>
          </div>
          {heroIsRent && outToday.length > 1 && (
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/60">{t("allTodayRentals")}</p>
              <ul className="space-y-2">
                {outToday.map((b) => (
                  <li key={b.id}>
                    <Link href={`/bookings/${b.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm hover:bg-white/10">
                      <span className="min-w-0 truncate">
                        <strong className="text-white">{b.customer_name}</strong> · {b.car_name}
                      </span>
                      <span className="text-xs text-white/60">{t("return")}: {formatTime(b.return_datetime)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label={t("totalBookings")} value={String(all.length)} sub={`${summary.fleet_total} total cars`} icon={<CarFront className="h-5 w-5" />} />
        <StatCard label={t("todayRentals")} value={String(summary.cars_out_today)} sub={`${summary.fleet_total} fleet`} icon={<CarFront className="h-5 w-5" />} />
        <StatCard label={t("upcomingBookingsCount")} value={String(summary.upcoming_bookings_count)} sub="next 7 days" icon={<CalendarCheck className="h-5 w-5" />} />
        <StatCard label={t("totalRevenue")} value={formatPKR(summary.revenue_collected)} sub="All payments" icon={<Wallet className="h-5 w-5" />} />
        <StatCard label={t("outstanding")} value={formatPKR(summary.pending_payments)} sub="Unpaid balances" icon={<WalletCards className="h-5 w-5" />} />
      </div>

      {/* Upcoming bookings */}
      <section className="mt-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-charcoal">
          <BellRing className="h-5 w-5 text-brand" />
          {t("upcomingBookings")}
        </h2>
        {upcoming.length === 0 ? (
          <p className="mt-4 text-sm text-ink/60">{t("noUpcoming")}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {upcoming.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-4 py-3 ring-1 ring-amber-100">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-charcoal">{b.customer_name} · {b.car_name}</p>
                  <p className="text-xs text-ink/60">
                    {formatDateTime(b.pickup_datetime)} · {b.driver_option === "with_driver" ? (b.driver_name || t("withDriver")) : t("selfDrive")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={paymentStatusTone(b.payment_status)}>
                    {b.payment_status === "paid" ? t("fullyPaid") : b.payment_status === "partial" ? t("partial") : t("unpaid")}
                  </Badge>
                  <Link href={`/bookings/${b.id}`} className="text-xs font-semibold text-brand-dark underline">
                    {t("view")}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent payments */}
      <section className="mt-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-charcoal">
            <Wallet className="h-5 w-5 text-brand" />
            {t("recentPayments")}
          </h2>
          <Link href="/payments" className="text-sm font-semibold text-brand-dark underline">
            {t("payments")} →
          </Link>
        </div>
        {payments.length === 0 ? (
          <p className="mt-4 text-sm text-ink/60">{t("noData")}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-stone-line text-start text-xs uppercase tracking-wide text-ink/50">
                  <th className="py-2 pe-3 text-start">{t("customer")}</th>
                  <th className="py-2 pe-3 text-start">{t("date")}</th>
                  <th className="py-2 pe-3 text-start">{t("method")}</th>
                  <th className="py-2 text-end">{t("amount")}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-stone-line/60">
                    <td className="py-2.5 pe-3 font-medium text-charcoal">{p.customer_name}</td>
                    <td className="py-2.5 pe-3 text-ink/70">{formatDate(p.payment_date)}</td>
                    <td className="py-2.5 pe-3">
                      <Badge tone={p.method === "cash" ? "green" : p.method === "bank" ? "blue" : "gold"}>
                        {p.method === "cash" ? t("cash") : p.method === "bank" ? t("bank") : t("split")}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-end font-semibold text-charcoal">{formatPKR(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Quick actions */}
      <section className="mt-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-charcoal">
          <CircleAlert className="h-5 w-5 text-brand" />
          {t("quickActions")}
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/bookings/new" className={goldButtonClass}>
            <Plus className="h-4 w-4" />
            {t("newBooking")}
          </Link>
          <Link href="/fleet" className={secondaryButtonClass}>
            <Car className="h-4 w-4" />
            {t("addCar")}
          </Link>
          <Link href="/payments" className={secondaryButtonClass}>
            <Wallet className="h-4 w-4" />
            {t("recordPayment")}
          </Link>
          <Link href="/sales/new" className={secondaryButtonClass}>
            <Plus className="h-4 w-4" />
            {t("addSale")}
          </Link>
        </div>
      </section>
    </div>
  );
}