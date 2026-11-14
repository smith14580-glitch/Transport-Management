"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { fetchDriver, updateDriver } from "@/lib/api";
import type { Driver } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import {
  ConnectionError,
  EmptyState,
  LoadingState,
  PageHeader,
  secondaryButtonClass,
} from "@/components/ui";
import { DriverForm } from "@/components/driver-form";

export default function EditDriverPage() {
  const params = useParams();
  const id = String(params.id);
  const router = useRouter();
  const { t } = useLanguage();
  const { canWrite } = useAuth();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      setDriver(await fetchDriver(id));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function handleSubmit(body: Omit<Driver, "id">) {
    if (!canWrite) {
      setNotice("Demo View me kuch save nahi hota — pehle login karo.");
      return;
    }
    await updateDriver(id, body);
    router.push(`/drivers/${id}`);
  }

  if (loading) return <LoadingState />;
  if (error) return <ConnectionError error={error} onRetry={() => void load()} />;
  if (!driver) return <EmptyState />;

  return (
    <div>
      <PageHeader
        title={t("editDriver")}
        subtitle={driver.full_name}
        actions={
          <Link href={`/drivers/${id}`} className={secondaryButtonClass}>
            {t("back")}
          </Link>
        }
      />
      {notice && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
          {notice}
        </p>
      )}
      <DriverForm initial={driver} onSubmit={handleSubmit} saving={saving} setSaving={setSaving} />
    </div>
  );
}