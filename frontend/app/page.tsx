"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BellRing,
  CalendarCheck,
  Car,
  CarFront,
  CircleAlert,
  Plus,
  Wallet,
  WalletCards,
} from "lucide-react";
import { fetchBookings, fetchDashboardSummary, fetchPayments } from "@/lib/api";
import type { Booking, DashboardSummary, Payment } from "@/lib/types";
import { formatDate, formatDateTime, formatPKR, formatTime, todayISO } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import {
  Badge,
  ConnectionError,
  EmptyState,
  LoadingState,
  PageHeader,
  StatCard,
  bookingStatusTone,
  goldButtonClass,
  paymentStatusTone,
  secondaryButtonClass,
} from "@/components/ui";

export default function DashboardPage() {
  const { t } = useLanguage();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [outToday, setOutToday] = useState<Booking[]>([]);
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    try {
      const [s, all, pays] = await Promise.all([
        fetchDashboardSummary(),
        fetchBookings({}),
        fetchPayments(),
      ]);
      const today = todayISO();
      setSummary(s);
      setOutToday(
        all.filter(
          (b) =>
            b.status === "active" &&
            b.pickup_datetime.slice(0, 10) <= today &&
            b.return_datetime.slice(0, 10) >= today,
        ),
      );
      setUpcoming(
        all.filter((b) => b.status === "upcoming").slice(0, 7),
      );
      setPayments(pays.slice(0, 5));
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

  if (loading) return <LoadingState />;
  if (error) return <ConnectionError error={error} onRetry={reload} />;
  if (!summary) return <EmptyState />;

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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label={t("carsOutToday")}
          value={String(summary.cars_out_today)}
          sub={`${summary.fleet_total} total cars`}
          icon={<CarFront className="h-5 w-5" />}
        />
        <StatCard
          label={t("todaysBookings")}
          value={String(summary.todays_bookings)}
          sub={`${summary.upcoming_bookings_count} upcoming (7 days)`}
          icon={<CalendarCheck className="h-5 w-5" />}
        />
        <StatCard
          label={t("revenueCollected")}
          value={formatPKR(summary.revenue_collected)}
          sub="All payments (demo)"
          icon={<Wallet className="h-5 w-5" />}
        />
        <StatCard
          label={t("pendingPayments")}
          value={formatPKR(summary.pending_payments)}
          sub="Unpaid balances"
          icon={<WalletCards className="h-5 w-5" />}
        />
        <StatCard
          label={t("fleetAvailable")}
          value={`${summary.fleet_available} / ${summary.fleet_total}`}
          sub="Cars ready to rent"
          icon={<Car className="h-5 w-5" />}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Cars out today */}
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-charcoal">
            <CarFront className="h-5 w-5 text-brand" />
            {t("carsOut")}
          </h2>
          {outToday.length === 0 ? (
            <p className="mt-4 text-sm text-ink/60">{t("noCarsOut")}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {outToday.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-offwhite px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-charcoal">{b.car_name}</p>
                    <p className="text-xs text-ink/60">
                      {b.customer_name} · {b.customer_phone}
                    </p>
                  </div>
                  <div className="text-end">
                    <Badge tone={paymentStatusTone(b.payment_status)}>
                      {b.payment_status === "paid" ? t("fullyPaid") : b.payment_status === "partial" ? t("partial") : t("unpaid")}
                    </Badge>
                    <p className="mt-1 text-xs text-ink/60">
                      {t("return")}: {formatTime(b.return_datetime)} · {formatPKR(b.balance_amount)} {t("pending")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Upcoming bookings alert */}
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line">
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
                    <p className="truncate text-sm font-semibold text-charcoal">{b.car_name}</p>
                    <p className="text-xs text-ink/60">
                      {b.customer_name} · {formatDateTime(b.pickup_datetime)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={bookingStatusTone(b.status)}>{t("upcoming")}</Badge>
                    <Link href={`/bookings/${b.id}`} className="text-xs font-semibold text-brand-dark underline">
                      {t("view")}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

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
