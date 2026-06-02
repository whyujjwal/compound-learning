from __future__ import annotations

from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.models.user import User

DEFAULT_TIMEZONE = "UTC"


def utc_now() -> datetime:
    return datetime.now(UTC)


def resolve_timezone_name(timezone_name: str | None = None, user: User | None = None) -> str:
    candidate = timezone_name or getattr(user, "timezone", None) or DEFAULT_TIMEZONE
    try:
        ZoneInfo(candidate)
        return candidate
    except (ZoneInfoNotFoundError, ValueError):
        return DEFAULT_TIMEZONE


def zoneinfo(timezone_name: str | None = None, user: User | None = None) -> ZoneInfo:
    return ZoneInfo(resolve_timezone_name(timezone_name, user))


def local_now(
    timezone_name: str | None = None,
    user: User | None = None,
    now: datetime | None = None,
) -> datetime:
    current = now or utc_now()
    return current.astimezone(zoneinfo(timezone_name, user))


def local_today(
    timezone_name: str | None = None,
    user: User | None = None,
    now: datetime | None = None,
) -> date:
    return local_now(timezone_name, user, now).date()


def local_weekday(
    timezone_name: str | None = None,
    user: User | None = None,
    now: datetime | None = None,
) -> int:
    return local_today(timezone_name, user, now).weekday()


def local_day_bounds(
    day: date | None = None,
    timezone_name: str | None = None,
    user: User | None = None,
) -> tuple[datetime, datetime]:
    zone = zoneinfo(timezone_name, user)
    local_day = day or utc_now().astimezone(zone).date()
    start = datetime.combine(local_day, time.min, tzinfo=zone)
    end = datetime.combine(local_day + timedelta(days=1), time.min, tzinfo=zone)
    return start.astimezone(UTC), end.astimezone(UTC)


def local_date_for(
    dt: datetime,
    timezone_name: str | None = None,
    user: User | None = None,
) -> date:
    aware = dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt.astimezone(UTC)
    return aware.astimezone(zoneinfo(timezone_name, user)).date()
