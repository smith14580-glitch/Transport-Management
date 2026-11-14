"use client";

import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { Driver, DriverStatus } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";
import { todayISO } from "@/lib/format";
import {
  goldButtonClass,
  inputClass,
  labelClass,
  secondaryButtonClass,
} from "@/components/ui";

interface Props {
  initial?: Driver | null;
  onSubmit: (body: Omit<Driver, "id">) => Promise<void>;
  saving: boolean;
  setSaving: (v: boolean) => void;
}

const CNIC_RE = /^\d{5}-\d{7}-\d{1}$/;

function ageFromDob(dob: string): number {
  if (!dob) return 0;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 ? age : 0;
}

export function DriverForm({ initial, onSubmit, saving, setSaving }: Props) {
  const { t } = useLanguage();
  const [fullName, setFullName] = useState(initial?.full_name || "");
  const [dob, setDob] = useState(initial?.date_of_birth || "");
  const [age, setAge] = useState(initial?.age || (initial?.date_of_birth ? ageFromDob(initial.date_of_birth) : 0));
  const [cnic, setCnic] = useState(initial?.cnic || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [licenceNo, setLicenceNo] = useState(initial?.licence_no || "");
  const [licenceExpiry, setLicenceExpiry] = useState(initial?.licence_expiry?.slice(0, 10) || "");
  const [address, setAddress] = useState(initial?.address || "");
  const [emergency, setEmergency] = useState(initial?.emergency_contact || "");
  const [status, setStatus] = useState<DriverStatus>(initial?.status || "available");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [photo, setPhoto] = useState<string | null>(initial?.photo || null);
  const [error, setError] = useState("");

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 256;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setPhoto(String(reader.result || ""));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setPhoto(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) {
      setError("Naam likhna zaroori hai.");
      return;
    }
    if (!CNIC_RE.test(cnic.trim())) {
      setError(t("cnicFormat"));
      return;
    }
    if (!phone.trim()) {
      setError("Phone likhna zaroori hai.");
      return;
    }
    if (!licenceNo.trim()) {
      setError("Licence number likhna zaroori hai.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        full_name: fullName.trim(),
        age: age || ageFromDob(dob),
        date_of_birth: dob,
        cnic: cnic.trim(),
        phone: phone.trim(),
        licence_no: licenceNo.trim(),
        licence_expiry: licenceExpiry || todayISO(),
        address: address.trim() || null,
        emergency_contact: emergency.trim() || null,
        status,
        notes: notes.trim() || null,
        photo,
        created_at: initial?.created_at || todayISO(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save nahi ho saka.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-5 rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line lg:col-span-2">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="d-name" className={labelClass}>{t("fullName")} *</label>
            <input id="d-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="d-dob" className={labelClass}>{t("dateOfBirth")}</label>
            <input id="d-dob" type="date" value={dob} onChange={(e) => { setDob(e.target.value); setAge(ageFromDob(e.target.value)); }} className={inputClass} />
            <p className="mt-1 text-xs text-ink/50">{t("ageAuto")}</p>
          </div>
          <div>
            <label htmlFor="d-age" className={labelClass}>{t("age")}</label>
            <input id="d-age" type="number" min={0} value={age} onChange={(e) => setAge(Number(e.target.value))} className={inputClass} />
          </div>
          <div>
            <label htmlFor="d-cnic" className={labelClass}>{t("cnic")} *</label>
            <input id="d-cnic" value={cnic} onChange={(e) => setCnic(e.target.value)} placeholder="35202-1234567-1" className={inputClass} />
            <p className="mt-1 text-xs text-ink/50">{t("cnicFormat")}</p>
          </div>
          <div>
            <label htmlFor="d-phone" className={labelClass}>{t("phone")} *</label>
            <input id="d-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="d-lic" className={labelClass}>{t("licenceNo")} *</label>
            <input id="d-lic" value={licenceNo} onChange={(e) => setLicenceNo(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="d-licexp" className={labelClass}>{t("licenceExpiry")}</label>
            <input id="d-licexp" type="date" value={licenceExpiry} onChange={(e) => setLicenceExpiry(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="d-status" className={labelClass}>{t("driverStatus")}</label>
            <select id="d-status" value={status} onChange={(e) => setStatus(e.target.value as DriverStatus)} className={inputClass}>
              <option value="available">{t("driverAvailable")}</option>
              <option value="on_trip">{t("driverOnTrip")}</option>
              <option value="off_duty">{t("driverOffDuty")}</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="d-address" className={labelClass}>{t("address")}</label>
          <input id="d-address" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="d-emergency" className={labelClass}>{t("emergencyContact")}</label>
          <input id="d-emergency" value={emergency} onChange={(e) => setEmergency(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="d-notes" className={labelClass}>Notes</label>
          <input id="d-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="d-photo" className={labelClass}>{t("photo")}</label>
          <input id="d-photo" type="file" accept="image/*" onChange={handlePhoto} className={inputClass} />
          <p className="mt-1 text-xs text-ink/50">{t("photoOptional")}</p>
          {photo && (
            <div className="mt-2 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="preview" className="h-12 w-12 rounded-full object-cover ring-1 ring-stone-line" />
              <button type="button" onClick={() => setPhoto(null)} className={secondaryButtonClass}>
                {t("delete")}
              </button>
            </div>
          )}
        </div>

        {error && (
          <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <button type="submit" disabled={saving} className={`${goldButtonClass} w-full`}>
          {saving ? t("loading") : t("save")}
        </button>
      </div>

      <aside className="h-fit rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line">
        <h2 className="font-display text-lg font-bold text-charcoal">{t("photo")}</h2>
        <div className="mt-4 flex flex-col items-center gap-3">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={fullName} className="h-24 w-24 rounded-full object-cover ring-2 ring-stone-line" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-light text-2xl font-bold text-brand-dark">
              {fullName.trim() ? fullName.trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase() : "?"}
            </div>
          )}
          <p className="text-xs text-ink/50">{t("initials")}</p>
        </div>
      </aside>
    </form>
  );
}