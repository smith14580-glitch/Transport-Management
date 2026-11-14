"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchRentRecords } from "@/lib/api";
import type { Booking } from "@/lib/types";
import { formatDateTime, formatPKR } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import {
  Badge,
  ConnectionError,
  EmptyState,
  LoadingState,
  PageHeader,
  bookingStatusTone,
  paymentStatusTone,
} from "@/components/ui";

export default function RentRecordsPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    try {
      setRows(await fetchRentRecords());
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

  const totalRent = rows
    .filter((b) => b.status !== "cancelled")
    .reduce((s, b) => s + b.total_amount, 0);
  const totalPaid = rows.reduce((s, b) => s + b.amount_paid, 0);

  return (
    <div>
      <PageHeader
        title={t("rentRecords")}
        subtitle={`Full rent history — ${rows.length} bookings · Total rent ${formatPKR(totalRent)} · Collected ${formatPKR(totalPaid)}`}
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ConnectionError error={error} onRetry={reload} />
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-stone-line">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-stone-line text-start text-xs uppercase tracking-wide text-ink/50">
                <th className="px-4 py-3 text-start">Code</th>
                <th className="px-4 py-3 text-start">{t("car")}</th>
                <th className="px-4 py-3 text-start">{t("customer")}</th>
                <th className="px-4 py-3 text-start">{t("pickup")}</th>
                <th className="px-4 py-3 text-start">{t("return")}</th>
                <th className="px-4 py-3 text-end">{t("total")}</th>
                <th className="px-4 py-3 text-end">{t("paid")}</th>
                <th className="px-4 py-3 text-end">{t("pending")}</th>
                <th className="px-4 py-3 text-start">{t("status")}</th>
                <th className="px-4 py-3 text-start">{t("paymentStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className="border-b border-stone-line/60 hover:bg-offwhite">
                  <td className="px-4 py-3">
                    <Link href={`/bookings/${b.id}`} className="font-mono text-xs font-semibold text-brand-dark underline">
                      {b.booking_code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-charcoal">{b.car_name}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-charcoal">{b.customer_name}</p>
                    <p className="text-xs text-ink/60">{b.customer_phone}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink/70">{formatDateTime(b.pickup_datetime)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink/70">{formatDateTime(b.return_datetime)}</td>
                  <td className="px-4 py-3 text-end font-semibold text-charcoal">{formatPKR(b.total_amount)}</td>
                  <td className="px-4 py-3 text-end text-emerald-700">{formatPKR(b.amount_paid)}</td>
                  <td className="px-4 py-3 text-end font-semibold text-red-700">{formatPKR(b.balance_amount)}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
