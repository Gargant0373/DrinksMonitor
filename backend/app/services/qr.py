"""
QR code generation service.
Returns a PNG as bytes.
"""

import qrcode
import io


def generate_qr_png(data: str) -> bytes:
    """Generate a QR code PNG from the given string and return raw bytes."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()
