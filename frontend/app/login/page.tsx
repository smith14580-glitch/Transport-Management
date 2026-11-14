"use client";

import React, { useState } from "react";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CarFront, LogIn } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { goldButtonClass, inputClass, labelClass } from "@/components/ui";

const schema = z.object({
  email: z.string().email("Sahi email likho."),
  password: z.string().min(1, "Password likhna zaroori hai."),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setError("");
    try {
      await login(values.email.trim(), values.password);
      router.replace("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Login nahi ho saka — dobara try karo.");
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-charcoal px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
      <div className="flex justify-end">
        <div className="flex overflow-hidden rounded-lg border border-stone-line bg-white text-sm font-semibold">
          <button type="button" onClick={() => setLang("en")} className={`px-3 py-1.5 ${lang === "en" ? "bg-charcoal text-white" : "text-charcoal"}`} aria-pressed={lang === "en"}>EN</button>
          <button type="button" onClick={() => setLang("ur")} className={`px-3 py-1.5 ${lang === "ur" ? "bg-charcoal text-white" : "text-charcoal"}`} aria-pressed={lang === "ur"}>اردو</button>
        </div>
      </div>
      <div className="mt-4 text-center">
        <p className="flex items-center justify-center gap-2 font-display text-3xl font-bold text-charcoal">
          <CarFront className="h-8 w-8 text-brand" />
          HK <span className="text-brand-dark">TRANSPORT</span>
        </p>
        <h1 className="mt-4 font-display text-2xl font-bold text-charcoal">Welcome to HK Transport</h1>
        <p className="mt-1 text-sm text-ink/60">Transport Management System — Rent a Car</p>
        <p className="mt-1 text-xs text-ink/50">Shadman Town, Karachi · 0315-2776677</p>
      </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
          <div>
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="manager@hktransport.pk"
              className={inputClass}
              {...register("email")}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className={labelClass}>
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className={inputClass}
              {...register("password")}
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={isSubmitting} className={`${goldButtonClass} w-full`}>
            <LogIn className="h-4 w-4" />
            {isSubmitting ? t("loading") : t("login")}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-ink/50">
          Manager credentials se login karo.
        </p>
      </div>
    </div>
  );
}
