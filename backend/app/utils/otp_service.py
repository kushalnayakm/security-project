import json
import logging
import random
from datetime import datetime, timedelta
from typing import Dict, Optional

from app.core.config import get_settings


logger = logging.getLogger(__name__)

# In-memory OTP storage: {key: {"otp": str, "attempts": int, "expires_at": datetime}}
_otp_store: Dict[str, dict] = {}


class OTPService:
    """Service for managing OTP generation and verification using in-memory storage."""

    def __init__(self):
        self.settings = get_settings()

    async def generate_otp(self) -> str:
        """Generate a 6-digit OTP."""
        return "".join(str(random.randint(0, 9)) for _ in range(6))

    async def store_otp(self, gst_no: str, phone: str, otp: str) -> bool:
        """Store OTP in memory with TTL and max attempts."""
        key = f"otp:{gst_no}:{phone}"
        try:
            expires_at = datetime.utcnow() + timedelta(seconds=self.settings.otp_expiry_seconds)
            data = {
                "otp": otp,
                "attempts": 0,
                "expires_at": expires_at.isoformat(),
            }
            _otp_store[key] = data
            # Internal audit — full banner is logged by the calling service
            logger.info(f"OTP stored for GST {gst_no}, expires at {expires_at.isoformat()} UTC")
            return True
        except Exception as e:
            logger.exception(f"Failed to store OTP: {e}")
            return False

    async def verify_otp(self, gst_no: str, phone: str, otp: str) -> bool:
        """Verify OTP and check attempt count."""
        key = f"otp:{gst_no}:{phone}"
        try:
            if key not in _otp_store:
                logger.warning(f"OTP expired or not found for {gst_no}:{phone}")
                return False

            data = _otp_store[key]
            
            # Check expiration
            expires_at = datetime.fromisoformat(data["expires_at"])
            if datetime.utcnow() > expires_at:
                del _otp_store[key]
                logger.warning(f"OTP expired for {gst_no}:{phone}")
                return False

            attempts = data.get("attempts", 0)

            # Check max attempts
            if attempts >= 5:
                logger.warning(f"Max OTP attempts exceeded for {gst_no}:{phone}")
                return False

            # Verify OTP
            if data.get("otp") != otp:
                # Increment attempt count
                data["attempts"] = attempts + 1
                logger.warning(f"Invalid OTP attempt {data['attempts']} for {gst_no}:{phone}")
                return False

            # OTP is valid, delete it
            del _otp_store[key]
            logger.info(f"OTP verified successfully for {gst_no}:{phone}")
            return True

        except Exception as e:
            logger.exception(f"Error verifying OTP: {e}")
            return False

    def mask_phone(self, phone: str) -> str:
        """Mask phone number, showing only first 2 and last 2 digits."""
        if len(phone) < 4:
            return "*" * len(phone)
        return phone[:2] + "*" * (len(phone) - 4) + phone[-2:]


# Singleton instance
otp_service = OTPService()

