"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RotateCcw, Save } from "lucide-react";
import { fetchSettings, resetDemoData, updateSettings } from "@/lib/api";
import type { BusinessSettings } from "@/lib/types";
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

export default function SettingsPage() {
  const { t } = useLanguage();
  const { canWrite } = useAuth();
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState(false);

  // form state
  const [businessName, setBusinessName] = useState("");
  const [phones, setPhones] = useState("");
  const [salePhone, setSalePhone] = useState("");
  const [address, setAddress] = useState("");
  const [wdHour, setWdHour] = useState("");
  const [wdDay, setWdDay] = useState("");
  const [sdHour, setSdHour] = useState("");
  const [sdDay, setSdDay] = useState("");

  const load = useCallback(async () => {
    try {
      const s = await fetchSettings();
      setSettings(s);
      setBusinessName(s.business_name);
      setPhones(s.phones.join(", "));
      setSalePhone(s.sale_purchase_phone);
      setAddress(s.address);
      setWdHour(String(s.default_rate_with_driver_hour));
      setWdDay(String(s.default_rate_with_driver_day));
      setSdHour(String(s.default_rate_self_hour));
      setSdDay(String(s.default_rate_self_day));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Settings load nahi ho saki.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Defer the first fetch to after mount so state updates land in an
    // async callback, not synchronously inside the effect body.
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) {
      setNotice("Demo View me settings save nahi hoti — pehle login karo.");
      return;
    }
    const rates = [wdHour, wdDay, sdHour, sdDay].map((v) => Number(v));
    if (rates.some((n) => Number.isNaN(n) || n < 0)) {
      setNotice("Rates me sahi number likho (0 ya zyada).");
      return;
    }
    setSaving(true);
    setNotice("");
    try {
      await updateSettings({
        business_name: businessName.trim() || "HK Transport",
        phones: phones.split(",").map((p) => p.trim()).filter(Boolean),
        sale_purchase_phone: salePhone.trim(),
        address: address.trim(),
        default_rate_with_driver_hour: rates[0],
        default_rate_with_driver_day: rates[1],
        default_rate_self_hour: rates[2],
        default_rate_self_day: rates[3],
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Save nahi ho saka.");
    } finally {
      setSaving(false);
    }
  }

  async function onReset() {
    if (!canWrite) {
      setNotice("Demo View me reset nahi hota — pehle login karo.");
      return;
    }
    if (!window.confirm("Demo data reset karna hai? Tumhari saari changes (nayi bookings, cars, payments) delete ho jayengi aur sample data wapas aa jayega.")) return;
    await resetDemoData();
    await load();
    setNotice("Demo data reset ho gaya — sample data wapas aa gaya hai.");
  }

  if (loading || !settings) return <LoadingState />;

  return (
    <div>
      <PageHeader title={t("settings")} subtitle="Business info aur default rates — yahan se tum khud prices set kar sakte ho" />

      {notice && (
        <p className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {notice}
        </p>
      )}
      {saved && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800" role="status">
          Settings save ho gayi.
        </p>
      )}

      <form onSubmit={onSave} className="grid gap-6 lg:grid-cols-2">
        {/* Business info */}
        <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line">
          <h2 className="font-display text-lg font-bold text-charcoal">Business Info</h2>
          <div>
            <label htmlFor="s-name" className={labelClass}>Business Name</label>
            <input id="s-name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="s-phones" className={labelClass}>Phones (comma se alag karo)</label>
            <input id="s-phones" value={phones} onChange={(e) => setPhones(e.target.value)} placeholder="0315-2776677, 0309-2531242" className={inputClass} />
          </div>
          <div>
            <label htmlFor="s-salephone" className={labelClass}>Sale &amp; Purchase Phone (2 Rist Transport)</label>
            <input id="s-salephone" value={salePhone} onChange={(e) => setSalePhone(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="s-address" className={labelClass}>{t("address")}</label>
            <input id="s-address" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
          </div>
        </section>

        {/* Price settings */}
        <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line">
          <h2 className="font-display text-lg font-bold text-charcoal">Default Rates (PKR)</h2>
          <p className="text-xs leading-relaxed text-ink/60">
            Ye default rates hain — jab kisi gaari ka apna rate set nahi hota to booking
            me yehi rate lagta hai. Per-car rate Fleet page se badlo. Abhi jo rates
            dikh rahe hain wo <strong>sample</strong> hain — apne asli rates yahan likho.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="s-wd-day" className={labelClass}>{t("withDriver")} — {t("perDay")}</label>
              <input id="s-wd-day" type="number" min={0} value={wdDay} onChange={(e) => setWdDay(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="s-wd-hr" className={labelClass}>{t("withDriver")} — {t("perHour")}</label>
              <input id="s-wd-hr" type="number" min={0} value={wdHour} onChange={(e) => setWdHour(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="s-sd-day" className={labelClass}>{t("selfDrive")} — {t("perDay")}</label>
              <input id="s-sd-day" type="number" min={0} value={sdDay} onChange={(e) => setSdDay(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="s-sd-hr" className={labelClass}>{t("selfDrive")} — {t("perHour")}</label>
              <input id="s-sd-hr" type="number" min={0} value={sdHour} onChange={(e) => setSdHour(e.target.value)} className={inputClass} />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-2 lg:col-span-2">
          <button type="submit" disabled={saving} className={goldButtonClass}>
            <Save className="h-4 w-4" />
            {saving ? t("loading") : t("save")}
          </button>
          <button type="button" onClick={onReset} className={secondaryButtonClass}>
            <RotateCcw className="h-4 w-4" />
            Reset Demo Data
          </button>
        </div>
      </form>
    </div>
  );
}
