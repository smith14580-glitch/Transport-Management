"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { fetchCustomerSummaries } from "@/lib/api";
import type { CustomerSummary } from "@/lib/types";
import { formatPKR } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import {
  ConnectionError,
  EmptyState,
  LoadingState,
  PageHeader,
  inputClass,
} from "@/components/ui";

export default function CustomersPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      setRows(await fetchCustomerSummaries());
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

  const filtered = rows.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.full_name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  return (
    <div>
      <PageHeader
        title={t("customers")}
        subtitle="Har customer — kitni dafa rent liya, kitna pay kiya, kitna pending hai"
        actions={
          <div className="relative w-full sm:w-72">
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
        }
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ConnectionError error={error} onRetry={reload} />
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-stone-line">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-stone-line text-start text-xs uppercase tracking-wide text-ink/50">
                <th className="px-4 py-3 text-start">{t("customer")}</th>
                <th className="px-4 py-3 text-start">{t("phone")}</th>
                <th className="px-4 py-3 text-end">Times Rented</th>
                <th className="px-4 py-3 text-end">Total Rent</th>
                <th className="px-4 py-3 text-end">Total Paid</th>
                <th className="px-4 py-3 text-end">{t("pending")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.customer_id} className="border-b border-stone-line/60 hover:bg-offwhite">
                  <td className="px-4 py-3 font-medium text-charcoal">{c.full_name}</td>
                  <td className="px-4 py-3 text-ink/70">{c.phone}</td>
                  <td className="px-4 py-3 text-end text-charcoal">{c.total_bookings}</td>
                  <td className="px-4 py-3 text-end font-semibold text-charcoal">{formatPKR(c.total_rent_amount)}</td>
                  <td className="px-4 py-3 text-end text-emerald-700">{formatPKR(c.total_paid)}</td>
                  <td className={`px-4 py-3 text-end font-semibold ${c.total_pending > 0 ? "text-red-700" : "text-ink/50"}`}>
                    {formatPKR(c.total_pending)}
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
