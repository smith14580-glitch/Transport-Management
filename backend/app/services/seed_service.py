from datetime import date, datetime, timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models import Booking, Car, Customer, Payment, SaleRecord, Setting, User
from app.services.common import TZ, datetime_on, money, today_local
from app.services.settings_service import DEFAULT_SETTINGS

SAMPLE_SUFFIX = " (Sample)"


def _d(offset: int) -> date:
    return today_local() + timedelta(days=offset)


def _dt(offset: int, hhmm: str) -> datetime:
    return datetime_on(_d(offset), hhmm)


def _ensure_manager(db: Session) -> None:
    email = settings.seed_manager_email.strip().lower()
    existing = db.execute(select(User).where(func.lower(User.email) == email)).scalar_one_or_none()
    if existing:
        return
    if not settings.seed_manager_password:
        raise RuntimeError(
            "SEED_MANAGER_PASSWORD is not set. Add it to backend/.env before seeding."
        )
    db.add(
        User(
            full_name=settings.seed_manager_name,
            email=email,
            phone=settings.seed_manager_phone,
            password_hash=hash_password(settings.seed_manager_password),
            role="manager",
        )
    )


def _clear_sample_data(db: Session) -> None:
    db.execute(delete(Payment))
    db.execute(delete(Booking))
    db.execute(delete(SaleRecord))
    db.execute(delete(Customer))
    db.execute(delete(Car))
    db.execute(delete(Setting))
    db.flush()


def seed_database(db: Session, reset: bool = False) -> bool:
    existing = db.execute(select(func.count(Car.id))).scalar_one()
    if existing and not reset:
        return False
    if reset:
        _clear_sample_data(db)

    _ensure_manager(db)

    for key, (value, description) in DEFAULT_SETTINGS.items():
        db.add(Setting(key=key, value=value, description=description))

    cars = [
        Car(name="Toyota Land Cruiser ZX", category="SUV", seats=7, transmission="Automatic", fuel="Petrol", plate_no="KHI-4521", status="on_rent", rate_with_driver_hour=money(4000), rate_with_driver_day=money(30000), rate_self_hour=money(3000), rate_self_day=money(20000), notes="Flagship SUV"),
        Car(name="Toyota Hilux Revo 4x4", category="SUV", seats=5, transmission="Manual", fuel="Diesel", plate_no="KHI-7812", status="on_rent", rate_with_driver_hour=money(3000), rate_with_driver_day=money(22000), rate_self_hour=money(2200), rate_self_day=money(15000)),
        Car(name="Toyota Fortuner Sigma 4", category="SUV", seats=7, transmission="Automatic", fuel="Diesel", plate_no="KHI-9034", status="available", rate_with_driver_hour=money(3500), rate_with_driver_day=money(25000), rate_self_hour=money(2500), rate_self_day=money(18000)),
        Car(name="Toyota Land Cruiser Prado TX", category="SUV", seats=7, transmission="Automatic", fuel="Petrol", plate_no="KHI-2210", status="maintenance", rate_with_driver_hour=money(3800), rate_with_driver_day=money(28000), rate_self_hour=money(2800), rate_self_day=money(20000), notes="Brake service — back on Friday"),
        Car(name="Toyota Corolla Grande", category="Sedan", seats=5, transmission="Automatic", fuel="Petrol", plate_no="KHI-6645", status="available", rate_with_driver_hour=money(1800), rate_with_driver_day=money(12000), rate_self_hour=money(1200), rate_self_day=money(8000)),
        Car(name="Honda Civic", category="Sedan", seats=5, transmission="Automatic", fuel="Petrol", plate_no="KHI-3378", status="available", rate_with_driver_hour=money(1800), rate_with_driver_day=money(12000), rate_self_hour=money(1200), rate_self_day=money(8000)),
        Car(name="Kia Sportage", category="SUV", seats=5, transmission="Automatic", fuel="Petrol", plate_no="KHI-5589", status="available", rate_with_driver_hour=money(2000), rate_with_driver_day=money(14000), rate_self_hour=money(1500), rate_self_day=money(10000)),
        Car(name="Toyota Hiace", category="Van", seats=13, transmission="Manual", fuel="Diesel", plate_no="KHI-1102", status="available", rate_with_driver_hour=money(2500), rate_with_driver_day=money(18000), rate_self_hour=money(1800), rate_self_day=money(13000), notes="13+ seats — family / group trips"),
        Car(name="Suzuki Alto", category="Hatchback", seats=4, transmission="Manual", fuel="Petrol", plate_no="KHI-8843", status="not_available", rate_with_driver_hour=money(900), rate_with_driver_day=money(6000), rate_self_hour=money(600), rate_self_day=money(4000), notes="Owner use this week"),
    ]
    db.add_all(cars)
    db.flush()

    customer_specs = [
        ("Ahmed Raza", "0300-1112233", "North Nazimabad, Karachi", -60),
        ("Bilal Hussain", "0321-4455667", "Gulshan-e-Iqbal, Karachi", -55),
        ("Usman Ghani", "0333-7788990", "Defence, Karachi", -50),
        ("Imran Sheikh", "0345-2233445", "Malir, Karachi", -45),
        ("Faisal Mehmood", "0301-9988776", "PECHS, Karachi", -40),
        ("Hassan Ali", "0312-3344556", "Saddar, Karachi", -35),
        ("Zainab Tariq", "0322-6677889", "Clifton, Karachi", -30),
        ("Omar Farooq", "0331-1122334", "Korangi, Karachi", -25),
        ("Sana Malik", "0346-5566778", "Bahadurabad, Karachi", -20),
        ("Adil Khan", "0308-9900112", "Shadman Town, Karachi", -15),
    ]
    customers = [
        Customer(
            full_name=name + SAMPLE_SUFFIX,
            phone=phone,
            address=address,
            created_at=datetime.combine(_d(offset), datetime.min.time(), tzinfo=TZ),
        )
        for name, phone, address, offset in customer_specs
    ]
    db.add_all(customers)
    db.flush()

    year = today_local().year
    booking_specs = [
        (0, 0, _dt(0, "09:00"), _dt(0, "21:00"), "with_driver", 1, "days", 30000, 30000, 15000, 15000, "half_now_half_later", "active", "Wedding guest pickup — airport run"),
        (1, 1, _dt(-1, "10:00"), _dt(0, "18:00"), "self_drive", 2, "days", 15000, 30000, 10000, 30000, "full_cash", "active", "Northern areas trip"),
        (2, 2, _dt(1, "08:00"), _dt(3, "20:00"), "with_driver", 2, "days", 25000, 50000, 25000, 25000, "half_cash_half_bank", "upcoming", "Family function — 2 days"),
        (4, 5, _dt(3, "10:00"), _dt(4, "22:00"), "self_drive", 1, "days", 8000, 8000, 4000, 4000, "half_now_half_later", "upcoming", None),
        (7, 6, _dt(5, "07:00"), _dt(8, "21:00"), "with_driver", 3, "days", 18000, 54000, 0, 0, "full_cash", "upcoming", "Group picnic — 13 people"),
        (5, 3, _dt(-4, "09:00"), _dt(-2, "21:00"), "self_drive", 2, "days", 8000, 16000, 0, 16000, "full_cash", "completed", None),
        (3, 4, _dt(-6, "08:00"), _dt(-5, "20:00"), "with_driver", 1, "days", 28000, 28000, 14000, 28000, "half_cash_half_bank", "completed", None),
        (8, 7, _dt(-9, "10:00"), _dt(-6, "20:00"), "self_drive", 3, "days", 4000, 12000, 0, 12000, "full_cash", "completed", None),
        (6, 8, _dt(-10, "09:00"), _dt(-8, "21:00"), "with_driver", 2, "days", 14000, 28000, 10000, 20000, "half_now_half_later", "completed", "Balance still pending"),
        (4, 9, _dt(2, "09:00"), _dt(3, "21:00"), "self_drive", 1, "days", 8000, 8000, 0, 0, "full_cash", "cancelled", "Customer cancelled — plan changed"),
        (0, 0, _dt(-14, "08:00"), _dt(-12, "20:00"), "with_driver", 2, "days", 30000, 60000, 30000, 60000, "full_bank", "completed", None),
        (1, 1, _dt(-17, "10:00"), _dt(-16, "22:00"), "self_drive", 1, "days", 15000, 15000, 0, 15000, "full_cash", "completed", None),
    ]

    bookings: list[Booking] = []
    for index, spec in enumerate(booking_specs, start=1):
        (car_idx, cust_idx, pickup, return_at, driver, duration, unit, rate, total, advance, paid, plan, status, notes) = spec
        car = cars[car_idx]
        customer = customers[cust_idx]
        total_dec = money(total)
        paid_dec = money(paid)
        balance = total_dec - paid_dec
        payment_status = "paid" if balance == 0 else ("partial" if paid_dec > 0 else "unpaid")
        booking = Booking(
            booking_code=f"HK-{year}-{index:04d}",
            customer_id=customer.id,
            customer_name=customer.full_name,
            customer_phone=customer.phone,
            car_id=car.id,
            car_name=car.name,
            pickup_datetime=pickup,
            return_datetime=return_at,
            driver_option=driver,
            duration_value=duration,
            duration_unit=unit,
            rate_per_unit=money(rate),
            total_amount=total_dec,
            advance_amount=money(advance),
            amount_paid=paid_dec,
            balance_amount=balance,
            payment_plan=plan,
            payment_status=payment_status,
            status=status,
            notes=notes,
        )
        bookings.append(booking)
    db.add_all(bookings)
    db.flush()

    payment_specs = [
        (0, 15000, 15000, 0, "cash", 0, None, "Advance — half now"),
        (1, 10000, 10000, 0, "cash", -2, None, "Advance"),
        (1, 20000, 20000, 0, "cash", 0, None, "Remaining on return"),
        (2, 25000, 12500, 12500, "split", -1, "TRX-8812", "Half cash + half bank"),
        (3, 4000, 0, 4000, "bank", -1, "TRX-7740", "Advance by bank"),
        (5, 8000, 8000, 0, "cash", -4, None, "Advance"),
        (5, 8000, 0, 8000, "bank", -2, "TRX-6601", "Remaining by bank"),
        (6, 28000, 14000, 14000, "split", -6, "TRX-5523", "Half cash + half bank"),
        (7, 12000, 12000, 0, "cash", -9, None, "Full cash"),
        (8, 12000, 12000, 0, "cash", -10, None, "Advance"),
        (8, 8000, 0, 8000, "bank", -8, "TRX-4190", "Second instalment"),
        (10, 30000, 30000, 0, "cash", -14, None, "Advance"),
        (10, 30000, 0, 30000, "bank", -12, "TRX-3088", "Remaining by bank"),
        (11, 15000, 15000, 0, "cash", -17, None, "Full cash"),
    ]
    payments: list[Payment] = []
    for booking_idx, amount, cash, bank, method, offset, reference, notes in payment_specs:
        booking = bookings[booking_idx]
        payments.append(
            Payment(
                booking_id=booking.id,
                booking_code=booking.booking_code,
                sale_id=None,
                customer_name=booking.customer_name,
                amount=money(amount),
                cash_amount=money(cash),
                bank_amount=money(bank),
                method=method,
                payment_date=datetime.combine(_d(offset), datetime.min.time(), tzinfo=TZ),
                reference=reference,
                notes=notes,
            )
        )

    sale_specs = [
        ("sale", "Toyota Corolla 2018", "1.8 Grande, 62,000 km", "Usman Ghani", "0333-7788990", 2850000, 2850000, "cash", -20, "Sold via 2 Rist Transport"),
        ("purchase", "Toyota Fortuner 2021", "Sigma 4, 48,000 km", "Karachi Motors", "0300-5556677", 11500000, 11500000, "bank", -35, "Added to rental fleet as Fortuner Sigma 4"),
        ("sale", "Suzuki Mehran 2017", "VXR, 88,000 km", "Imran Sheikh", "0345-2233445", 950000, 600000, "cash", -10, "Balance due in 2 weeks"),
        ("purchase", "Honda Civic 2020", "1.8 Oriel, 55,000 km", "Auto Deals", "0321-9988776", 4200000, 4200000, "bank", -50, "Added to rental fleet as Honda Civic"),
        ("sale", "Toyota Hilux 2019", "Revo 4x4, 71,000 km", "Faisal Mehmood", "0301-9988776", 6800000, 6800000, "split", -5, "Half cash + half bank — sold via 2 Rist Transport"),
        ("purchase", "Suzuki Alto 2022", "VXL AGS, 21,000 km", "City Cars", "0333-1122445", 1950000, 1000000, "bank", -2, "Balance on delivery of documents"),
    ]

    for record_type, car_name, car_details, party, phone, price, paid, method, offset, notes in sale_specs:
        price_dec = money(price)
        paid_dec = money(paid)
        balance = price_dec - paid_dec
        record = SaleRecord(
            type=record_type,
            car_name=car_name,
            car_details=car_details,
            party_name=party + SAMPLE_SUFFIX,
            party_phone=phone,
            price=price_dec,
            amount_paid=paid_dec,
            balance_amount=balance,
            payment_method=method,
            record_date=datetime.combine(_d(offset), datetime.min.time(), tzinfo=TZ),
            status="completed" if balance == 0 else "pending",
            notes=notes,
        )
        db.add(record)
        db.flush()
        if paid_dec > 0:
            if method == "bank":
                cash_amt, bank_amt = money(0), paid_dec
            elif method == "split":
                cash_amt = (paid_dec / 2).quantize(money(0))
                bank_amt = paid_dec - cash_amt
            else:
                cash_amt, bank_amt = paid_dec, money(0)
            payments.append(
                Payment(
                    booking_id=None,
                    booking_code=None,
                    sale_id=record.id,
                    customer_name=record.party_name,
                    amount=paid_dec,
                    cash_amount=cash_amt,
                    bank_amount=bank_amt,
                    method=method,
                    payment_date=record.record_date,
                    reference=None,
                    notes=f"{'Sale' if record_type == 'sale' else 'Purchase'} — {car_name}",
                )
            )

    db.add_all(payments)
    db.flush()
    return True
