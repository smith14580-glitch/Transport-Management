"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, Ban, CheckCircle2, Pencil, Plus, Wallet } from "lucide-react";
import {
  assignDriver,
  cancelBooking,
  completeBooking,
  fetchBooking,
  fetchBookingPayments,
  fetchDrivers,
  fetchSettings,
  recordPayment,
  updateBooking,
} from "@/lib/api";
import type { Booking, BusinessSettings, Driver, Payment } from "@/lib/types";
import { formatDate, formatDateTime, formatPKR, todayISO } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import {
  Badge,
  ConnectionError,
  EmptyState,
  LoadingState,
  Modal,
  PageHeader,
  bookingStatusTone,
  dangerButtonClass,
  goldButtonClass,
  inputClass,
  labelClass,
  paymentStatusTone,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui";

export default function BookingDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const router = useRouter();
  const { t } = useLanguage();
  const { canWrite } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // record payment form
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "bank" | "split">("cash");
  const [payCash, setPayCash] = useState("");
  const [payBank, setPayBank] = useState("");
  const [payDate, setPayDate] = useState(todayISO());
  const [payRef, setPayRef] = useState("");

  // edit form
  const [editReturn, setEditReturn] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [reassignId, setReassignId] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const [b, pays, drvs, s] = await Promise.all([fetchBooking(id), fetchBookingPayments(id), fetchDrivers(), fetchSettings()]);
      setBooking(b);
      setPayments(pays);
      setDrivers(drvs);
      setSettings(s);
      setEditReturn(b.return_datetime.slice(0, 16));
      setEditNotes(b.notes || "");
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

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

  function lateInfo(b: Booking | null) {
    if (!b || b.status !== "active") return { late: false, hours: 0, penalty: 0 };
    // eslint-disable-next-line react-hooks/purity
    const ms = Date.now() - new Date(b.return_datetime).getTime();
    if (ms <= 0) return { late: false, hours: 0, penalty: 0 };
    const hours = Math.ceil(ms / 3600000);
    const penalty = settings?.late_penalty_enabled ? hours * (settings.late_return_penalty_per_hour || 0) : 0;
    return { late: true, hours, penalty };
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!booking || !guardWrite()) return;
    const amount = Number(payAmount) || 0;
    if (amount <= 0) {
      setNotice("Amount 0 se zyada ho.");
      return;
    }
    if (amount > booking.balance_amount) {
      setNotice(`Amount balance (${formatPKR(booking.balance_amount)}) se zyada hai.`);
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
      await recordPayment(booking.id, {
        amount,
        method: payMethod,
        cash_amount: cash,
        bank_amount: bank,
        payment_date: payDate,
        reference: payRef.trim() || undefined,
      });
      setPayOpen(false);
      setPayAmount("");
      setPayCash("");
      setPayBank("");
      setPayRef("");
      setNotice("");
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Payment save nahi ho saki.");
    }
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!booking || !guardWrite()) return;
    if (editReturn && new Date(editReturn).getTime() <= new Date(booking.pickup_datetime).getTime()) {
      setNotice("Return pickup se baad me ho.");
      return;
    }
    try {
      await updateBooking(booking.id, {
        return_datetime: editReturn ? `${editReturn}:00` : booking.return_datetime,
        notes: editNotes.trim() || null,
      });
      setEditOpen(false);
      setNotice("");
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Update nahi ho saka.");
    }
  }

  async function doCancel() {
    if (!booking || !guardWrite()) return;
    if (!window.confirm("Ye booking cancel karni hai?")) return;
    await cancelBooking(booking.id, "Cancelled by manager");
    await load();
  }

  async function doComplete() {
    if (!booking || !guardWrite()) return;
    await completeBooking(booking.id);
    await load();
  }

  if (loading) return <LoadingState />;
  if (error) return <ConnectionError error={error} onRetry={reload} />;
  if (!booking) return <EmptyState />;

  return (
    <div>
      <PageHeader
        title={`${booking.booking_code} — ${booking.car_name}`}
        subtitle={`${booking.customer_name} · ${booking.customer_phone}`}
        actions={
          <>
            <Link href="/bookings" className={secondaryButtonClass}>
              {t("back")}
            </Link>
            <button type="button" onClick={() => setEditOpen(true)} className={secondaryButtonClass}>
              <Pencil className="h-4 w-4" />
              {t("edit")}
            </button>
          </>
        }
      />

      {notice && (
        <p className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {notice}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            <Badge tone={bookingStatusTone(booking.status)}>
              {booking.status === "upcoming" ? t("upcoming") : booking.status === "active" ? t("active") : booking.status === "completed" ? t("completed") : t("cancelled")}
            </Badge>
            <Badge tone={paymentStatusTone(booking.payment_status)}>
              {booking.payment_status === "paid" ? t("fullyPaid") : booking.payment_status === "partial" ? t("partial") : t("unpaid")}
            </Badge>
            <Badge tone="gold">
              {booking.driver_option === "with_driver" ? t("withDriver") : t("selfDrive")}
            </Badge>
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-ink/50">{t("pickup")}</dt><dd className="font-semibold text-charcoal">{formatDateTime(booking.pickup_datetime)}</dd></div>
            <div><dt className="text-ink/50">{t("return")}</dt><dd className="font-semibold text-charcoal">{formatDateTime(booking.return_datetime)}</dd></div>
            <div><dt className="text-ink/50">Duration</dt><dd className="font-semibold text-charcoal">{booking.duration_value} {booking.duration_unit} @ {formatPKR(booking.rate_per_unit)}</dd></div>
            <div><dt className="text-ink/50">Payment Plan</dt><dd className="font-semibold text-charcoal">{booking.payment_plan === "full_cash" ? t("fullCash") : booking.payment_plan === "full_bank" ? t("fullBank") : booking.payment_plan === "half_cash_half_bank" ? t("halfCashHalfBank") : t("halfNowHalfLater")}</dd></div>
            <div><dt className="text-ink/50">{t("total")}</dt><dd className="font-display text-lg font-bold text-charcoal">{formatPKR(booking.total_amount)}</dd></div>
            <div><dt className="text-ink/50">{t("paid")}</dt><dd className="font-semibold text-emerald-700">{formatPKR(booking.amount_paid)}</dd></div>
            <div><dt className="text-ink/50">{t("balance")}</dt><dd className="font-semibold text-red-700">{formatPKR(booking.balance_amount)}</dd></div>
            {(() => {
              const info = lateInfo(booking);
              if (booking.status === "active" && info.late) {
                return (
                  <div className="sm:col-span-2">
                    <dt className="text-ink/50">{t("latePenalty")}</dt>
                    <dd className="font-semibold text-red-700">
                      {formatPKR(info.penalty)} — {info.hours} {t("hoursLateSuffix")}
                    </dd>
                  </div>
                );
              }
              if (booking.late_penalty_amount && booking.late_penalty_amount > 0) {
                return (
                  <div className="sm:col-span-2">
                    <dt className="text-ink/50">{t("latePenalty")}</dt>
                    <dd className="font-semibold text-red-700">
                      {formatPKR(booking.late_penalty_amount)} ({t("completedWithPenalty")})
                    </dd>
                  </div>
                );
              }
              return null;
            })()}
            {booking.notes && <div className="sm:col-span-2"><dt className="text-ink/50">Notes</dt><dd className="font-medium text-charcoal">{booking.notes}</dd></div>}
          </dl>

          {booking.driver_option === "with_driver" && (
            <div className="space-y-3 border-t border-stone-line pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-charcoal">{t("driverAssigned")}:</span>
                {booking.driver_id ? (
                  <>
                    {(() => {
                      const drv = drivers.find((d) => d.id === booking.driver_id);
                      return drv?.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={drv.photo} alt={drv.full_name} className="h-8 w-8 rounded-full object-cover ring-1 ring-stone-line" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-light text-xs font-bold text-brand-dark">
                          {(booking.driver_name || "?").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                      );
                    })()}
                    <Link href={`/drivers/${booking.driver_id}`} className="font-semibold text-brand-dark underline">
                      {booking.driver_name || t("noDriver")}
                    </Link>
                  </>
                ) : (
                  <span className="text-sm text-ink/60">{t("noDriver")}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={reassignId}
                  onChange={(e) => setReassignId(e.target.value)}
                  className={`${inputClass} max-w-xs`}
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
                <button
                  type="button"
                  disabled={!reassignId || !canWrite}
                  onClick={async () => {
                    if (!booking || !guardWrite()) return;
                    try {
                      await assignDriver(booking.id, reassignId);
                      setReassignId("");
                      setNotice("");
                      await load();
                    } catch (err) {
                      setNotice(err instanceof Error ? err.message : "Re-assign nahi ho saka.");
                    }
                  }}
                  className={secondaryButtonClass}
                >
                  {t("reassignDriver")}
                </button>
                {booking.driver_id && (
                  <button
                    type="button"
                    disabled={!canWrite}
                    onClick={async () => {
                      if (!booking || !guardWrite()) return;
                      try {
                        await assignDriver(booking.id, null);
                        setNotice("");
                        await load();
                      } catch (err) {
                        setNotice(err instanceof Error ? err.message : "Remove nahi ho saka.");
                      }
                    }}
                    className={dangerButtonClass}
                  >
                    {t("removeDriver")}
                  </button>
                )}
              </div>
              <p className="text-xs text-ink/50">{t("onlyAvailable")}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t border-stone-line pt-4">
            {booking.balance_amount > 0 && booking.status !== "cancelled" && (
              <button type="button" onClick={() => setPayOpen(true)} className={goldButtonClass}>
                <Wallet className="h-4 w-4" />
                {t("recordPayment")}
              </button>
            )}
            {booking.status === "active" && (
              <button type="button" onClick={doComplete} className={primaryButtonClass}>
                <CheckCircle2 className="h-4 w-4" />
                Mark Completed
              </button>
            )}
            {booking.status !== "cancelled" && booking.status !== "completed" && (
              <button type="button" onClick={doCancel} className={dangerButtonClass}>
                <Ban className="h-4 w-4" />
                Cancel Booking
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                const link = `${window.location.origin}/track/${booking.booking_code}`;
                try {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  window.prompt("Copy this link:", link);
                }
              }}
              className={secondaryButtonClass}
            >
              {copied ? t("copied") : t("shareTrackingLink")}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Track trip: ${window.location.origin}/track/${booking.booking_code}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={secondaryButtonClass}
            >
              {t("whatsappShare")}
            </a>
          </div>
        </section>

        {/* Payments for this booking */}
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line">
          <h2 className="font-display text-lg font-bold text-charcoal">Payments</h2>
          {payments.length === 0 ? (
            <p className="mt-3 text-sm text-ink/60">Abhi koi payment nahi hai.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {payments.map((p) => (
                <li key={p.id} className="rounded-lg bg-offwhite px-3 py-2.5 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold text-charcoal">{formatPKR(p.amount)}</span>
                    <Badge tone={p.method === "cash" ? "green" : p.method === "bank" ? "blue" : "gold"}>
                      {p.method === "cash" ? t("cash") : p.method === "bank" ? t("bank") : t("split")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-ink/60">
                    {formatDate(p.payment_date)}
                    {p.method === "split" ? ` · Cash ${formatPKR(p.cash_amount)} + Bank ${formatPKR(p.bank_amount)}` : ""}
                    {p.reference ? ` · ${p.reference}` : ""}
                  </p>
                  {p.notes && <p className="text-xs text-ink/60">{p.notes}</p>}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => router.push("/payments")}
            className={`${secondaryButtonClass} mt-4 w-full`}
          >
            All Payments →
          </button>
        </section>
      </div>

      {/* Record payment modal */}
      {payOpen && (
        <Modal title={t("recordPayment")} onClose={() => setPayOpen(false)}>
          <form onSubmit={submitPayment} className="space-y-4">
            <p className="text-sm text-ink/60">
              Balance: <strong className="text-red-700">{formatPKR(booking.balance_amount)}</strong>
            </p>
            <div>
              <label htmlFor="pamount" className={labelClass}>{t("amount")} (PKR) *</label>
              <input id="pamount" type="number" min={1} max={booking.balance_amount} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className={inputClass} />
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="pdate" className={labelClass}>{t("date")} *</label>
                <input id="pdate" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="pref" className={labelClass}>Reference (optional)</label>
                <input id="pref" value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="TRX-…" className={inputClass} />
              </div>
            </div>
            <button type="submit" className={`${goldButtonClass} w-full`}>
              <Plus className="h-4 w-4" />
              Save Payment
            </button>
          </form>
        </Modal>
      )}

      {/* Edit modal */}
      {editOpen && (
        <Modal title={`${t("edit")} — ${booking.booking_code}`} onClose={() => setEditOpen(false)}>
          <form onSubmit={submitEdit} className="space-y-4">
            <div>
              <label htmlFor="ereturn" className={labelClass}>{t("return")} (date + time)</label>
              <input id="ereturn" type="datetime-local" value={editReturn} onChange={(e) => setEditReturn(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="enotes" className={labelClass}>Notes</label>
              <input id="enotes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className={inputClass} />
            </div>
            <button type="submit" className={`${goldButtonClass} w-full`}>
              {t("save")}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
