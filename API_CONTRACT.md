# API Contract — HK Transport Management System

Base URL: `{NEXT_PUBLIC_API_URL}/api/v1` (default local `http://localhost:8000/api/v1`).
Auth: `Authorization: Bearer <JWT>` on every endpoint except `POST /auth/login`.
Token expiry: 15 minutes. Single role: `manager`.
Response envelope: `{ "success": true, "data": ... }` / `{ "success": false, "error": { "code", "message" } }`.

## Auth
- `POST /auth/login` → `{ access_token, token_type, user }` (401 `INVALID_CREDENTIALS`)
- `GET /auth/me` → User
- `POST /auth/logout` → null

## Dashboard
- `GET /dashboard/summary` → `{ cars_out_today, todays_bookings, revenue_collected, pending_payments, fleet_available, fleet_total, upcoming_bookings_count }`

## Bookings
- `GET /bookings` (filters: search, status, payment_status, car_id, date_from, date_to)
- `GET /bookings/{id_or_code}`
- `POST /bookings` (create; 409 `DOUBLE_BOOKING`)
- `PATCH /bookings/{id_or_code}`
- `POST /bookings/{id_or_code}/cancel` body `{ reason? }`
- `POST /bookings/{id_or_code}/complete`
- `GET /availability/check?car_id&pickup_datetime&return_datetime&exclude_booking_id?`
- `GET /bookings/{id}/payments`
- `POST /bookings/{id}/payments` body `{ amount, method, cash_amount?, bank_amount?, payment_date, reference?, notes? }` (400 `OVERPAYMENT`, `INVALID_SPLIT`)
- `POST /bookings/{id}/assign-driver` body `{ driver_id: string | null }` (400 `DRIVER_NOT_AVAILABLE`)

Booking fields include: `driver_id`, `driver_name`, `late_penalty_amount`.

## Cars
- `GET /cars`, `GET /cars/{id}`, `POST /cars`, `PATCH /cars/{id}`, `DELETE /cars/{id}` (400 `CAR_HAS_ACTIVE_BOOKINGS`)

## Payments
- `GET /payments`, `GET /payments/outstanding`

## Records
- `GET /records/rent`, `GET /records/sales`, `POST /records/sales`

## Customers
- `GET /customers?search=`, `GET /customers/summaries`

## Settings
- `GET /settings`, `PATCH /settings`
- BusinessSettings includes: `late_return_penalty_per_hour: number`, `late_penalty_enabled: boolean`

## Drivers (new)
- `GET /drivers` → Driver[]
- `GET /drivers/{id}` → Driver
- `POST /drivers` body `{ full_name, age, date_of_birth, cnic, phone, licence_no, licence_expiry, address?, emergency_contact?, status, notes?, photo? }`
- `PATCH /drivers/{id}`
- `DELETE /drivers/{id}` (400 `DRIVER_ON_TRIP` if on trip)
- `GET /drivers/{id}/trips` → Booking[]

Driver: `{ id, full_name, age, date_of_birth, cnic, phone, licence_no, licence_expiry, address, emergency_contact, status: "available"|"on_trip"|"off_duty", notes, photo, created_at }`

## Demo
- `POST /demo/reset` (dev only; 404 in production)

## Error codes
`INVALID_CREDENTIALS`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `DOUBLE_BOOKING`, `OVERPAYMENT`, `INVALID_SPLIT`, `CAR_HAS_ACTIVE_BOOKINGS`, `CANNOT_CANCEL`, `CANNOT_COMPLETE`, `BOOKING_CANCELLED`, `DRIVER_ON_TRIP`, `DRIVER_NOT_AVAILABLE`, `PLATE_EXISTS`, `INTERNAL_ERROR`.