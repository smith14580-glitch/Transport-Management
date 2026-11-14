"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { fetchSaleRecords } from "@/lib/api";
import type { SaleRecord } from "@/lib/types";
import { formatDate, formatPKR } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import {
  Badge,
  ConnectionError,
  EmptyState,
  LoadingState,
  PageHeader,
  goldButtonClass,
} from "@/components/ui";

export default function SalesRecordsPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [filter, setFilter] = useState<"all" | "sale" | "purchase">("all");

  const load = useCallback(async () => {
    try {
      setRows(await fetchSaleRecords());
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

  const filtered = filter === "all" ? rows : rows.filter((r) => r.type === filter);
  const totalSales = rows.filter((r) => r.type === "sale").reduce((s, r) => s + r.price, 0);
  const totalPurchases = rows.filter((r) => r.type === "purchase").reduce((s, r) => s + r.price, 0);
  const totalPending = rows.reduce((s, r) => s + r.balance_amount, 0);

  return (
    <div>
      <PageHeader
        title={t("salesRecords")}
        subtitle={`Car sale & purchase — Sales ${formatPKR(totalSales)} · Purchases ${formatPKR(totalPurchases)} · Pending ${formatPKR(totalPending)} (via 2 Rist Transport)`}
        actions={
          <Link href="/sales/new" className={goldButtonClass}>
            <Plus className="h-4 w-4" />
            {t("addSale")}
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "sale", "purchase"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              filter === f ? "bg-charcoal text-white" : "bg-white text-charcoal ring-1 ring-stone-line hover:bg-offwhite"
            }`}
            aria-pressed={filter === f}
          >
            {f === "all" ? t("all") : f === "sale" ? t("sale") : t("purchase")}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ConnectionError error={error} onRetry={reload} />
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-stone-line">
          <table className="w-full min-w-[780px] text-sm">
            <thead>
              <tr className="border-b border-stone-line text-start text-xs uppercase tracking-wide text-ink/50">
                <th className="px-4 py-3 text-start">{t("date")}</th>
                <th className="px-4 py-3 text-start">Type</th>
                <th className="px-4 py-3 text-start">{t("car")}</th>
                <th className="px-4 py-3 text-start">{t("party")}</th>
                <th className="px-4 py-3 text-end">{t("price")}</th>
                <th className="px-4 py-3 text-end">{t("paid")}</th>
                <th className="px-4 py-3 text-end">{t("pending")}</th>
                <th className="px-4 py-3 text-start">{t("method")}</th>
                <th className="px-4 py-3 text-start">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-stone-line/60 hover:bg-offwhite">
                  <td className="px-4 py-3 whitespace-nowrap text-ink/70">{formatDate(r.record_date)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={r.type === "sale" ? "green" : "blue"}>
                      {r.type === "sale" ? t("sale") : t("purchase")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-charcoal">{r.car_name}</p>
                    {r.car_details && <p className="text-xs text-ink/60">{r.car_details}</p>}
                    {r.notes && <p className="text-xs text-ink/60">{r.notes}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-charcoal">{r.party_name}</p>
                    {r.party_phone && <p className="text-xs text-ink/60">{r.party_phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-end font-semibold text-charcoal">{formatPKR(r.price)}</td>
                  <td className="px-4 py-3 text-end text-emerald-700">{formatPKR(r.amount_paid)}</td>
                  <td className="px-4 py-3 text-end font-semibold text-red-700">{formatPKR(r.balance_amount)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={r.payment_method === "cash" ? "green" : r.payment_method === "bank" ? "blue" : "gold"}>
                      {r.payment_method === "cash" ? t("cash") : r.payment_method === "bank" ? t("bank") : t("split")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={r.status === "completed" ? "green" : "amber"}>
                      {r.status === "completed" ? t("completed") : t("pending")}
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
