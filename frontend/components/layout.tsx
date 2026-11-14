"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Car,
  CarFront,
  History,
  IdCard,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Settings,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { USE_DEMO_DATA } from "@/lib/api";

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ReactNode;
}

const NAV: NavItem[] = [
  { href: "/", labelKey: "dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
  { href: "/bookings", labelKey: "bookings", icon: <BookOpen className="h-5 w-5" /> },
  { href: "/fleet", labelKey: "fleet", icon: <Car className="h-5 w-5" /> },
  { href: "/payments", labelKey: "payments", icon: <Wallet className="h-5 w-5" /> },
  { href: "/records/rent", labelKey: "rentRecords", icon: <History className="h-5 w-5" /> },
  { href: "/records/sales", labelKey: "salesRecords", icon: <ShoppingBag className="h-5 w-5" /> },
  { href: "/customers", labelKey: "customers", icon: <Users className="h-5 w-5" /> },
  { href: "/drivers", labelKey: "drivers", icon: <IdCard className="h-5 w-5" /> },
  { href: "/settings", labelKey: "settings", icon: <Settings className="h-5 w-5" /> },
];

function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <div className="flex overflow-hidden rounded-lg border border-stone-line bg-white text-sm font-semibold">
      <button
        type="button"
        onClick={() => setLang("en")}
        className={cn("px-3 py-1.5", lang === "en" ? "bg-charcoal text-white" : "text-charcoal")}
        aria-pressed={lang === "en"}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("ur")}
        className={cn("px-3 py-1.5", lang === "ur" ? "bg-charcoal text-white" : "text-charcoal")}
        aria-pressed={lang === "ur"}
      >
        اردو
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, demoMode } = useAuth();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const sidebar = (
    <div className="flex h-full flex-col bg-charcoal text-white">
      <div className="border-b border-charcoal-soft px-5 py-5">
        <p className="flex items-center gap-2 font-display text-xl font-bold tracking-wide">
          <CarFront className="h-6 w-6 text-brand" />
          HK <span className="text-brand">TRANSPORT</span>
        </p>
        <p className="mt-1 text-xs text-white/50">
          {t("managerApp")} · {user ? user.full_name : t("demoView")} · Shadman Town
        </p>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
        <ul className="space-y-1">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active(item.href)
                    ? "bg-brand text-charcoal"
                    : "text-white/80 hover:bg-charcoal-soft hover:text-white",
                )}
                aria-current={active(item.href) ? "page" : undefined}
              >
                {item.icon}
                {t(item.labelKey)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-charcoal-soft p-4">
        {user ? (
          <button
            type="button"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 hover:bg-charcoal-soft hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            {t("logout")}
          </button>
        ) : (
          <Link
            href="/login"
            className="flex min-h-11 w-full items-center gap-3 rounded-lg bg-brand px-3 py-2.5 text-sm font-semibold text-charcoal hover:bg-brand-dark hover:text-white"
          >
            <LogIn className="h-5 w-5" />
            {t("login")}
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-offwhite">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute inset-y-0 start-0 w-72 max-w-[85vw]">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:ps-64">
        <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-stone-line bg-white px-4 py-3 sm:px-6">
          <button
            type="button"
            className="rounded-lg p-2 text-charcoal hover:bg-offwhite lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <p className="flex items-center gap-1.5 font-display text-lg font-bold text-charcoal lg:hidden">
            <CarFront className="h-5 w-5 text-brand" />
            HK <span className="text-brand">TRANSPORT</span>
          </p>
          <div className="ms-auto flex items-center gap-3">
            <LanguageToggle />
            {user ? (
              <span className="hidden rounded-full bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand-dark sm:inline">
                Manager
              </span>
            ) : (
              <span className="hidden rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 sm:inline">
                {t("demoView")}
              </span>
            )}
            {user && (
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.replace("/login");
                }}
                className="rounded-lg p-2 text-charcoal hover:bg-offwhite lg:hidden"
                aria-label={t("logout")}
              >
                <LogOut className="h-5 w-5" />
              </button>
            )}
          </div>
        </header>

        {USE_DEMO_DATA && (
          <div className="bg-amber-400 px-4 py-2 text-center text-xs font-bold text-charcoal sm:text-sm" role="status">
            {t("demoBanner")}
          </div>
        )}
        {demoMode && (
          <div className="bg-sky-600 px-4 py-2 text-center text-xs font-semibold text-white sm:text-sm" role="status">
            {t("demoViewBanner")}{" "}
            <Link href="/login" className="underline">
              {t("login")}
            </Link>
          </div>
        )}

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>

        <footer className="border-t border-stone-line px-6 py-4 text-center text-xs text-ink/50">
          HK Transport — Rent a Car · Shadman Town, Karachi · 0315-2776677
        </footer>
      </div>
    </div>
  );
}
