# HK Transport — Transport Management System (Frontend)

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + lucide-react.
Rent-a-car bookings, fleet stock, payments, rent records, sale & purchase
records, customers and settings — for HK Transport, Shadman Town, Karachi.

## Run (demo mode — no backend needed)

```bash
npm install
npm run dev        # http://localhost:3000
```

Demo login (shown on the login page):

- Email: `manager@hktransport.pk`
- Password: `demo1234`

Bina login ke bhi app dekh sakte ho (Demo View) — lekin add/edit/record
karne ke liye login zaroori hai. Demo data localStorage me save hota hai
(key `hktransport_store_v1`); Settings se reset kar sakte ho.

**Demo data hai — koi asli price, customer ya booking nahi.** Sample rates
Settings me badlo; per-car rates Fleet page se badlo.

## Run with the real backend

1. FastAPI backend chalao (see `../API_CONTRACT.md`).
2. `.env.local` banao:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
3. `npm run dev` — demo banner gayab ho jayega, data backend se aayega.

## Routes

| Route | Kya hai |
| --- | --- |
| `/` | Dashboard — aaj rent par gaariyan, upcoming bookings alert, recent payments, quick actions |
| `/bookings` | Booking list + status filter + search |
| `/bookings/new` | New booking — driver/self-drive, duration, rate auto-fill, payment plan (Full Cash / Full Bank / Half Cash+Bank / Half Now+Later), double-booking block |
| `/bookings/[id]` | Booking detail — payment status, edit/cancel, record payment |
| `/fleet` | Stock — Available / On Rent / Maintenance / Not Available, availability toggle, add/edit/delete car, per-car rates |
| `/payments` | Saari payments — Cash / Bank / Split, pending-only filter, partial payment record |
| `/records/rent` | Poori rent history |
| `/records/sales` | Sale & purchase history (2 Rist Transport) |
| `/sales/new` | Sale ya purchase record add karo |
| `/customers` | Customer list — times rented, total paid, pending |
| `/settings` | Business info + default rates (with/without driver, per hour/day) + demo reset |
| `/login` | Manager login (demo account) |

EN/اردو toggle header me hai (RTL + Noto Nastaliq Urdu). Mobile responsive —
sidebar 360px par hamburger me badal jata hai.

## Build

```bash
npm run build
npm run lint
npm start
```
