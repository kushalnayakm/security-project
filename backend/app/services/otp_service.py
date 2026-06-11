"""
OTP Service — v1 in-memory implementation.

WARNING: This is a simulation layer for development and testing.
         In-memory storage is NOT suitable for production:

TODO (v2): Replace OTPStore with Redis (use aioredis + TTL keys).
TODO (v2): Replace _send_sms_placeholder with Twilio / AWS SNS / MSG91.
TODO (v2): Add rate limiting (max 3 OTPs per phone per 15 min).
TODO (v2): Add HMAC-based TOTP so the OTP is never stored server-side.
"""
import random
import string
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from threading import Lock

from app.core.config import settings


# ------------------------------------------------------------------ #
# In-memory OTP store                                                  #
# ------------------------------------------------------------------ #
@dataclass
class OTPRecord:
    otp: str
    expires_at: datetime
    attempts: int = 0
    MAX_ATTEMPTS: int = 5  # lock out after 5 wrong guesses


class OTPStore:
    """Thread-safe in-memory dict: phone_key → OTPRecord."""

    def __init__(self) -> None:
        self._store: dict[str, OTPRecord] = {}
        self._lock = Lock()

    @staticmethod
    def _key(country_code: str, phone: str) -> str:
        return f"{country_code}{phone}"

    def save(self, country_code: str, phone: str, otp: str) -> OTPRecord:
        key = self._key(country_code, phone)
        record = OTPRecord(
            otp=otp,
            expires_at=datetime.now(timezone.utc)
            + timedelta(minutes=settings.otp_expire_minutes),
        )
        with self._lock:
            self._store[key] = record
        return record

    def get(self, country_code: str, phone: str) -> OTPRecord | None:
        key = self._key(country_code, phone)
        with self._lock:
            return self._store.get(key)

    def delete(self, country_code: str, phone: str) -> None:
        key = self._key(country_code, phone)
        with self._lock:
            self._store.pop(key, None)

    def increment_attempts(self, country_code: str, phone: str) -> int:
        key = self._key(country_code, phone)
        with self._lock:
            record = self._store.get(key)
            if record:
                record.attempts += 1
                return record.attempts
        return 0


# Singleton store used by the FastAPI app
otp_store = OTPStore()


# ------------------------------------------------------------------ #
# OTP generation                                                       #
# ------------------------------------------------------------------ #
def generate_otp(length: int | None = None) -> str:
    """Return a zero-padded numeric OTP string."""
    n = length or settings.otp_length
    return "".join(random.choices(string.digits, k=n))


# ------------------------------------------------------------------ #
# SMS placeholder                                                      #
# ------------------------------------------------------------------ #
def _send_sms_placeholder(country_code: str, phone: str, otp: str) -> None:
    """
    TODO (v2): Integrate a real SMS gateway here.

    Example integrations:
        - Twilio:  client.messages.create(to=f"{country_code}{phone}", body=f"OTP: {otp}")
        - AWS SNS: sns.publish(PhoneNumber=f"{country_code}{phone}", Message=f"OTP: {otp}")
        - MSG91:   POST https://api.msg91.com/api/v5/otp
    """
    print(
        f"[SMS SIMULATION] Sending OTP {otp!r} to {country_code}{phone} "
        "(not actually sent — replace with real SMS gateway)"
    )


# ------------------------------------------------------------------ #
# Public service functions                                             #
# ------------------------------------------------------------------ #
def create_and_store_otp(country_code: str, phone: str) -> tuple[str, int]:
    """
    Generate an OTP, persist it in the store, trigger (simulated) SMS.

    Returns:
        (otp_code, expires_in_seconds)
    """
    otp = generate_otp()
    otp_store.save(country_code, phone, otp)
    _send_sms_placeholder(country_code, phone, otp)
    return otp, settings.otp_expire_minutes * 60


class OTPVerificationError(Exception):
    """Raised when OTP verification fails."""


def verify_otp(country_code: str, phone: str, submitted_otp: str) -> bool:
    """
    Validate the submitted OTP against the stored record.

    Returns:
        True if valid.

    Raises:
        OTPVerificationError with a descriptive message on failure.
    """
    record = otp_store.get(country_code, phone)

    if record is None:
        raise OTPVerificationError("No OTP found for this number. Please request a new one.")

    if datetime.now(timezone.utc) > record.expires_at:
        otp_store.delete(country_code, phone)
        raise OTPVerificationError("OTP has expired. Please request a new one.")

    if record.attempts >= record.MAX_ATTEMPTS:
        otp_store.delete(country_code, phone)
        raise OTPVerificationError(
            "Too many incorrect attempts. Please request a new OTP."
        )

    if record.otp != submitted_otp.strip():
        otp_store.increment_attempts(country_code, phone)
        remaining = record.MAX_ATTEMPTS - record.attempts
        raise OTPVerificationError(
            f"Incorrect OTP. {remaining} attempt(s) remaining."
        )

    # Success — consume the OTP so it cannot be reused
    otp_store.delete(country_code, phone)
    return True
