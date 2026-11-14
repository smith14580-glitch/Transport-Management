"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createDriver } from "@/lib/api";
import type { Driver } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { PageHeader, secondaryButtonClass } from "@/components/ui";
import { DriverForm } from "@/components/driver-form";

export default function NewDriverPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { canWrite } = useAuth();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  async function handleSubmit(body: Omit<Driver, "id">) {
    if (!canWrite) {
      setNotice("Demo View me kuch save nahi hota — pehle login karo.");
      return;
    }
    const created = await createDriver(body);
    router.push(`/drivers/${created.id}`);
  }

  return (
    <div>
      <PageHeader
        title={t("addDriver")}
        subtitle="Driver profile — naam, CNIC, licence, status"
        actions={
          <Link href="/drivers" className={secondaryButtonClass}>
            {t("back")}
          </Link>
        }
      />
      {notice && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
          {notice}
        </p>
      )}
      <DriverForm initial={null} onSubmit={handleSubmit} saving={saving} setSaving={setSaving} />
    </div>
  );
}