"""
Compatibility exports for OTP-related schemas.
"""
from app.schemas.user_schema import OTPStartRequest, OTPStartResponse, OTPVerifyRequest

__all__ = ["OTPStartRequest", "OTPStartResponse", "OTPVerifyRequest"]
