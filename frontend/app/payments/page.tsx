"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Wallet } from "lucide-react";
import {
  fetchOutstandingBookings,
  fetchPayments,
  recordPayment,
} from "@/lib/api";
import type { Booking, Payment } from "@/lib/types";
import { formatDate, formatPKR, todayISO } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import {
  Badge,
  ConnectionError,
  EmptyState,
  LoadingState,
  Modal,
  PageHeader,
  goldButtonClass,
  inputClass,
  labelClass,
  secondaryButtonClass,
} from "@/components/ui";

export default function PaymentsPage() {
  const { t } = useLanguage();
  const { canWrite } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [outstanding, setOutstanding] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [pendingOnly, setPendingOnly] = useState(false);
  const [notice, setNotice] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [payBooking, setPayBooking] = useState<Booking | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "bank" | "split">("cash");
  const [payCash, setPayCash] = useState("");
  const [payBank, setPayBank] = useState("");
  const [payDate, setPayDate] = useState(todayISO());

  const load = useCallback(async () => {
    try {
      const [pays, out] = await Promise.all([fetchPayments(), fetchOutstandingBookings()]);
      setPayments(pays);
      setOutstanding(out);
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

  function openPay(booking: Booking) {
    if (!canWrite) {
      setNotice("Demo View me payment record nahi hoti — pehle login karo.");
      return;
    }
    setPayBooking(booking);
    setPayAmount(String(booking.balance_amount));
    setPayMethod("cash");
    setPayCash("");
    setPayBank("");
    setPayDate(todayISO());
    setPayOpen(true);
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payBooking) return;
    const amount = Number(payAmount) || 0;
    if (amount <= 0 || amount > payBooking.balance_amount) {
      setNotice(`Amount 1 se ${formatPKR(payBooking.balance_amount)} ke beech me ho.`);
      return;
    }
    let cash = amount;
    let bank = 0;
    if (payMethod === "bank") {
      cash = 0;
      bank = amount;
    } else if (payMethod === "split") {
      cash = Number(payCash) || 0;
      bank = Number(payBank) || 0;
      if (cash + bank !== amount) {
        setNotice("Cash + Bank ka total amount ke barabar ho.");
        return;
      }
    }
    try {
      await recordPayment(payBooking.id, {
        amount,
        method: payMethod,
        cash_amount: cash,
        bank_amount: bank,
        payment_date: payDate,
      });
      setPayOpen(false);
      setNotice("");
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Payment save nahi ho saki.");
    }
  }

  const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
  const totalPending = outstanding.reduce((s, b) => s + b.balance_amount, 0);

  return (
    <div>
      <PageHeader
        title={t("payments")}
        subtitle={`Collected ${formatPKR(totalCollected)} · Pending ${formatPKR(totalPending)}`}
        actions={
          <button
            type="button"
            onClick={() => setPendingOnly(!pendingOnly)}
            className={secondaryButtonClass}
            aria-pressed={pendingOnly}
          >
            <Wallet className="h-4 w-4" />
            {pendingOnly ? "All Payments" : "Pending Only"}
          </button>
        }
      />

      {notice && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
          {notice}
        </p>
      )}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ConnectionError error={error} onRetry={reload} />
      ) : pendingOnly ? (
        outstanding.length === 0 ? (
          <EmptyState message="Koi pending payment nahi hai — sab clear hai." />
        ) : (
          <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-stone-line">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-stone-line text-start text-xs uppercase tracking-wide text-ink/50">
                  <th className="px-4 py-3 text-start">Booking</th>
                  <th className="px-4 py-3 text-start">{t("customer")}</th>
                  <th className="px-4 py-3 text-end">{t("total")}</th>
                  <th className="px-4 py-3 text-end">{t("paid")}</th>
                  <th className="px-4 py-3 text-end">{t("pending")}</th>
                  <th className="px-4 py-3 text-end">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {outstanding.map((b) => (
                  <tr key={b.id} className="border-b border-stone-line/60 hover:bg-offwhite">
                    <td className="px-4 py-3">
                      <Link href={`/bookings/${b.id}`} className="font-mono text-xs font-semibold text-brand-dark underline">
                        {b.booking_code}
                      </Link>
                      <p className="text-xs text-ink/60">{b.car_name}</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-charcoal">{b.customer_name}</td>
                    <td className="px-4 py-3 text-end text-charcoal">{formatPKR(b.total_amount)}</td>
                    <td className="px-4 py-3 text-end text-emerald-700">{formatPKR(b.amount_paid)}</td>
                    <td className="px-4 py-3 text-end font-semibold text-red-700">{formatPKR(b.balance_amount)}</td>
                    <td className="px-4 py-3 text-end">
                      <button type="button" onClick={() => openPay(b)} className={goldButtonClass}>
                        <Plus className="h-4 w-4" />
                        {t("recordPayment")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : payments.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-stone-line">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-stone-line text-start text-xs uppercase tracking-wide text-ink/50">
                <th className="px-4 py-3 text-start">{t("date")}</th>
                <th className="px-4 py-3 text-start">{t("customer")}</th>
                <th className="px-4 py-3 text-start">Booking / Sale</th>
                <th className="px-4 py-3 text-start">{t("method")}</th>
                <th className="px-4 py-3 text-end">Cash</th>
                <th className="px-4 py-3 text-end">Bank</th>
                <th className="px-4 py-3 text-end">{t("amount")}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-stone-line/60 hover:bg-offwhite">
                  <td className="px-4 py-3 whitespace-nowrap text-ink/70">{formatDate(p.payment_date)}</td>
                  <td className="px-4 py-3 font-medium text-charcoal">{p.customer_name}</td>
                  <td className="px-4 py-3">
                    {p.booking_code ? (
                      <span className="font-mono text-xs font-semibold text-charcoal">{p.booking_code}</span>
                    ) : (
                      <span className="text-xs text-ink/60">Sale</span>
                    )}
                    {p.notes && <p className="text-xs text-ink/60">{p.notes}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={p.method === "cash" ? "green" : p.method === "bank" ? "blue" : "gold"}>
                      {p.method === "cash" ? t("cash") : p.method === "bank" ? t("bank") : t("split")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-end text-charcoal">{formatPKR(p.cash_amount)}</td>
                  <td className="px-4 py-3 text-end text-charcoal">{formatPKR(p.bank_amount)}</td>
                  <td className="px-4 py-3 text-end font-semibold text-charcoal">{formatPKR(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {payOpen && payBooking && (
        <Modal title={`${t("recordPayment")} — ${payBooking.booking_code}`} onClose={() => setPayOpen(false)}>
          <form onSubmit={submitPayment} className="space-y-4">
            <p className="text-sm text-ink/60">
              {payBooking.customer_name} · Balance:{" "}
              <strong className="text-red-700">{formatPKR(payBooking.balance_amount)}</strong>
            </p>
            <div>
              <label htmlFor="pamount" className={labelClass}>{t("amount")} (PKR) *</label>
              <input id="pamount" type="number" min={1} max={payBooking.balance_amount} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="pmethod" className={labelClass}>{t("method")} *</label>
              <select id="pmethod" value={payMethod} onChange={(e) => setPayMethod(e.target.value as "cash" | "bank" | "split")} className={inputClass}>
                <option value="cash">{t("cash")}</option>
                <option value="bank">{t("bank")}</option>
                <option value="split">{t("split")}</option>
              </select>
            </div>
            {payMethod === "split" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pcash" className={labelClass}>Cash (PKR)</label>
                  <input id="pcash" type="number" min={0} value={payCash} onChange={(e) => setPayCash(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="pbank" className={labelClass}>Bank (PKR)</label>
                  <input id="pbank" type="number" min={0} value={payBank} onChange={(e) => setPayBank(e.target.value)} className={inputClass} />
                </div>
              </div>
            )}
            <div>
              <label htmlFor="pdate" className={labelClass}>{t("date")} *</label>
              <input id="pdate" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className={inputClass} />
            </div>
            <button type="submit" className={`${goldButtonClass} w-full`}>
              <Plus className="h-4 w-4" />
              Save Payment
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
