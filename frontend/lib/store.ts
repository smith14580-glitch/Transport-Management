// localStorage-backed demo store. Used while no backend is connected
// (NEXT_PUBLIC_API_URL unset). All create/edit/delete actions go through
// here and persist across reloads. Reset restores the seed data.

import { buildSeed } from "./sample";
import type {
  Booking,
  BusinessSettings,
  Car,
  Customer,
  Payment,
  SaleRecord,
  StoreData,
} from "./types";

export const STORE_KEY = "hktransport_store_v1";

let memoryStore: StoreData | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadStore(): StoreData {
  if (memoryStore) return memoryStore;
  if (isBrowser()) {
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoreData;
        if (parsed && parsed.version === 1 && Array.isArray(parsed.cars)) {
          memoryStore = parsed;
          return parsed;
        }
      }
    } catch {
      /* fall through to seed */
    }
  }
  const seed = buildSeed();
  memoryStore = seed;
  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(seed));
    } catch {
      /* ignore */
    }
  }
  return seed;
}

export function saveStore(data: StoreData): void {
  memoryStore = data;
  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }
}

export function resetStore(): StoreData {
  const seed = buildSeed();
  saveStore(seed);
  return seed;
}

/** Mutate the store and persist. Returns the updated store. */
export function updateStore(fn: (data: StoreData) => void): StoreData {
  const data = loadStore();
  fn(data);
  saveStore(data);
  return data;
}

// ---------- Cars ----------
export function upsertCar(car: Car): Car {
  updateStore((d) => {
    const i = d.cars.findIndex((c) => c.id === car.id);
    if (i >= 0) d.cars[i] = car;
    else d.cars.push(car);
  });
  return car;
}

export function deleteCar(id: string): void {
  updateStore((d) => {
    d.cars = d.cars.filter((c) => c.id !== id);
  });
}

// ---------- Bookings ----------
export function upsertBooking(booking: Booking): Booking {
  updateStore((d) => {
    const i = d.bookings.findIndex((b) => b.id === booking.id);
    if (i >= 0) d.bookings[i] = booking;
    else d.bookings.push(booking);
  });
  return booking;
}

// ---------- Payments ----------
export function addPaymentRecord(payment: Payment): Payment {
  updateStore((d) => {
    d.payments.push(payment);
    // Keep the booking totals in sync.
    if (payment.booking_id) {
      const b = d.bookings.find((x) => x.id === payment.booking_id);
      if (b) {
        b.amount_paid = Math.min(b.total_amount, b.amount_paid + payment.amount);
        b.balance_amount = Math.max(0, b.total_amount - b.amount_paid);
        b.payment_status = b.balance_amount === 0 ? "paid" : b.amount_paid > 0 ? "partial" : "unpaid";
      }
    }
    if (payment.sale_id) {
      const s = d.sales.find((x) => x.id === payment.sale_id);
      if (s) {
        s.amount_paid = Math.min(s.price, s.amount_paid + payment.amount);
        s.balance_amount = Math.max(0, s.price - s.amount_paid);
        s.status = s.balance_amount === 0 ? "completed" : "pending";
      }
    }
  });
  return payment;
}

// ---------- Sales ----------
export function upsertSale(record: SaleRecord): SaleRecord {
  updateStore((d) => {
    const i = d.sales.findIndex((s) => s.id === record.id);
    if (i >= 0) d.sales[i] = record;
    else d.sales.push(record);
  });
  return record;
}

// ---------- Customers ----------
export function upsertCustomer(customer: Customer): Customer {
  updateStore((d) => {
    const i = d.customers.findIndex((c) => c.id === customer.id);
    if (i >= 0) d.customers[i] = customer;
    else d.customers.push(customer);
  });
  return customer;
}

export function findCustomerByPhone(phone: string): Customer | undefined {
  const norm = phone.replace(/[\s-]/g, "");
  return loadStore().customers.find((c) => c.phone.replace(/[\s-]/g, "") === norm);
}

// ---------- Settings ----------
export function updateSettings(patch: Partial<BusinessSettings>): BusinessSettings {
  let next: BusinessSettings = loadStore().settings;
  updateStore((d) => {
    d.settings = { ...d.settings, ...patch };
    next = d.settings;
  });
  return next;
}
