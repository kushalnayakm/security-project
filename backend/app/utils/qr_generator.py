"""QR code image generation utility using qrcode[pil]."""
import base64
import io

import qrcode
from qrcode.image.pil import PilImage


def generate_qr_image(url: str) -> str:
    """Generate a QR code PNG for the given URL and return a base64 data URI.

    Args:
        url: The URL to encode in the QR code.

    Returns:
        A string like "data:image/png;base64,iVBOR..." ready for use in <img src="">.
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)

    img: PilImage = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    b64 = base64.b64encode(buffer.read()).decode("utf-8")
    return f"data:image/png;base64,{b64}"
