// Types for the HK Transport Management System.
// They mirror the FastAPI Pydantic schemas in API_CONTRACT.md.
// Money is always a number (PKR); the backend stores NUMERIC(12,2).
// ALL seed/sample values are DEMO data — no real prices, customers or
// bookings. Real rates are set by the manager in Settings.

export type Role = "manager";
export type CarStatus = "available" | "on_rent" | "maintenance" | "not_available";
export type CarCategory = "SUV" | "Sedan" | "Van" | "Hatchback";
export type Transmission = "Automatic" | "Manual";
export type Fuel = "Petrol" | "Diesel";
export type BookingStatus = "upcoming" | "active" | "completed" | "cancelled";
export type DriverOption = "with_driver" | "self_drive";
export type DurationUnit = "hours" | "days";
export type PaymentPlan = "full_cash" | "full_bank" | "half_cash_half_bank" | "half_now_half_later";
export type PaymentMethod = "cash" | "bank" | "split";
export type PaymentStatus = "unpaid" | "partial" | "paid";
export type SaleType = "sale" | "purchase";
export type SaleStatus = "completed" | "pending";
export type DriverStatus = "available" | "on_trip" | "off_duty";

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: Role;
}

export interface Car {
  id: string;
  name: string;
  category: CarCategory;
  seats: number;
  transmission: Transmission;
  fuel: Fuel;
  plate_no: string;
  status: CarStatus;
  /** Null = use the default rate from Settings. */
  rate_with_driver_hour: number | null;
  rate_with_driver_day: number | null;
  rate_self_hour: number | null;
  rate_self_day: number | null;
  notes?: string | null;
  created_at?: string;
}

export interface Booking {
  id: string;
  booking_code: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  car_id: string;
  car_name: string;
  pickup_datetime: string; // ISO
  return_datetime: string; // ISO
  driver_option: DriverOption;
  duration_value: number;
  duration_unit: DurationUnit;
  rate_per_unit: number;
  total_amount: number;
  advance_amount: number;
  amount_paid: number;
  balance_amount: number;
  payment_plan: PaymentPlan;
  payment_status: PaymentStatus;
  status: BookingStatus;
  driver_id?: string | null;
  driver_name?: string | null;
  late_penalty_amount?: number;
  notes?: string | null;
  created_at?: string;
}

export interface Payment {
  id: string;
  booking_id: string | null;
  booking_code: string | null;
  sale_id: string | null;
  customer_name: string;
  amount: number;
  cash_amount: number;
  bank_amount: number;
  method: PaymentMethod;
  payment_date: string; // ISO date
  reference?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface SaleRecord {
  id: string;
  type: SaleType;
  car_name: string;
  car_details?: string | null;
  party_name: string;
  party_phone?: string | null;
  price: number;
  amount_paid: number;
  balance_amount: number;
  payment_method: PaymentMethod;
  record_date: string; // ISO date
  status: SaleStatus;
  notes?: string | null;
  created_at?: string;
}

export interface Customer {
  id: string;
  full_name: string;
  phone: string;
  address?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface Driver {
  id: string;
  full_name: string;
  age: number;
  date_of_birth: string;
  cnic: string;
  phone: string;
  licence_no: string;
  licence_expiry: string;
  address?: string | null;
  emergency_contact?: string | null;
  status: DriverStatus;
  notes?: string | null;
  photo?: string | null;
  created_at?: string;
}

export interface CustomerSummary {
  customer_id: string;
  full_name: string;
  phone: string;
  total_bookings: number;
  total_rent_amount: number;
  total_paid: number;
  total_pending: number;
}

export interface BusinessSettings {
  business_name: string;
  tagline: string;
  phones: string[];
  sale_purchase_phone: string;
  address: string;
  default_rate_with_driver_hour: number;
  default_rate_with_driver_day: number;
  default_rate_self_hour: number;
  default_rate_self_day: number;
  late_return_penalty_per_hour: number;
  late_penalty_enabled: boolean;
}

export interface DashboardSummary {
  cars_out_today: number;
  todays_bookings: number;
  revenue_collected: number;
  pending_payments: number;
  fleet_available: number;
  fleet_total: number;
  upcoming_bookings_count: number;
}

export interface SettingItem {
  key: string;
  value: string;
  description?: string | null;
}

/** Whole demo store persisted in localStorage (key hktransport_store_v1). */
export interface StoreData {
  version: number;
  seeded_at: string;
  cars: Car[];
  bookings: Booking[];
  payments: Payment[];
  sales: SaleRecord[];
  customers: Customer[];
  drivers: Driver[];
  settings: BusinessSettings;
}

export const CAR_CATEGORIES: CarCategory[] = ["SUV", "Sedan", "Van", "Hatchback"];

export const PAYMENT_PLANS: { value: PaymentPlan; label: string }[] = [
  { value: "full_cash", label: "Full Cash" },
  { value: "full_bank", label: "Full Bank" },
  { value: "half_cash_half_bank", label: "Half Cash + Half Bank" },
  { value: "half_now_half_later", label: "Half Now + Half Later" },
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "split", label: "Cash + Bank (Split)" },
];

/** Demo login — shown on the login page. No real auth until the backend exists. */
export const DEMO_EMAIL = "manager@hktransport.pk";
export const DEMO_PASSWORD = "demo1234";
