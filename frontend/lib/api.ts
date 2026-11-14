// API layer — typed functions for the FastAPI backend (API_CONTRACT.md).
// Base URL: NEXT_PUBLIC_API_URL. When it is UNSET the app runs in demo
// mode: every function reads/writes the localStorage demo store (lib/store)
// and the UI shows a "Demo data — no backend connected yet" banner.
// When the backend exists, the SAME function names call the real API, so
// pages never change — only this file's implementation switches.
//
// Auth: JWT access token (Bearer) in localStorage; on 401 the session is
// cleared and the user is sent to /login. Demo mode accepts only the demo
// account shown on the login page (manager@hktransport.pk / demo1234).

import type {
  Booking,
  BusinessSettings,
  Car,
  Customer,
  CustomerSummary,
  DashboardSummary,
  Driver,
  LiveTrip,
  Payment,
  PaymentMethod,
  SaleRecord,
  SettingItem,
  TripPosition,
  User,
} from "./types";
import { DEMO_EMAIL, DEMO_PASSWORD } from "./types";
import { addDaysISO, todayISO } from "./format";
import {
  addPaymentRecord,
  addTripPosition,
  clearTripPositions,
  deleteCar as storeDeleteCar,
  findCustomerByPhone,
  loadStore,
  resetStore,
  updateSettings as storeUpdateSettings,
  upsertBooking,
  upsertCar,
  upsertCustomer,
  deleteDriver as storeDeleteDriver,
  upsertDriver,
  upsertSale,
} from "./store";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
export const HAS_BACKEND = API_URL.length > 0;
export const USE_DEMO_DATA = !HAS_BACKEND;

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function isConnectionError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 0;
}

const ACCESS_KEY = "hktransport_access_token";
const USER_KEY = "hktransport_user";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function saveSession(access: string, user: User): void {
  window.localStorage.setItem(ACCESS_KEY, access);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(USER_KEY);
}

function unwrap<T>(json: unknown): T {
  if (json && typeof json === "object") {
    const obj = json as Record<string, unknown>;
    if ("data" in obj) return obj.data as T;
    if ("success" in obj && obj.success === false) {
      const err = (obj.error as Record<string, unknown>) || {};
      throw new ApiError(400, String(err.code || "API_ERROR"), String(err.message || "Request failed."));
    }
  }
  return json as T;
}

export function asArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.results)) return obj.results as T[];
  }
  return [];
}

export async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const { method = "GET", body, auth = true } = options;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = auth ? getAccessToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      0,
      "CONNECTION_ERROR",
      `Backend se connect nahi ho raha — ${API_URL} check karo. Backend (FastAPI) chal raha hai? NEXT_PUBLIC_API_URL sahi hai?`,
    );
  }

  if (res.status === 401 && auth) {
    clearSession();
    throw new ApiError(401, "UNAUTHORIZED", "Session khatam ho gaya hai — dobara login karo.");
  }

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    const err = (json as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(
      res.status,
      err?.code || `HTTP_${res.status}`,
      err?.message || `Request failed (${res.status}).`,
    );
  }
  return unwrap<T>(json);
}

// ---------- demo-mode helper ----------
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function demo<T>(value: T): Promise<T> {
  await delay(200);
  return value;
}

// ---------- Auth ----------
export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  if (USE_DEMO_DATA) {
    if (email.trim().toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Galat email ya password — demo account use karo.");
    }
    const user: User = {
      id: "user-manager",
      full_name: "Talha — Manager (Demo)",
      email: DEMO_EMAIL,
      phone: "0315-2776677",
      role: "manager",
    };
    return demo({ access_token: "demo-access-token", token_type: "bearer", user });
  }
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
}

export async function fetchMe(): Promise<User> {
  if (USE_DEMO_DATA) {
    const stored = getStoredUser();
    if (!stored) throw new ApiError(401, "UNAUTHORIZED", "Login karo.");
    return demo(stored);
  }
  return apiFetch<User>("/auth/me");
}

export async function logout(): Promise<void> {
  if (!USE_DEMO_DATA) {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      /* logout still clears local session below */
    }
  }
  clearSession();
}

// ---------- Dashboard ----------
export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  if (USE_DEMO_DATA) {
    const d = loadStore();
    const today = todayISO();
    const carsOut = d.bookings.filter(
      (b) =>
        b.status === "active" &&
        b.pickup_datetime.slice(0, 10) <= today &&
        b.return_datetime.slice(0, 10) >= today,
    ).length;
    const todays = d.bookings.filter((b) => b.pickup_datetime.slice(0, 10) === today && b.status !== "cancelled").length;
    const revenue = d.payments.reduce((s, p) => s + p.amount, 0);
    const pending = d.bookings
      .filter((b) => b.status !== "cancelled")
      .reduce((s, b) => s + b.balance_amount, 0);
    const upcoming = d.bookings.filter(
      (b) => b.status === "upcoming" && b.pickup_datetime.slice(0, 10) <= addDaysISO(7),
    ).length;
    return demo({
      cars_out_today: carsOut,
      todays_bookings: todays,
      revenue_collected: revenue,
      pending_payments: pending,
      fleet_available: d.cars.filter((c) => c.status === "available").length,
      fleet_total: d.cars.length,
      upcoming_bookings_count: upcoming,
    });
  }
  return apiFetch<DashboardSummary>("/dashboard/summary");
}

// ---------- Bookings ----------
export interface BookingFilters {
  search?: string;
  status?: string;
  payment_status?: string;
  car_id?: string;
  date_from?: string;
  date_to?: string;
}

export async function fetchBookings(filters: BookingFilters = {}): Promise<Booking[]> {
  if (USE_DEMO_DATA) {
    let rows = [...loadStore().bookings];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter(
        (b) =>
          b.customer_name.toLowerCase().includes(q) ||
          b.customer_phone.includes(q) ||
          b.car_name.toLowerCase().includes(q) ||
          b.booking_code.toLowerCase().includes(q),
      );
    }
    if (filters.status) rows = rows.filter((b) => b.status === filters.status);
    if (filters.payment_status) rows = rows.filter((b) => b.payment_status === filters.payment_status);
    if (filters.car_id) rows = rows.filter((b) => b.car_id === filters.car_id);
    if (filters.date_from) rows = rows.filter((b) => b.pickup_datetime.slice(0, 10) >= (filters.date_from as string));
    if (filters.date_to) rows = rows.filter((b) => b.pickup_datetime.slice(0, 10) <= (filters.date_to as string));
    rows.sort((a, b) => a.pickup_datetime.localeCompare(b.pickup_datetime));
    return demo(rows);
  }
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v) params.set(k, v);
  });
  const q = params.toString();
  return asArray<Booking>(await apiFetch<unknown>(`/bookings${q ? `?${q}` : ""}`));
}

export async function fetchBooking(id: string): Promise<Booking> {
  if (USE_DEMO_DATA) {
    const b = loadStore().bookings.find((x) => x.id === id || x.booking_code === id);
    if (!b) throw new ApiError(404, "NOT_FOUND", "Booking nahi mili.");
    return demo(b);
  }
  return apiFetch<Booking>(`/bookings/${id}`);
}

export interface CreateBookingInput {
  customer_name: string;
  customer_phone: string;
  car_id: string;
  pickup_datetime: string;
  return_datetime: string;
  driver_option: Booking["driver_option"];
  duration_value: number;
  duration_unit: Booking["duration_unit"];
  rate_per_unit: number;
  total_amount: number;
  advance_amount: number;
  payment_plan: Booking["payment_plan"];
  driver_id?: string | null;
  driver_name?: string | null;
  notes?: string;
}

export async function createBooking(body: CreateBookingInput): Promise<Booking> {
  if (USE_DEMO_DATA) {
    const d = loadStore();
    const car = d.cars.find((c) => c.id === body.car_id);
    const clash = findDoubleBooking(body.car_id, body.pickup_datetime, body.return_datetime);
    if (clash) {
      throw new ApiError(409, "DOUBLE_BOOKING", `Ye gaari us waqt pehle se booked hai (${clash.booking_code}, ${clash.customer_name}).`);
    }
    let customer = findCustomerByPhone(body.customer_phone);
    if (!customer) {
      customer = {
        id: `cus-${Date.now()}`,
        full_name: body.customer_name,
        phone: body.customer_phone,
        created_at: todayISO(),
      };
      upsertCustomer(customer);
    }
    const code = `HK-2026-${String(d.bookings.length + 1).padStart(4, "0")}`;
    const booking: Booking = {
      id: `bk-${Date.now()}`,
      booking_code: code,
      customer_id: customer.id,
      customer_name: body.customer_name,
      customer_phone: body.customer_phone,
      car_id: body.car_id,
      car_name: car?.name || "",
      pickup_datetime: body.pickup_datetime,
      return_datetime: body.return_datetime,
      driver_option: body.driver_option,
      duration_value: body.duration_value,
      duration_unit: body.duration_unit,
      rate_per_unit: body.rate_per_unit,
      total_amount: body.total_amount,
      advance_amount: body.advance_amount,
      amount_paid: body.advance_amount,
      balance_amount: Math.max(0, body.total_amount - body.advance_amount),
      payment_plan: body.payment_plan,
       payment_status:
         body.advance_amount >= body.total_amount ? "paid" : body.advance_amount > 0 ? "partial" : "unpaid",
       status: body.pickup_datetime.slice(0, 10) <= todayISO() ? "active" : "upcoming",
       driver_id: body.driver_id || null,
       driver_name: body.driver_name || null,
       late_penalty_amount: 0,
       notes: body.notes || null,
       created_at: todayISO(),
     };
    upsertBooking(booking);
    if (body.driver_id) {
      const drv = loadStore().drivers.find((d) => d.id === body.driver_id);
      if (drv) {
        drv.status = "on_trip";
        upsertDriver(drv);
      }
    }
    if (body.advance_amount > 0) {
      addPaymentRecord({
        id: `pay-${Date.now()}`,
        booking_id: booking.id,
        booking_code: booking.booking_code,
        sale_id: null,
        customer_name: body.customer_name,
        amount: body.advance_amount,
        cash_amount: body.payment_plan === "full_bank" ? 0 : body.advance_amount,
        bank_amount: body.payment_plan === "full_bank" ? body.advance_amount : 0,
        method: body.payment_plan === "full_bank" ? "bank" : "cash",
        payment_date: todayISO(),
        reference: null,
        notes: "Advance on booking",
        created_at: todayISO(),
      });
    }
    return demo(booking);
  }
  return apiFetch<Booking>("/bookings", { method: "POST", body });
}

export async function updateBooking(id: string, body: Partial<Booking>): Promise<Booking> {
  if (USE_DEMO_DATA) {
    const b = loadStore().bookings.find((x) => x.id === id);
    if (!b) throw new ApiError(404, "NOT_FOUND", "Booking nahi mili.");
    const next = { ...b, ...body } as Booking;
    next.balance_amount = Math.max(0, next.total_amount - next.amount_paid);
    next.payment_status = next.balance_amount === 0 ? "paid" : next.amount_paid > 0 ? "partial" : "unpaid";
    if (body.driver_id !== undefined && body.driver_id !== b.driver_id) {
      if (b.driver_id) {
        const old = loadStore().drivers.find((d) => d.id === b.driver_id);
        if (old) { old.status = "available"; upsertDriver(old); }
      }
      if (body.driver_id) {
        const nw = loadStore().drivers.find((d) => d.id === body.driver_id);
        if (nw) { nw.status = "on_trip"; upsertDriver(nw); }
      }
    }
    upsertBooking(next);
    return demo(next);
  }
  return apiFetch<Booking>(`/bookings/${id}`, { method: "PATCH", body });
}

export async function cancelBooking(id: string, reason?: string): Promise<Booking> {
  if (USE_DEMO_DATA) {
    const b = loadStore().bookings.find((x) => x.id === id);
    if (!b) throw new ApiError(404, "NOT_FOUND", "Booking nahi mili.");
    if (b.driver_id) {
      const drv = loadStore().drivers.find((d) => d.id === b.driver_id);
      if (drv) { drv.status = "available"; upsertDriver(drv); }
    }
    const next = { ...b, status: "cancelled" as const, notes: reason ? `${b.notes || ""} [Cancelled: ${reason}]`.trim() : b.notes };
    upsertBooking(next);
    return demo(next);
  }
  return apiFetch<Booking>(`/bookings/${id}/cancel`, { method: "POST", body: { reason } });
}

export async function completeBooking(id: string): Promise<Booking> {
  if (USE_DEMO_DATA) {
    const b = loadStore().bookings.find((x) => x.id === id);
    if (!b) throw new ApiError(404, "NOT_FOUND", "Booking nahi mili.");
    if (b.driver_id) {
      const drv = loadStore().drivers.find((d) => d.id === b.driver_id);
      if (drv) { drv.status = "available"; upsertDriver(drv); }
    }
    const s = loadStore().settings;
    const now = new Date();
    const ret = new Date(b.return_datetime);
    const msLate = now.getTime() - ret.getTime();
    let penalty = 0;
    if (s.late_penalty_enabled && msLate > 0) {
      const hoursLate = Math.ceil(msLate / 3600000);
      penalty = hoursLate * (s.late_return_penalty_per_hour || 0);
    }
    const next = { ...b, status: "completed" as const };
    if (penalty > 0) {
      next.late_penalty_amount = penalty;
      next.balance_amount = Math.max(0, next.balance_amount + penalty);
      next.payment_status = next.balance_amount === 0 ? "paid" : next.amount_paid > 0 ? "partial" : "unpaid";
      const note = `Late penalty: PKR ${penalty} (${Math.ceil(msLate / 3600000)} hours late)`;
      next.notes = next.notes ? `${next.notes} · ${note}` : note;
    } else {
      next.late_penalty_amount = 0;
    }
    upsertBooking(next);
    return demo(next);
  }
  return apiFetch<Booking>(`/bookings/${id}/complete`, { method: "POST", body: {} });
}

/** Overlap check: same car, upcoming/active booking whose dates overlap. */
export function findDoubleBooking(
  carId: string,
  pickup: string,
  ret: string,
  excludeId?: string,
): Booking | undefined {
  return loadStore().bookings.find(
    (b) =>
      b.car_id === carId &&
      b.id !== excludeId &&
      (b.status === "upcoming" || b.status === "active") &&
      pickup < b.return_datetime &&
      ret > b.pickup_datetime,
  );
}

export async function checkAvailability(
  carId: string,
  pickup: string,
  ret: string,
  excludeId?: string,
): Promise<{ available: boolean; conflicting_booking_code?: string }> {
  if (USE_DEMO_DATA) {
    const clash = findDoubleBooking(carId, pickup, ret, excludeId);
    return demo({ available: !clash, conflicting_booking_code: clash?.booking_code });
  }
  const q = new URLSearchParams({ car_id: carId, pickup_datetime: pickup, return_datetime: ret });
  if (excludeId) q.set("exclude_booking_id", excludeId);
  return apiFetch<{ available: boolean; conflicting_booking_code?: string }>(`/availability/check?${q.toString()}`);
}

// ---------- Fleet ----------
export async function fetchCars(): Promise<Car[]> {
  if (USE_DEMO_DATA) return demo([...loadStore().cars]);
  return asArray<Car>(await apiFetch<unknown>("/cars"));
}

export async function fetchCar(id: string): Promise<Car> {
  if (USE_DEMO_DATA) {
    const c = loadStore().cars.find((x) => x.id === id);
    if (!c) throw new ApiError(404, "NOT_FOUND", "Gaari nahi mili.");
    return demo(c);
  }
  return apiFetch<Car>(`/cars/${id}`);
}

export async function createCar(body: Omit<Car, "id">): Promise<Car> {
  if (USE_DEMO_DATA) {
    const car: Car = { ...body, id: `car-${Date.now()}`, created_at: todayISO() };
    upsertCar(car);
    return demo(car);
  }
  return apiFetch<Car>("/cars", { method: "POST", body });
}

export async function updateCar(id: string, body: Partial<Car>): Promise<Car> {
  if (USE_DEMO_DATA) {
    const c = loadStore().cars.find((x) => x.id === id);
    if (!c) throw new ApiError(404, "NOT_FOUND", "Gaari nahi mili.");
    const next = { ...c, ...body } as Car;
    upsertCar(next);
    return demo(next);
  }
  return apiFetch<Car>(`/cars/${id}`, { method: "PATCH", body });
}

export async function deleteCar(id: string): Promise<void> {
  if (USE_DEMO_DATA) {
    storeDeleteCar(id);
    return demo(undefined);
  }
  await apiFetch(`/cars/${id}`, { method: "DELETE" });
}

// ---------- Drivers ----------
export async function fetchDrivers(): Promise<Driver[]> {
  if (USE_DEMO_DATA) return demo([...loadStore().drivers]);
  return asArray<Driver>(await apiFetch<unknown>("/drivers"));
}

export async function fetchDriver(id: string): Promise<Driver> {
  if (USE_DEMO_DATA) {
    const d = loadStore().drivers.find((x) => x.id === id);
    if (!d) throw new ApiError(404, "NOT_FOUND", "Driver nahi mila.");
    return demo(d);
  }
  return apiFetch<Driver>(`/drivers/${id}`);
}

export async function createDriver(body: Omit<Driver, "id">): Promise<Driver> {
  if (USE_DEMO_DATA) {
    const driver: Driver = { ...body, id: `drv-${Date.now()}`, created_at: todayISO() };
    upsertDriver(driver);
    return demo(driver);
  }
  return apiFetch<Driver>("/drivers", { method: "POST", body });
}

export async function updateDriver(id: string, body: Partial<Driver>): Promise<Driver> {
  if (USE_DEMO_DATA) {
    const d = loadStore().drivers.find((x) => x.id === id);
    if (!d) throw new ApiError(404, "NOT_FOUND", "Driver nahi mila.");
    const next = { ...d, ...body } as Driver;
    upsertDriver(next);
    return demo(next);
  }
  return apiFetch<Driver>(`/drivers/${id}`, { method: "PATCH", body });
}

export async function deleteDriver(id: string): Promise<void> {
  if (USE_DEMO_DATA) {
    const d = loadStore().drivers.find((x) => x.id === id);
    if (!d) throw new ApiError(404, "NOT_FOUND", "Driver nahi mila.");
    if (d.status === "on_trip") {
      throw new ApiError(400, "DRIVER_ON_TRIP", "Driver is currently on a trip and cannot be deleted.");
    }
    storeDeleteDriver(id);
    return demo(undefined);
  }
  await apiFetch(`/drivers/${id}`, { method: "DELETE" });
}

export async function fetchDriverTrips(driverId: string): Promise<Booking[]> {
  if (USE_DEMO_DATA) {
    return demo(loadStore().bookings.filter((b) => b.driver_id === driverId));
  }
  return asArray<Booking>(await apiFetch<unknown>(`/drivers/${driverId}/trips`));
}

export async function assignDriver(bookingId: string, driverId: string | null): Promise<Booking> {
  if (USE_DEMO_DATA) {
    const booking = loadStore().bookings.find((b) => b.id === bookingId);
    if (!booking) throw new ApiError(404, "NOT_FOUND", "Booking nahi mili.");
    if (booking.driver_id && booking.driver_id !== driverId) {
      const old = loadStore().drivers.find((d) => d.id === booking.driver_id);
      if (old) { old.status = "available"; upsertDriver(old); }
    }
    if (driverId) {
      const drv = loadStore().drivers.find((d) => d.id === driverId);
      if (!drv) throw new ApiError(404, "NOT_FOUND", "Driver nahi mila.");
      if (drv.status !== "available") {
        throw new ApiError(400, "DRIVER_NOT_AVAILABLE", "Sirf available drivers assign ho sakte hain.");
      }
      drv.status = "on_trip";
      upsertDriver(drv);
      booking.driver_id = driverId;
      booking.driver_name = drv.full_name;
      booking.driver_option = "with_driver";
    } else {
      booking.driver_id = null;
      booking.driver_name = null;
      booking.driver_option = "self_drive";
    }
    upsertBooking(booking);
    return demo(booking);
  }
  return apiFetch<Booking>(`/bookings/${bookingId}/assign-driver`, {
    method: "POST",
    body: { driver_id: driverId },
  });
}

// ---------- Payments ----------
export async function fetchPayments(pendingOnly = false): Promise<Payment[]> {
  if (USE_DEMO_DATA) {
    const rows = [...loadStore().payments].sort((a, b) =>
      `${b.payment_date}${b.created_at || ""}`.localeCompare(`${a.payment_date}${a.created_at || ""}`),
    );
    void pendingOnly; // pending filter lives on bookings; payments list is history.
    return demo(rows);
  }
  const q = pendingOnly ? "?pending_only=true" : "";
  return asArray<Payment>(await apiFetch<unknown>(`/payments${q}`));
}

export async function fetchBookingPayments(bookingId: string): Promise<Payment[]> {
  if (USE_DEMO_DATA) {
    return demo(loadStore().payments.filter((p) => p.booking_id === bookingId));
  }
  return asArray<Payment>(await apiFetch<unknown>(`/bookings/${bookingId}/payments`));
}

export interface RecordPaymentInput {
  amount: number;
  method: Payment["method"];
  cash_amount?: number;
  bank_amount?: number;
  payment_date: string;
  reference?: string;
  notes?: string;
}

export async function recordPayment(bookingId: string, body: RecordPaymentInput): Promise<Payment> {
  if (USE_DEMO_DATA) {
    const booking = loadStore().bookings.find((b) => b.id === bookingId);
    if (!booking) throw new ApiError(404, "NOT_FOUND", "Booking nahi mili.");
    if (body.amount > booking.balance_amount) {
      throw new ApiError(400, "OVERPAYMENT", `Amount balance (${booking.balance_amount}) se zyada hai.`);
    }
    const payment: Payment = {
      id: `pay-${Date.now()}`,
      booking_id: bookingId,
      booking_code: booking.booking_code,
      sale_id: null,
      customer_name: booking.customer_name,
      amount: body.amount,
      cash_amount: body.cash_amount ?? (body.method === "bank" ? 0 : body.amount),
      bank_amount: body.bank_amount ?? (body.method === "bank" ? body.amount : 0),
      method: body.method,
      payment_date: body.payment_date,
      reference: body.reference || null,
      notes: body.notes || null,
      created_at: todayISO(),
    };
    addPaymentRecord(payment);
    return demo(payment);
  }
  return apiFetch<Payment>(`/bookings/${bookingId}/payments`, { method: "POST", body });
}

export async function fetchOutstandingBookings(): Promise<Booking[]> {
  if (USE_DEMO_DATA) {
    return demo(
      loadStore().bookings.filter((b) => b.balance_amount > 0 && b.status !== "cancelled"),
    );
  }
  return asArray<Booking>(await apiFetch<unknown>("/payments/outstanding"));
}

// ---------- Records: rent & sales ----------
export async function fetchRentRecords(): Promise<Booking[]> {
  // Rent history = all bookings, newest first.
  if (USE_DEMO_DATA) {
    const rows = [...loadStore().bookings].sort((a, b) => b.pickup_datetime.localeCompare(a.pickup_datetime));
    return demo(rows);
  }
  return asArray<Booking>(await apiFetch<unknown>("/records/rent"));
}

export async function fetchSaleRecords(): Promise<SaleRecord[]> {
  if (USE_DEMO_DATA) {
    const rows = [...loadStore().sales].sort((a, b) => b.record_date.localeCompare(a.record_date));
    return demo(rows);
  }
  return asArray<SaleRecord>(await apiFetch<unknown>("/records/sales"));
}

export interface CreateSaleInput {
  type: SaleRecord["type"];
  car_name: string;
  car_details?: string;
  party_name: string;
  party_phone?: string;
  price: number;
  amount_paid: number;
  payment_method: PaymentMethod;
  record_date: string;
  notes?: string;
}

export async function createSaleRecord(body: CreateSaleInput): Promise<SaleRecord> {
  if (USE_DEMO_DATA) {
    const record: SaleRecord = {
      id: `sr-${Date.now()}`,
      type: body.type,
      car_name: body.car_name,
      car_details: body.car_details || null,
      party_name: body.party_name,
      party_phone: body.party_phone || null,
      price: body.price,
      amount_paid: Math.min(body.price, body.amount_paid),
      balance_amount: Math.max(0, body.price - body.amount_paid),
      payment_method: body.payment_method,
      record_date: body.record_date,
      status: body.amount_paid >= body.price ? "completed" : "pending",
      notes: body.notes || null,
      created_at: todayISO(),
    };
    upsertSale(record);
    if (body.amount_paid > 0) {
      addPaymentRecord({
        id: `pay-${Date.now()}`,
        booking_id: null,
        booking_code: null,
        sale_id: record.id,
        customer_name: body.party_name,
        amount: record.amount_paid,
        cash_amount: body.payment_method === "bank" ? 0 : record.amount_paid,
        bank_amount: body.payment_method === "bank" ? record.amount_paid : 0,
        method: body.payment_method,
        payment_date: body.record_date,
        reference: null,
        notes: `${body.type === "sale" ? "Sale" : "Purchase"} — ${body.car_name}`,
        created_at: todayISO(),
      });
    }
    return demo(record);
  }
  return apiFetch<SaleRecord>("/records/sales", { method: "POST", body });
}

// ---------- Customers ----------
export async function fetchCustomers(search = ""): Promise<Customer[]> {
  if (USE_DEMO_DATA) {
    const q = search.toLowerCase();
    const rows = loadStore().customers.filter(
      (c) => !q || c.full_name.toLowerCase().includes(q) || c.phone.includes(q),
    );
    return demo(rows);
  }
  const q = search ? `?search=${encodeURIComponent(search)}` : "";
  return asArray<Customer>(await apiFetch<unknown>(`/customers${q}`));
}

export async function fetchCustomerSummaries(): Promise<CustomerSummary[]> {
  if (USE_DEMO_DATA) {
    const d = loadStore();
    const rows: CustomerSummary[] = d.customers.map((c) => {
      const bookings = d.bookings.filter((b) => b.customer_id === c.id);
      return {
        customer_id: c.id,
        full_name: c.full_name,
        phone: c.phone,
        total_bookings: bookings.length,
        total_rent_amount: bookings.reduce((s, b) => s + b.total_amount, 0),
        total_paid: bookings.reduce((s, b) => s + b.amount_paid, 0),
        total_pending: bookings
          .filter((b) => b.status !== "cancelled")
          .reduce((s, b) => s + b.balance_amount, 0),
      };
    });
    rows.sort((a, b) => b.total_rent_amount - a.total_rent_amount);
    return demo(rows);
  }
  return asArray<CustomerSummary>(await apiFetch<unknown>("/customers/summaries"));
}

// ---------- Settings ----------
export async function fetchSettings(): Promise<BusinessSettings> {
  if (USE_DEMO_DATA) return demo(loadStore().settings);
  return apiFetch<BusinessSettings>("/settings");
}

export async function updateSettings(patch: Partial<BusinessSettings>): Promise<BusinessSettings> {
  if (USE_DEMO_DATA) return demo(storeUpdateSettings(patch));
  return apiFetch<BusinessSettings>("/settings", { method: "PATCH", body: patch });
}

export async function fetchSettingsList(): Promise<SettingItem[]> {
  const s = await fetchSettings();
  return [
    { key: "business_name", value: s.business_name, description: "Business name" },
    { key: "address", value: s.address, description: "Shop address" },
    { key: "phones", value: s.phones.join(", "), description: "Contact phones" },
    { key: "sale_purchase_phone", value: s.sale_purchase_phone, description: "Sale & purchase phone (2 Rist Transport)" },
    { key: "default_rate_with_driver_hour", value: String(s.default_rate_with_driver_hour), description: "Default rate with driver — per hour (PKR)" },
    { key: "default_rate_with_driver_day", value: String(s.default_rate_with_driver_day), description: "Default rate with driver — per day (PKR)" },
    { key: "default_rate_self_hour", value: String(s.default_rate_self_hour), description: "Default rate self drive — per hour (PKR)" },
    { key: "default_rate_self_day", value: String(s.default_rate_self_day), description: "Default rate self drive — per day (PKR)" },
  ];
}

// ---------- Tracking ----------
export async function sendPosition(
  bookingCode: string,
  pos: { lat: number; lng: number; speed: number | null; recorded_at: string },
): Promise<void> {
  if (USE_DEMO_DATA) {
    const store = loadStore();
    const booking = store.bookings.find((b) => b.booking_code === bookingCode);
    if (!booking) return demo(undefined);
    addTripPosition({
      booking_id: booking.id,
      booking_code: bookingCode,
      lat: pos.lat,
      lng: pos.lng,
      speed: pos.speed,
      recorded_at: pos.recorded_at,
    });
    return demo(undefined);
  }
  try {
    await apiFetch("/tracking/positions", { method: "POST", body: { booking_code: bookingCode, ...pos } });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      const store = loadStore();
      const booking = store.bookings.find((b) => b.booking_code === bookingCode);
      if (booking) {
        addTripPosition({
          booking_id: booking.id,
          booking_code: bookingCode,
          lat: pos.lat,
          lng: pos.lng,
          speed: pos.speed,
          recorded_at: pos.recorded_at,
        });
      }
    } else {
      throw e;
    }
  }
  return;
}

async function demoLiveTrips(): Promise<LiveTrip[]> {
  const store = loadStore();
  const now = Date.now();
  const active = store.bookings.filter((b) => b.status === "active");
  const trips: LiveTrip[] = active.map((b, i) => {
    const t = now / 1000;
    const baseLat = 24.95 + i * 0.01;
    const baseLng = 67.03 + i * 0.01;
    const lat = baseLat + Math.sin(t / 30 + i) * 0.005;
    const lng = baseLng + Math.cos(t / 30 + i) * 0.005;
    const pos: TripPosition = {
      booking_id: b.id,
      booking_code: b.booking_code,
      lat,
      lng,
      speed: 25 + (i * 7) % 20,
      recorded_at: new Date(now).toISOString(),
    };
    const positions = store.trip_positions.filter((p) => p.booking_id === b.id);
    const last = positions.length ? positions[positions.length - 1] : pos;
    const stale = Date.now() - new Date(last.recorded_at).getTime() > 120000;
    return {
      booking_id: b.id,
      booking_code: b.booking_code,
      customer_name: b.customer_name,
      car_name: b.car_name,
      driver_name: b.driver_name || null,
      status: stale ? "stale" : "live",
      last_position: last,
      positions: positions.length ? positions : [pos],
    };
  });
  return trips;
}

export async function fetchLiveTrips(): Promise<LiveTrip[]> {
  if (USE_DEMO_DATA) {
    return demo(await demoLiveTrips());
  }
  try {
    return asArray<LiveTrip>(await apiFetch<unknown>("/tracking/live"));
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      return demo(await demoLiveTrips());
    }
    throw e;
  }
}

export async function fetchTripPositions(bookingId: string): Promise<TripPosition[]> {
  if (USE_DEMO_DATA) {
    return demo(loadStore().trip_positions.filter((p) => p.booking_id === bookingId));
  }
  try {
    return asArray<TripPosition>(await apiFetch<unknown>(`/tracking/trips/${bookingId}`));
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      return demo(loadStore().trip_positions.filter((p) => p.booking_id === bookingId));
    }
    throw e;
  }
}

export async function startTrip(bookingCode: string): Promise<void> {
  if (USE_DEMO_DATA) return demo(undefined);
  try {
    const b = await fetchBooking(bookingCode);
    await apiFetch(`/tracking/trips/${b.id}/start`, { method: "POST", body: {} });
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 404) throw e;
  }
  return;
}

export async function endTrip(bookingCode: string): Promise<void> {
  if (USE_DEMO_DATA) {
    const booking = loadStore().bookings.find((b) => b.booking_code === bookingCode);
    if (booking) clearTripPositions(booking.id);
    return demo(undefined);
  }
  try {
    const b = await fetchBooking(bookingCode);
    await apiFetch(`/tracking/trips/${b.id}/end`, { method: "POST", body: {} });
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 404) throw e;
    const booking = loadStore().bookings.find((b) => b.booking_code === bookingCode);
    if (booking) clearTripPositions(booking.id);
  }
  return;
}

// ---------- Demo data ----------
export async function resetDemoData(): Promise<void> {
  if (USE_DEMO_DATA) {
    resetStore();
    return demo(undefined);
  }
  await apiFetch("/demo/reset", { method: "POST", body: {} });
}
