"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Plus, ShoppingBag } from "lucide-react";
import { createSaleRecord } from "@/lib/api";
import type { PaymentMethod, SaleType } from "@/lib/types";
import { formatPKR, todayISO } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import {
  PageHeader,
  goldButtonClass,
  inputClass,
  labelClass,
  secondaryButtonClass,
} from "@/components/ui";

export default function NewSalePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { canWrite } = useAuth();
  const [type, setType] = useState<SaleType>("sale");
  const [carName, setCarName] = useState("");
  const [carDetails, setCarDetails] = useState("");
  const [partyName, setPartyName] = useState("");
  const [partyPhone, setPartyPhone] = useState("");
  const [price, setPrice] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [recordDate, setRecordDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const priceNum = Number(price) || 0;
  const paidNum = Number(amountPaid) || 0;
  const balance = Math.max(0, priceNum - paidNum);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!canWrite) {
      setError("Demo View me record save nahi hota — pehle login karo.");
      return;
    }
    if (!carName.trim() || !partyName.trim()) {
      setError("Gaari ka naam aur party ka naam likhna zaroori hai.");
      return;
    }
    if (priceNum <= 0) {
      setError("Sahi price likho.");
      return;
    }
    if (paidNum < 0 || paidNum > priceNum) {
      setError(`Paid amount 0 se ${formatPKR(priceNum)} ke beech me ho.`);
      return;
    }
    setSaving(true);
    try {
      await createSaleRecord({
        type,
        car_name: carName.trim(),
        car_details: carDetails.trim() || undefined,
        party_name: partyName.trim(),
        party_phone: partyPhone.trim() || undefined,
        price: priceNum,
        amount_paid: paidNum,
        payment_method: method,
        record_date: recordDate,
        notes: notes.trim() || undefined,
      });
      router.push("/records/sales");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Record save nahi ho saka.");
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={t("addSale")}
        subtitle="Gaari bechi ya khareedi — sale & purchase record (2 Rist Transport)"
        actions={
          <Link href="/records/sales" className={secondaryButtonClass}>
            {t("back")}
          </Link>
        }
      />

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line lg:col-span-2">
          <div>
            <span className={labelClass}>Type *</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("sale")}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ring-1 ${
                  type === "sale" ? "bg-emerald-700 text-white ring-emerald-700" : "bg-white text-charcoal ring-stone-line"
                }`}
                aria-pressed={type === "sale"}
              >
                <ShoppingBag className="h-4 w-4" />
                {t("sale")} (bechi)
              </button>
              <button
                type="button"
                onClick={() => setType("purchase")}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ring-1 ${
                  type === "purchase" ? "bg-sky-700 text-white ring-sky-700" : "bg-white text-charcoal ring-stone-line"
                }`}
                aria-pressed={type === "purchase"}
              >
                <ShoppingBag className="h-4 w-4" />
                {t("purchase")} (khareedi)
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="car" className={labelClass}>{t("car")} *</label>
              <input id="car" value={carName} onChange={(e) => setCarName(e.target.value)} placeholder="e.g. Toyota Corolla 2018" className={inputClass} />
            </div>
            <div>
              <label htmlFor="cardet" className={labelClass}>Car Details</label>
              <input id="cardet" value={carDetails} onChange={(e) => setCarDetails(e.target.value)} placeholder="e.g. 1.8 Grande, 62,000 km" className={inputClass} />
            </div>
            <div>
              <label htmlFor="party" className={labelClass}>{t("party")} {t("name")} *</label>
              <input id="party" value={partyName} onChange={(e) => setPartyName(e.target.value)} placeholder={type === "sale" ? "Kis ko bechi" : "Kis se khareedi"} className={inputClass} />
            </div>
            <div>
              <label htmlFor="pphone" className={labelClass}>{t("party")} {t("phone")}</label>
              <input id="pphone" type="tel" value={partyPhone} onChange={(e) => setPartyPhone(e.target.value)} placeholder="03xx-xxxxxxx" className={inputClass} />
            </div>
            <div>
              <label htmlFor="price" className={labelClass}>{t("price")} (PKR) *</label>
              <input id="price" type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="paid" className={labelClass}>{t("paid")} (PKR)</label>
              <input id="paid" type="number" min={0} value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="method" className={labelClass}>{t("method")} *</label>
              <select id="method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={inputClass}>
                <option value="cash">{t("cash")}</option>
                <option value="bank">{t("bank")}</option>
                <option value="split">{t("split")}</option>
              </select>
            </div>
            <div>
              <label htmlFor="date" className={labelClass}>{t("date")} *</label>
              <input id="date" type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className={labelClass}>Notes</label>
            <input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Sold via 2 Rist Transport" className={inputClass} />
          </div>

          {error && (
            <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          <button type="submit" disabled={saving} className={`${goldButtonClass} w-full`}>
            <Plus className="h-4 w-4" />
            {saving ? t("loading") : "Save Record"}
          </button>
        </div>

        <aside className="h-fit rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line">
          <h2 className="font-display text-lg font-bold text-charcoal">Summary</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-ink/60">{t("price")}</dt>
              <dd className="font-display text-lg font-bold text-charcoal">{formatPKR(priceNum)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink/60">{t("paid")}</dt>
              <dd className="font-semibold text-emerald-700">{formatPKR(paidNum)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink/60">{t("pending")}</dt>
              <dd className="font-semibold text-red-700">{formatPKR(balance)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-ink/50">
            Sale &amp; purchase 2 Rist Transport ke through hoti hai (Shop B-14, 0317-2873887).
            Balance pending rahe to record &quot;Pending&quot; dikhega.
          </p>
        </aside>
      </form>
    </div>
  );
}
