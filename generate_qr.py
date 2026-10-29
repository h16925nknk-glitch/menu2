import sys
from pathlib import Path

try:
    import qrcode
except ImportError:
    raise SystemExit("Install the QR library first: pip install qrcode[pil]")

url = sys.argv[1] if len(sys.argv) > 1 else input("Published menu URL: ").strip()
if not url.startswith(("http://", "https://")):
    raise SystemExit("Please enter a complete URL beginning with https://")

output = Path(__file__).with_name("menu-qr-code.png")
qr = qrcode.QRCode(version=None, box_size=12, border=4)
qr.add_data(url)
qr.make(fit=True)
image = qr.make_image(fill_color="black", back_color="white")
image.save(output)
print(f"Created: {output}")
