"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { fetchBookings } from "@/lib/api";
import type { Booking, BookingStatus } from "@/lib/types";
import { formatDateTime, formatPKR } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import {
  Badge,
  ConnectionError,
  EmptyState,
  LoadingState,
  PageHeader,
  bookingStatusTone,
  goldButtonClass,
  inputClass,
  paymentStatusTone,
} from "@/components/ui";

const FILTERS: { value: string; labelKey: string }[] = [
  { value: "all", labelKey: "all" },
  { value: "upcoming", labelKey: "upcoming" },
  { value: "active", labelKey: "active" },
  { value: "completed", labelKey: "completed" },
  { value: "cancelled", labelKey: "cancelled" },
];

export default function BookingsPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBookings({
        status: filter === "all" ? undefined : (filter as BookingStatus),
        search: search || undefined,
      });
      setRows(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div>
      <PageHeader
        title={t("bookings")}
        subtitle="Rent bookings — filter by status, search by customer, car or code"
        actions={
          <Link href="/bookings/new" className={goldButtonClass}>
            <Plus className="h-4 w-4" />
            {t("newBooking")}
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
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
        <ConnectionError error={error} onRetry={() => void load()} />
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-stone-line">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-stone-line text-start text-xs uppercase tracking-wide text-ink/50">
                <th className="px-4 py-3 text-start">Code</th>
                <th className="px-4 py-3 text-start">{t("customer")}</th>
                <th className="px-4 py-3 text-start">{t("car")}</th>
                <th className="px-4 py-3 text-start">{t("pickup")}</th>
                <th className="px-4 py-3 text-start">{t("return")}</th>
                <th className="px-4 py-3 text-end">{t("total")}</th>
                <th className="px-4 py-3 text-start">{t("status")}</th>
                <th className="px-4 py-3 text-start">{t("paymentStatus")}</th>
                <th className="px-4 py-3 text-end">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className="border-b border-stone-line/60 hover:bg-offwhite">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-charcoal">{b.booking_code}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-charcoal">{b.customer_name}</p>
                    <p className="text-xs text-ink/60">{b.customer_phone}</p>
                  </td>
                  <td className="px-4 py-3 text-charcoal">{b.car_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink/70">{formatDateTime(b.pickup_datetime)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink/70">{formatDateTime(b.return_datetime)}</td>
                  <td className="px-4 py-3 text-end font-semibold text-charcoal">{formatPKR(b.total_amount)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={bookingStatusTone(b.status)}>
                      {b.status === "upcoming" ? t("upcoming") : b.status === "active" ? t("active") : b.status === "completed" ? t("completed") : t("cancelled")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={paymentStatusTone(b.payment_status)}>
                      {b.payment_status === "paid" ? t("fullyPaid") : b.payment_status === "partial" ? t("partial") : t("unpaid")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-end">
                    <Link href={`/bookings/${b.id}`} className="font-semibold text-brand-dark underline">
                      {t("view")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
