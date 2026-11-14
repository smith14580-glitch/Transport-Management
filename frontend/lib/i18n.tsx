// Language: English default, Urdu toggle (Urdu script + RTL).
// Choice persists in localStorage. Data values (names, phone numbers,
// amounts) are never translated — only UI labels, nav, headings, buttons.

"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Language = "en" | "ur";

type Dict = Record<string, string>;

const EN: Dict = {
  dashboard: "Dashboard",
  bookings: "Bookings",
  newBooking: "New Booking",
  fleet: "Fleet",
  payments: "Payments",
  rentRecords: "Rent Records",
  salesRecords: "Sale & Purchase",
  customers: "Customers",
  settings: "Settings",
  logout: "Logout",
  login: "Login",
  demoView: "Demo View",
  search: "Search",
  save: "Save",
  cancel: "Cancel",
  edit: "Edit",
  add: "Add",
  view: "View",
  back: "Back",
  retry: "Retry",
  loading: "Loading…",
  delete: "Delete",
  close: "Close",
  carsOutToday: "Cars Out on Rent Today",
  todaysBookings: "Today's Bookings",
  revenueCollected: "Revenue Collected",
  pendingPayments: "Pending Payments",
  fleetAvailable: "Fleet Available",
  upcomingBookings: "Upcoming Bookings",
  recentPayments: "Recent Payments",
  quickActions: "Quick Actions",
  customer: "Customer",
  car: "Car",
  pickup: "Pickup",
  return: "Return",
  total: "Total",
  paid: "Paid",
  balance: "Balance",
  pending: "Pending",
  status: "Status",
  paymentStatus: "Payment Status",
  actions: "Actions",
  phone: "Phone",
  address: "Address",
  name: "Name",
  method: "Method",
  date: "Date",
  amount: "Amount",
  active: "Active",
  available: "Available",
  onRent: "On Rent",
  maintenance: "Maintenance",
  notAvailable: "Not Available",
  upcoming: "Upcoming",
  completed: "Completed",
  cancelled: "Cancelled",
  all: "All",
  withDriver: "With Driver",
  selfDrive: "Self Drive",
  perHour: "per hour",
  perDay: "per day",
  demoBanner: "DEMO DATA — sample only. No backend connected yet. No real prices, customers or bookings.",
  demoViewBanner: "DEMO VIEW — login to add, edit or record anything.",
  noData: "No records yet.",
  managerApp: "Manager App",
  carsOut: "Cars out on rent today",
  noCarsOut: "No car is out on rent today.",
  noUpcoming: "No upcoming bookings in the next 7 days.",
  recordPayment: "Record Payment",
  addCar: "Add Car",
  addSale: "Add Sale / Purchase",
  sale: "Sale",
  purchase: "Purchase",
  party: "Party",
  price: "Price",
  cash: "Cash",
  bank: "Bank",
  split: "Cash + Bank",
  fullCash: "Full Cash",
  fullBank: "Full Bank",
  halfCashHalfBank: "Half Cash + Half Bank",
  halfNowHalfLater: "Half Now + Half Later",
  unpaid: "Unpaid",
  partial: "Partial",
  fullyPaid: "Fully Paid",
};

const UR: Dict = {
  dashboard: "ڈیش بورڈ",
  bookings: "بکنگز",
  newBooking: "نئی بکنگ",
  fleet: "گاڑیاں",
  payments: "ادائیگیاں",
  rentRecords: "کرایہ ریکارڈ",
  salesRecords: "خرید و فروخت",
  customers: "گاہک",
  settings: "سیٹنگز",
  logout: "لاگ آؤٹ",
  login: "لاگ ان",
  demoView: "ڈیمو ویو",
  search: "تلاش",
  save: "محفوظ کریں",
  cancel: "منسوخ کریں",
  edit: "تبدیل کریں",
  add: "شامل کریں",
  view: "دیکھیں",
  back: "واپس",
  retry: "دوبارہ کوشش کریں",
  loading: "لوڈ ہو رہا ہے…",
  delete: "حذف کریں",
  close: "بند کریں",
  carsOutToday: "آج کرایہ پر گئی گاڑیاں",
  todaysBookings: "آج کی بکنگز",
  revenueCollected: "وصول شدہ آمدنی",
  pendingPayments: "بقایا ادائیگیاں",
  fleetAvailable: "دستیاب گاڑیاں",
  upcomingBookings: "آنے والی بکنگز",
  recentPayments: "حالیہ ادائیگیاں",
  quickActions: "فوری اقدامات",
  customer: "گاہک",
  car: "گاڑی",
  pickup: "لینے کا وقت",
  return: "واپسی کا وقت",
  total: "کل",
  paid: "ادا شدہ",
  balance: "بقایا",
  pending: "بقایا",
  status: "حالت",
  paymentStatus: "ادائیگی کی حالت",
  actions: "کارروائی",
  phone: "فون",
  address: "پتہ",
  name: "نام",
  method: "طریقہ",
  date: "تاریخ",
  amount: "رقم",
  active: "فعال",
  available: "دستیاب",
  onRent: "کرایہ پر",
  maintenance: "مرمت میں",
  notAvailable: "دستیاب نہیں",
  upcoming: "آنے والی",
  completed: "مکمل",
  cancelled: "منسوخ",
  all: "تمام",
  withDriver: "ڈرائیور کے ساتھ",
  selfDrive: "خود ڈرائیو",
  perHour: "فی گھنٹہ",
  perDay: "فی دن",
  demoBanner: "ڈیمو ڈیٹا — صرف نمونہ۔ ابھی کوئی بیک اینڈ منسلک نہیں ہے۔ کوئی اصلی قیمت، گاہک یا بکنگ نہیں ہے۔",
  demoViewBanner: "ڈیمو ویو — کچھ بھی شامل یا تبدیل کرنے کے لیے لاگ ان کریں۔",
  noData: "ابھی کوئی ریکارڈ نہیں ہے۔",
  managerApp: "مینجر ایپ",
  carsOut: "آج کرایہ پر گئی گاڑیاں",
  noCarsOut: "آج کوئی گاڑی کرایہ پر نہیں گئی۔",
  noUpcoming: "اگلے 7 دنوں میں کوئی بکنگ نہیں ہے۔",
  recordPayment: "ادائیگی درج کریں",
  addCar: "گاڑی شامل کریں",
  addSale: "خرید / فروخت شامل کریں",
  sale: "فروخت",
  purchase: "خرید",
  party: "فریق",
  price: "قیمت",
  cash: "نقد",
  bank: "بینک",
  split: "نقد + بینک",
  fullCash: "مکمل نقد",
  fullBank: "مکمل بینک",
  halfCashHalfBank: "آدھی نقد + آدھی بینک",
  halfNowHalfLater: "آدھی ابھی + آدھی بعد میں",
  unpaid: "ادا نہیں ہوئی",
  partial: "جزوی",
  fullyPaid: "مکمل ادا",
};

const DICTS: Record<Language, Dict> = { en: EN, ur: UR };

interface LanguageContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => undefined,
  t: (key: string) => EN[key] || key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Lazy init from localStorage so no setState-in-effect is needed.
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window === "undefined") return "en";
    try {
      const saved = window.localStorage.getItem("hktransport_lang");
      return saved === "ur" || saved === "en" ? saved : "en";
    } catch {
      return "en";
    }
  });

  useEffect(() => {
    document.documentElement.lang = lang === "ur" ? "ur" : "en";
    document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
    try {
      window.localStorage.setItem("hktransport_lang", lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  const value: LanguageContextValue = {
    lang,
    setLang: setLangState,
    t: (key: string) => DICTS[lang][key] || EN[key] || key,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
