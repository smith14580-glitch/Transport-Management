// Demo seed data — SAMPLE ONLY. No real prices, customers or bookings.
// Rates below are placeholder sample rates; the manager sets real rates
// in Settings (default rates) or per car in the Fleet page.
// Dates are generated relative to "today" so the dashboard always shows
// 2 cars out on rent today and 3 upcoming bookings.

import { addDaysISO, atTimeISO, todayISO } from "./format";
import type {
  Booking,
  BusinessSettings,
  Car,
  Customer,
  Driver,
  Payment,
  SaleRecord,
  StoreData,
} from "./types";

export const DEMO_CUSTOMER_SUFFIX = " (Sample)";

function sampleName(name: string): string {
  return `${name}${DEMO_CUSTOMER_SUFFIX}`;
}

export function buildSeed(): StoreData {
  const today = todayISO();

  const settings: BusinessSettings = {
    business_name: "HK Transport",
    tagline: "Rent a Car — Shadman Town, Karachi",
    phones: ["0315-2776677", "0309-2531242", "0322-6320927"],
    sale_purchase_phone: "0317-2873887",
    address: "Shop # B-13, KDA Flats, Sector 14-B, Shadman Town, Karachi",
    // SAMPLE default rates — manager must set real rates in Settings.
    default_rate_with_driver_hour: 2000,
    default_rate_with_driver_day: 15000,
    default_rate_self_hour: 1500,
    default_rate_self_day: 10000,
    late_return_penalty_per_hour: 1000,
    late_penalty_enabled: true,
  };

  const cars: Car[] = [
    { id: "car-1", name: "Toyota Land Cruiser ZX", category: "SUV", seats: 7, transmission: "Automatic", fuel: "Petrol", plate_no: "KHI-4521", status: "on_rent", rate_with_driver_hour: 4000, rate_with_driver_day: 30000, rate_self_hour: 3000, rate_self_day: 20000, notes: "Flagship SUV" },
    { id: "car-2", name: "Toyota Hilux Revo 4x4", category: "SUV", seats: 5, transmission: "Manual", fuel: "Diesel", plate_no: "KHI-7812", status: "on_rent", rate_with_driver_hour: 3000, rate_with_driver_day: 22000, rate_self_hour: 2200, rate_self_day: 15000 },
    { id: "car-3", name: "Toyota Fortuner Sigma 4", category: "SUV", seats: 7, transmission: "Automatic", fuel: "Diesel", plate_no: "KHI-9034", status: "available", rate_with_driver_hour: 3500, rate_with_driver_day: 25000, rate_self_hour: 2500, rate_self_day: 18000 },
    { id: "car-4", name: "Toyota Land Cruiser Prado TX", category: "SUV", seats: 7, transmission: "Automatic", fuel: "Petrol", plate_no: "KHI-2210", status: "maintenance", rate_with_driver_hour: 3800, rate_with_driver_day: 28000, rate_self_hour: 2800, rate_self_day: 20000, notes: "Brake service — back on Friday" },
    { id: "car-5", name: "Toyota Corolla Grande", category: "Sedan", seats: 5, transmission: "Automatic", fuel: "Petrol", plate_no: "KHI-6645", status: "available", rate_with_driver_hour: 1800, rate_with_driver_day: 12000, rate_self_hour: 1200, rate_self_day: 8000 },
    { id: "car-6", name: "Honda Civic", category: "Sedan", seats: 5, transmission: "Automatic", fuel: "Petrol", plate_no: "KHI-3378", status: "available", rate_with_driver_hour: 1800, rate_with_driver_day: 12000, rate_self_hour: 1200, rate_self_day: 8000 },
    { id: "car-7", name: "Kia Sportage", category: "SUV", seats: 5, transmission: "Automatic", fuel: "Petrol", plate_no: "KHI-5589", status: "available", rate_with_driver_hour: 2000, rate_with_driver_day: 14000, rate_self_hour: 1500, rate_self_day: 10000 },
    { id: "car-8", name: "Toyota Hiace", category: "Van", seats: 13, transmission: "Manual", fuel: "Diesel", plate_no: "KHI-1102", status: "available", rate_with_driver_hour: 2500, rate_with_driver_day: 18000, rate_self_hour: 1800, rate_self_day: 13000, notes: "13+ seats — family / group trips" },
    { id: "car-9", name: "Suzuki Alto", category: "Hatchback", seats: 4, transmission: "Manual", fuel: "Petrol", plate_no: "KHI-8843", status: "not_available", rate_with_driver_hour: 900, rate_with_driver_day: 6000, rate_self_hour: 600, rate_self_day: 4000, notes: "Owner use this week" },
  ];

  const customers: Customer[] = [
    { id: "cus-1", full_name: sampleName("Ahmed Raza"), phone: "0300-1112233", address: "North Nazimabad, Karachi", created_at: addDaysISO(-60) },
    { id: "cus-2", full_name: sampleName("Bilal Hussain"), phone: "0321-4455667", address: "Gulshan-e-Iqbal, Karachi", created_at: addDaysISO(-55) },
    { id: "cus-3", full_name: sampleName("Usman Ghani"), phone: "0333-7788990", address: "Defence, Karachi", created_at: addDaysISO(-50) },
    { id: "cus-4", full_name: sampleName("Imran Sheikh"), phone: "0345-2233445", address: "Malir, Karachi", created_at: addDaysISO(-45) },
    { id: "cus-5", full_name: sampleName("Faisal Mehmood"), phone: "0301-9988776", address: "PECHS, Karachi", created_at: addDaysISO(-40) },
    { id: "cus-6", full_name: sampleName("Hassan Ali"), phone: "0312-3344556", address: "Saddar, Karachi", created_at: addDaysISO(-35) },
    { id: "cus-7", full_name: sampleName("Zainab Tariq"), phone: "0322-6677889", address: "Clifton, Karachi", created_at: addDaysISO(-30) },
    { id: "cus-8", full_name: sampleName("Omar Farooq"), phone: "0331-1122334", address: "Korangi, Karachi", created_at: addDaysISO(-25) },
    { id: "cus-9", full_name: sampleName("Sana Malik"), phone: "0346-5566778", address: "Bahadurabad, Karachi", created_at: addDaysISO(-20) },
    { id: "cus-10", full_name: sampleName("Adil Khan"), phone: "0308-9900112", address: "Shadman Town, Karachi", created_at: addDaysISO(-15) },
  ];

  const drivers: Driver[] = [
    { id: "drv-1", full_name: "Kamran Ali (Sample)", age: 34, date_of_birth: "1990-05-12", cnic: "42101-1234567-1", phone: "0300-1234567", licence_no: "KHI-12345", licence_expiry: addDaysISO(180), address: "Gulshan, Karachi", emergency_contact: "0300-9998877", status: "on_trip", notes: "Sample driver", photo: null, created_at: addDaysISO(-60) },
    { id: "drv-2", full_name: "Imtiaz Hussain (Sample)", age: 41, date_of_birth: "1983-09-03", cnic: "42201-7654321-2", phone: "0321-7654321", licence_no: "KHI-67890", licence_expiry: addDaysISO(20), address: "Korangi, Karachi", emergency_contact: "0321-1112233", status: "available", notes: "Licence expiring soon (sample)", photo: null, created_at: addDaysISO(-45) },
    { id: "drv-3", full_name: "Nadeem Raza (Sample)", age: 29, date_of_birth: "1995-11-20", cnic: "42301-1122334-3", phone: "0333-1122334", licence_no: "KHI-11223", licence_expiry: addDaysISO(365), address: "Malir, Karachi", emergency_contact: "0333-4455667", status: "available", notes: "Sample driver", photo: null, created_at: addDaysISO(-30) },
    { id: "drv-4", full_name: "Salman Qureshi (Sample)", age: 37, date_of_birth: "1987-02-14", cnic: "42401-9988776-4", phone: "0345-9988776", licence_no: "KHI-99887", licence_expiry: addDaysISO(90), address: "Defence, Karachi", emergency_contact: "0345-2233445", status: "off_duty", notes: "On leave (sample)", photo: null, created_at: addDaysISO(-20) },
    { id: "drv-5", full_name: "Tariq Mehmood (Sample)", age: 46, date_of_birth: "1978-07-08", cnic: "42501-5566778-5", phone: "0312-5566778", licence_no: "KHI-55667", licence_expiry: addDaysISO(200), address: "PECHS, Karachi", emergency_contact: "0312-3344556", status: "available", notes: "Sample driver", photo: null, created_at: addDaysISO(-10) },
  ];

  const bookings: Booking[] = [
    {
      id: "bk-1", booking_code: "HK-2026-0001", customer_id: "cus-1",
      customer_name: sampleName("Ahmed Raza"), customer_phone: "0300-1112233",
      car_id: "car-1", car_name: "Toyota Land Cruiser ZX",
      pickup_datetime: atTimeISO(today, "09:00"), return_datetime: atTimeISO(today, "21:00"),
      driver_option: "with_driver", duration_value: 1, duration_unit: "days",
      rate_per_unit: 30000, total_amount: 30000, advance_amount: 15000, amount_paid: 15000,
      balance_amount: 15000, payment_plan: "half_now_half_later", payment_status: "partial",
      status: "active", driver_id: "drv-1", driver_name: "Kamran Ali (Sample)", notes: "Wedding guest pickup — airport run", created_at: addDaysISO(-1),
    },
    {
      id: "bk-2", booking_code: "HK-2026-0002", customer_id: "cus-2",
      customer_name: sampleName("Bilal Hussain"), customer_phone: "0321-4455667",
      car_id: "car-2", car_name: "Toyota Hilux Revo 4x4",
      pickup_datetime: atTimeISO(addDaysISO(-1), "10:00"), return_datetime: atTimeISO(addDaysISO(-1), "18:00"),
      driver_option: "self_drive", duration_value: 2, duration_unit: "days",
      rate_per_unit: 15000, total_amount: 30000, advance_amount: 10000, amount_paid: 30000,
      balance_amount: 0, payment_plan: "full_cash", payment_status: "paid",
      status: "active", notes: "Northern areas trip", created_at: addDaysISO(-2),
    },
    {
      id: "bk-3", booking_code: "HK-2026-0003", customer_id: "cus-3",
      customer_name: sampleName("Usman Ghani"), customer_phone: "0333-7788990",
      car_id: "car-3", car_name: "Toyota Fortuner Sigma 4",
      pickup_datetime: atTimeISO(addDaysISO(1), "08:00"), return_datetime: atTimeISO(addDaysISO(3), "20:00"),
      driver_option: "with_driver", duration_value: 2, duration_unit: "days",
      rate_per_unit: 25000, total_amount: 50000, advance_amount: 25000, amount_paid: 25000,
      balance_amount: 25000, payment_plan: "half_cash_half_bank", payment_status: "partial",
      status: "upcoming", notes: "Family function — 2 days", created_at: addDaysISO(-1),
    },
    {
      id: "bk-4", booking_code: "HK-2026-0004", customer_id: "cus-6",
      customer_name: sampleName("Hassan Ali"), customer_phone: "0312-3344556",
      car_id: "car-5", car_name: "Toyota Corolla Grande",
      pickup_datetime: atTimeISO(addDaysISO(3), "10:00"), return_datetime: atTimeISO(addDaysISO(4), "22:00"),
      driver_option: "self_drive", duration_value: 1, duration_unit: "days",
      rate_per_unit: 8000, total_amount: 8000, advance_amount: 4000, amount_paid: 4000,
      balance_amount: 4000, payment_plan: "half_now_half_later", payment_status: "partial",
      status: "upcoming", created_at: addDaysISO(-1),
    },
    {
      id: "bk-5", booking_code: "HK-2026-0005", customer_id: "cus-7",
      customer_name: sampleName("Zainab Tariq"), customer_phone: "0322-6677889",
      car_id: "car-8", car_name: "Toyota Hiace",
      pickup_datetime: atTimeISO(addDaysISO(5), "07:00"), return_datetime: atTimeISO(addDaysISO(8), "21:00"),
      driver_option: "with_driver", duration_value: 3, duration_unit: "days",
      rate_per_unit: 18000, total_amount: 54000, advance_amount: 0, amount_paid: 0,
      balance_amount: 54000, payment_plan: "full_cash", payment_status: "unpaid",
      status: "upcoming", notes: "Group picnic — 13 people", created_at: addDaysISO(-1),
    },
    {
      id: "bk-6", booking_code: "HK-2026-0006", customer_id: "cus-4",
      customer_name: sampleName("Imran Sheikh"), customer_phone: "0345-2233445",
      car_id: "car-6", car_name: "Honda Civic",
      pickup_datetime: atTimeISO(addDaysISO(-4), "09:00"), return_datetime: atTimeISO(addDaysISO(-2), "21:00"),
      driver_option: "self_drive", duration_value: 2, duration_unit: "days",
      rate_per_unit: 8000, total_amount: 16000, advance_amount: 0, amount_paid: 16000,
      balance_amount: 0, payment_plan: "full_cash", payment_status: "paid",
      status: "completed", created_at: addDaysISO(-5),
    },
    {
      id: "bk-7", booking_code: "HK-2026-0007", customer_id: "cus-5",
      customer_name: sampleName("Faisal Mehmood"), customer_phone: "0301-9988776",
      car_id: "car-4", car_name: "Toyota Land Cruiser Prado TX",
      pickup_datetime: atTimeISO(addDaysISO(-6), "08:00"), return_datetime: atTimeISO(addDaysISO(-5), "20:00"),
      driver_option: "with_driver", duration_value: 1, duration_unit: "days",
      rate_per_unit: 28000, total_amount: 28000, advance_amount: 14000, amount_paid: 28000,
      balance_amount: 0, payment_plan: "half_cash_half_bank", payment_status: "paid",
      status: "completed", created_at: addDaysISO(-7),
    },
    {
      id: "bk-8", booking_code: "HK-2026-0008", customer_id: "cus-8",
      customer_name: sampleName("Omar Farooq"), customer_phone: "0331-1122334",
      car_id: "car-9", car_name: "Suzuki Alto",
      pickup_datetime: atTimeISO(addDaysISO(-9), "10:00"), return_datetime: atTimeISO(addDaysISO(-6), "20:00"),
      driver_option: "self_drive", duration_value: 3, duration_unit: "days",
      rate_per_unit: 4000, total_amount: 12000, advance_amount: 0, amount_paid: 12000,
      balance_amount: 0, payment_plan: "full_cash", payment_status: "paid",
      status: "completed", created_at: addDaysISO(-10),
    },
    {
      id: "bk-9", booking_code: "HK-2026-0009", customer_id: "cus-9",
      customer_name: sampleName("Sana Malik"), customer_phone: "0346-5566778",
      car_id: "car-7", car_name: "Kia Sportage",
      pickup_datetime: atTimeISO(addDaysISO(-10), "09:00"), return_datetime: atTimeISO(addDaysISO(-8), "21:00"),
      driver_option: "with_driver", duration_value: 2, duration_unit: "days",
      rate_per_unit: 14000, total_amount: 28000, advance_amount: 10000, amount_paid: 20000,
      balance_amount: 8000, payment_plan: "half_now_half_later", payment_status: "partial",
      status: "completed", notes: "Balance still pending", created_at: addDaysISO(-11),
    },
    {
      id: "bk-10", booking_code: "HK-2026-0010", customer_id: "cus-10",
      customer_name: sampleName("Adil Khan"), customer_phone: "0308-9900112",
      car_id: "car-5", car_name: "Toyota Corolla Grande",
      pickup_datetime: atTimeISO(addDaysISO(2), "09:00"), return_datetime: atTimeISO(addDaysISO(3), "21:00"),
      driver_option: "self_drive", duration_value: 1, duration_unit: "days",
      rate_per_unit: 8000, total_amount: 8000, advance_amount: 0, amount_paid: 0,
      balance_amount: 8000, payment_plan: "full_cash", payment_status: "unpaid",
      status: "cancelled", notes: "Customer cancelled — plan changed", created_at: addDaysISO(-3),
    },
    {
      id: "bk-11", booking_code: "HK-2026-0011", customer_id: "cus-1",
      customer_name: sampleName("Ahmed Raza"), customer_phone: "0300-1112233",
      car_id: "car-1", car_name: "Toyota Land Cruiser ZX",
      pickup_datetime: atTimeISO(addDaysISO(-14), "08:00"), return_datetime: atTimeISO(addDaysISO(-12), "20:00"),
      driver_option: "with_driver", duration_value: 2, duration_unit: "days",
      rate_per_unit: 30000, total_amount: 60000, advance_amount: 30000, amount_paid: 60000,
      balance_amount: 0, payment_plan: "full_bank", payment_status: "paid",
      status: "completed", created_at: addDaysISO(-15),
    },
    {
      id: "bk-12", booking_code: "HK-2026-0012", customer_id: "cus-2",
      customer_name: sampleName("Bilal Hussain"), customer_phone: "0321-4455667",
      car_id: "car-2", car_name: "Toyota Hilux Revo 4x4",
      pickup_datetime: atTimeISO(addDaysISO(-17), "10:00"), return_datetime: atTimeISO(addDaysISO(-16), "22:00"),
      driver_option: "self_drive", duration_value: 1, duration_unit: "days",
      rate_per_unit: 15000, total_amount: 15000, advance_amount: 0, amount_paid: 15000,
      balance_amount: 0, payment_plan: "full_cash", payment_status: "paid",
      status: "completed", created_at: addDaysISO(-18),
    },
  ];

  const payments: Payment[] = [
    { id: "pay-1", booking_id: "bk-1", booking_code: "HK-2026-0001", sale_id: null, customer_name: sampleName("Ahmed Raza"), amount: 15000, cash_amount: 15000, bank_amount: 0, method: "cash", payment_date: today, reference: null, notes: "Advance — half now", created_at: today },
    { id: "pay-2", booking_id: "bk-2", booking_code: "HK-2026-0002", sale_id: null, customer_name: sampleName("Bilal Hussain"), amount: 10000, cash_amount: 10000, bank_amount: 0, method: "cash", payment_date: addDaysISO(-2), reference: null, notes: "Advance", created_at: addDaysISO(-2) },
    { id: "pay-3", booking_id: "bk-2", booking_code: "HK-2026-0002", sale_id: null, customer_name: sampleName("Bilal Hussain"), amount: 20000, cash_amount: 20000, bank_amount: 0, method: "cash", payment_date: today, reference: null, notes: "Remaining on return", created_at: today },
    { id: "pay-4", booking_id: "bk-3", booking_code: "HK-2026-0003", sale_id: null, customer_name: sampleName("Usman Ghani"), amount: 25000, cash_amount: 12500, bank_amount: 12500, method: "split", payment_date: addDaysISO(-1), reference: "TRX-8812", notes: "Half cash + half bank", created_at: addDaysISO(-1) },
    { id: "pay-5", booking_id: "bk-4", booking_code: "HK-2026-0004", sale_id: null, customer_name: sampleName("Hassan Ali"), amount: 4000, cash_amount: 0, bank_amount: 4000, method: "bank", payment_date: addDaysISO(-1), reference: "TRX-7740", notes: "Advance by bank", created_at: addDaysISO(-1) },
    { id: "pay-6", booking_id: "bk-6", booking_code: "HK-2026-0006", sale_id: null, customer_name: sampleName("Imran Sheikh"), amount: 8000, cash_amount: 8000, bank_amount: 0, method: "cash", payment_date: addDaysISO(-4), reference: null, notes: "Advance", created_at: addDaysISO(-4) },
    { id: "pay-7", booking_id: "bk-6", booking_code: "HK-2026-0006", sale_id: null, customer_name: sampleName("Imran Sheikh"), amount: 8000, cash_amount: 0, bank_amount: 8000, method: "bank", payment_date: addDaysISO(-2), reference: "TRX-6601", notes: "Remaining by bank", created_at: addDaysISO(-2) },
    { id: "pay-8", booking_id: "bk-7", booking_code: "HK-2026-0007", sale_id: null, customer_name: sampleName("Faisal Mehmood"), amount: 28000, cash_amount: 14000, bank_amount: 14000, method: "split", payment_date: addDaysISO(-6), reference: "TRX-5523", notes: "Half cash + half bank", created_at: addDaysISO(-6) },
    { id: "pay-9", booking_id: "bk-8", booking_code: "HK-2026-0008", sale_id: null, customer_name: sampleName("Omar Farooq"), amount: 12000, cash_amount: 12000, bank_amount: 0, method: "cash", payment_date: addDaysISO(-9), reference: null, notes: "Full cash", created_at: addDaysISO(-9) },
    { id: "pay-10", booking_id: "bk-9", booking_code: "HK-2026-0009", sale_id: null, customer_name: sampleName("Sana Malik"), amount: 12000, cash_amount: 12000, bank_amount: 0, method: "cash", payment_date: addDaysISO(-10), reference: null, notes: "Advance", created_at: addDaysISO(-10) },
    { id: "pay-11", booking_id: "bk-9", booking_code: "HK-2026-0009", sale_id: null, customer_name: sampleName("Sana Malik"), amount: 8000, cash_amount: 0, bank_amount: 8000, method: "bank", payment_date: addDaysISO(-8), reference: "TRX-4190", notes: "Second instalment", created_at: addDaysISO(-8) },
    { id: "pay-12", booking_id: "bk-11", booking_code: "HK-2026-0011", sale_id: null, customer_name: sampleName("Ahmed Raza"), amount: 30000, cash_amount: 30000, bank_amount: 0, method: "cash", payment_date: addDaysISO(-14), reference: null, notes: "Advance", created_at: addDaysISO(-14) },
    { id: "pay-13", booking_id: "bk-11", booking_code: "HK-2026-0011", sale_id: null, customer_name: sampleName("Ahmed Raza"), amount: 30000, cash_amount: 0, bank_amount: 30000, method: "bank", payment_date: addDaysISO(-12), reference: "TRX-3088", notes: "Remaining by bank", created_at: addDaysISO(-12) },
    { id: "pay-14", booking_id: "bk-12", booking_code: "HK-2026-0012", sale_id: null, customer_name: sampleName("Bilal Hussain"), amount: 15000, cash_amount: 15000, bank_amount: 0, method: "cash", payment_date: addDaysISO(-17), reference: null, notes: "Full cash", created_at: addDaysISO(-17) },
    { id: "pay-15", booking_id: null, booking_code: null, sale_id: "sr-1", customer_name: sampleName("Usman Ghani"), amount: 2850000, cash_amount: 2850000, bank_amount: 0, method: "cash", payment_date: addDaysISO(-20), reference: null, notes: "Car sale — Toyota Corolla 2018", created_at: addDaysISO(-20) },
  ];

  const sales: SaleRecord[] = [
    { id: "sr-1", type: "sale", car_name: "Toyota Corolla 2018", car_details: "1.8 Grande, 62,000 km", party_name: sampleName("Usman Ghani"), party_phone: "0333-7788990", price: 2850000, amount_paid: 2850000, balance_amount: 0, payment_method: "cash", record_date: addDaysISO(-20), status: "completed", notes: "Sold via 2 Rist Transport" },
    { id: "sr-2", type: "purchase", car_name: "Toyota Fortuner 2021", car_details: "Sigma 4, 48,000 km", party_name: sampleName("Karachi Motors"), party_phone: "0300-5556677", price: 11500000, amount_paid: 11500000, balance_amount: 0, payment_method: "bank", record_date: addDaysISO(-35), status: "completed", notes: "Added to rental fleet as Fortuner Sigma 4" },
    { id: "sr-3", type: "sale", car_name: "Suzuki Mehran 2017", car_details: "VXR, 88,000 km", party_name: sampleName("Imran Sheikh"), party_phone: "0345-2233445", price: 950000, amount_paid: 600000, balance_amount: 350000, payment_method: "cash", record_date: addDaysISO(-10), status: "pending", notes: "Balance due in 2 weeks" },
    { id: "sr-4", type: "purchase", car_name: "Honda Civic 2020", car_details: "1.8 Oriel, 55,000 km", party_name: sampleName("Auto Deals"), party_phone: "0321-9988776", price: 4200000, amount_paid: 4200000, balance_amount: 0, payment_method: "bank", record_date: addDaysISO(-50), status: "completed", notes: "Added to rental fleet as Honda Civic" },
    { id: "sr-5", type: "sale", car_name: "Toyota Hilux 2019", car_details: "Revo 4x4, 71,000 km", party_name: sampleName("Faisal Mehmood"), party_phone: "0301-9988776", price: 6800000, amount_paid: 6800000, balance_amount: 0, payment_method: "split", record_date: addDaysISO(-5), status: "completed", notes: "Half cash + half bank — sold via 2 Rist Transport" },
    { id: "sr-6", type: "purchase", car_name: "Suzuki Alto 2022", car_details: "VXL AGS, 21,000 km", party_name: sampleName("City Cars"), party_phone: "0333-1122445", price: 1950000, amount_paid: 1000000, balance_amount: 950000, payment_method: "bank", record_date: addDaysISO(-2), status: "pending", notes: "Balance on delivery of documents" },
  ];

  return {
    version: 2,
    seeded_at: today,
    cars,
    bookings,
    payments,
    sales,
    customers,
    drivers,
    settings,
  };
}
