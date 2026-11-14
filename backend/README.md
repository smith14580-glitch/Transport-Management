# HK Transport — Backend (FastAPI + Neon PostgreSQL)

Real backend for the existing HK Transport Next.js frontend. It implements the
API consumed by `frontend/lib/api.ts` under `/api/v1`, with the same field
names, enums and error codes. The frontend was not modified.

- **Stack:** FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, psycopg 3
- **Database:** Neon PostgreSQL
- **Auth:** JWT Bearer (python-jose) + bcrypt password hashing
- **Timezone:** Asia/Karachi (all business dates)
- **Money:** `NUMERIC(12,2)`, JSON numbers

## Layout

```
backend/
  app/
    main.py                 FastAPI app, CORS, /health, /docs, error envelope
    core/                   config.py, security.py, deps.py, errors.py
    db/                     base.py, session.py
    models/                 users, cars, customers, bookings, payments,
                            sale_records, settings
    schemas/                Pydantic request/response models
    routers/                auth, dashboard, bookings, cars, payments,
                            records, customers, settings, demo
    services/               overlap/code/totals, payments, settings, seed
  alembic/                  migration 20261114_0001 (head)
  seed.py                   SAMPLE demo data
  requirements.txt
  .env.example              names/descriptions only — no values
```

## Environment

Copy `.env.example` to `backend/.env` and fill it in locally. Never commit
`.env`.

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Neon pooled URL (`...?sslmode=require&channel_binding=require`) |
| `SECRET_KEY` | yes | Long random string used to sign JWTs |
| `FRONTEND_URL` | yes | Vercel URL; comma-separated values allowed. `http://localhost:3000` is always allowed |
| `ENVIRONMENT` | yes | `development` locally, `production` on Render |
| `SEED_MANAGER_EMAIL` | seed only | Manager login email |
| `SEED_MANAGER_PASSWORD` | seed only | Manager password — bcrypt-hashed, never printed or committed |
| `SEED_MANAGER_NAME` | no | Defaults to `Talha — Manager` |
| `SEED_MANAGER_PHONE` | no | Defaults to `0315-2776677` |
| `JWT_ALGORITHM` | no | Default `HS256` |
| `JWT_EXPIRE_MINUTES` | no | Default `15` |
| `APP_TIMEZONE` | no | Default `Asia/Karachi` |

> The frontend login page still prints the old demo hint (`demo1234`). It was
> intentionally left untouched. The real password is the value of
> `SEED_MANAGER_PASSWORD`.

## Local run

Python 3.12+ is recommended.

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

# .env must exist before these steps
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe seed.py

.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

- API: `http://localhost:8000`
- Docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

Frontend (`frontend/.env.local`):

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Run `npm run dev` in `frontend/`. The demo banner disappears and data is read
from the backend.

## Seed data

All seed rows are **SAMPLE** data only (`(Sample)` is appended to customer and
party names). It creates:

- 1 manager (email/password from env)
- 9 cars
- 10 customers
- 12 bookings (`HK-2026-0001` … `HK-2026-0012`)
- booking + sale payment history
- 6 sale/purchase records
- 9 settings keys

Re-seed:

```powershell
.\.venv\Scripts\python.exe seed.py --reset
```

`POST /api/v1/demo/reset` does the same through the API and is **disabled when
`ENVIRONMENT=production`** (returns 404).

## API

Base URL: `/api/v1`. Every response uses:

```json
{ "success": true, "data": ... }
{ "success": false, "error": { "code": "...", "message": "..." } }
```

All `/api/v1` endpoints require `Authorization: Bearer <JWT>`, except
`POST /auth/login`. Tokens expire in 15 minutes.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/login` | Login, returns `access_token`, `token_type`, `user` |
| GET | `/auth/me` | Current manager |
| POST | `/auth/logout` | Stateless logout acknowledgement |
| GET | `/dashboard/summary` | Counters and money totals |
| GET | `/bookings` | List + `search`, `status`, `payment_status`, `car_id`, `date_from`, `date_to` |
| GET | `/bookings/{id_or_code}` | One booking by UUID or `HK-YYYY-NNNN` |
| POST | `/bookings` | Create booking (+ customer + optional advance payment) |
| PATCH | `/bookings/{id_or_code}` | Update dates/notes/amounts |
| POST | `/bookings/{id_or_code}/cancel` | Cancel with optional reason |
| POST | `/bookings/{id_or_code}/complete` | Mark completed |
| GET | `/availability/check` | `car_id`, `pickup_datetime`, `return_datetime`, optional `exclude_booking_id` |
| GET | `/cars` | Fleet list |
| GET | `/cars/{id}` | One car |
| POST | `/cars` | Create car |
| PATCH | `/cars/{id}` | Update car (null rate = use Settings default) |
| DELETE | `/cars/{id}` | Delete; 400 if active/upcoming bookings |
| GET | `/payments` | Payment history (newest first) |
| GET | `/payments/outstanding` | Bookings with balance > 0 |
| GET | `/bookings/{id}/payments` | Payments for one booking |
| POST | `/bookings/{id}/payments` | Record cash/bank/split payment |
| GET | `/records/rent` | Full rent history |
| GET | `/records/sales` | Sale & purchase records |
| POST | `/records/sales` | Create sale/purchase (+ payment if paid > 0) |
| GET | `/customers` | Customers, optional `search` |
| GET | `/customers/summaries` | Per-customer booking/rent/paid/pending totals |
| GET | `/settings` | Business info + default rates |
| PATCH | `/settings` | Partial update |
| POST | `/demo/reset` | Dev only: wipe and reseed SAMPLE data |

### Error codes

`INVALID_CREDENTIALS` (401), `UNAUTHORIZED` (401), `FORBIDDEN` (403),
`NOT_FOUND` (404), `VALIDATION_ERROR` (422), `DOUBLE_BOOKING` (409),
`OVERPAYMENT` (400), `INVALID_SPLIT` (400), `CAR_HAS_ACTIVE_BOOKINGS` (400),
`CANNOT_CANCEL` / `CANNOT_COMPLETE` / `BOOKING_CANCELLED` (400),
`PLATE_EXISTS` (409), `CAR_HAS_ACTIVE_BOOKINGS`, `INTERNAL_ERROR` (500).

## Business rules implemented

1. **Double booking:** creation locks the car row, checks overlapping
   `upcoming`/`active` bookings with `pickup < existing.return AND return >
   existing.pickup`, and returns `409 DOUBLE_BOOKING`. A PostgreSQL GiST
   exclusion constraint (`bookings_no_overlap_excl` on `car_id` +
   `tstzrange(pickup_datetime, return_datetime)`) is the second, DB-level
   guard (requires `btree_gist`).
2. **Booking creation:** reuses a customer by normalized phone (or creates
   one), allocates `HK-YYYY-NNNN` under a per-year advisory lock, sets status
   to `active` when pickup is today/past else `upcoming`, and records the
   advance when `advance_amount > 0`.
3. **Payments:** rejects `amount > balance` with `400 OVERPAYMENT`; split
   requires `cash_amount + bank_amount == amount`; cash/bank methods force the
   other component to 0. Balances and `payment_status` are recomputed inside
   the same transaction.
4. **Sales:** `balance = price - amount_paid`; `completed` when balance is 0,
   otherwise `pending`; a payment row is created when `amount_paid > 0`.
5. **Rates:** each car rate is nullable (`null` means use the Settings
   default).
6. **Secrets:** manager password only comes from `SEED_MANAGER_PASSWORD` and is
   stored as a bcrypt hash.
7. **CORS:** `FRONTEND_URL` plus `http://localhost:3000` /
   `http://127.0.0.1:3000`.

## Verification performed

Against the Neon database:

- `alembic upgrade head` → `20261114_0001 (head)`
- `seed.py` → clean SAMPLE data (1 manager, 9 cars, 10 customers,
  12 bookings, 20 payments, 6 sale records, 9 settings)
- 43/43 API checks passed, including:
  - `POST /api/v1/bookings` overlapping → **409 DOUBLE_BOOKING**
  - `POST /api/v1/bookings/{id}/payments` over balance → **400 OVERPAYMENT**
  - direct SQL overlapping insert → rejected by `bookings_no_overlap_excl`
- 13/13 browser checks with Chrome:
  - Dashboard showed backend fleet `9 total cars` and revenue
    `PKR 27,175,000` (the demo local store would show `3,075,000`)
  - Real JWT stored, localStorage demo store absent
  - A booking created through the UI appeared via
    `GET /api/v1/bookings?search=...` (`HK-2027-0001`)
  - Demo reset restored the seed afterwards

A non-blocking Next.js hydration warning exists because `AuthProvider`
initializes auth state from `localStorage` on the client. The page recovers and
works; the frontend was left unchanged as requested.

## Deploy

### Backend → Render

1. Create a **Web Service** from the repo.
2. **Root Directory:** `backend`
3. **Build Command:** `pip install -r requirements.txt`
4. **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. **Health Check Path:** `/health`
6. Environment variables:
   - `DATABASE_URL` = Neon pooled connection URL
   - `SECRET_KEY` = long random string
   - `FRONTEND_URL` = `https://<your-app>.vercel.app`
   - `ENVIRONMENT` = `production`
   - `SEED_MANAGER_EMAIL` / `SEED_MANAGER_PASSWORD` (only if you run `seed.py`)
7. Run once (Render Shell): `alembic upgrade head` and `python seed.py`
   (first deploy only; skip `seed.py` afterwards).
8. Use a paid always-on instance or expect cold starts on free tier.

### Frontend → Vercel

1. Import the repo and set **Root Directory** to `frontend`.
2. Add environment variable:
   - `NEXT_PUBLIC_API_URL` = `https://<your-render-service>.onrender.com`
3. Redeploy after adding the variable (`NEXT_PUBLIC_*` is baked at build time).
4. Set the Render `FRONTEND_URL` to the Vercel production URL (add preview
   URLs comma-separated if you use them), then redeploy the backend so CORS
   allows the frontend.

FastAPI does not run natively on Vercel as a Python backend; Render is the
backend host.
