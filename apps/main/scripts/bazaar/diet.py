"""Bazaar art diet: cap street heights, quantize noisy files, keep clean ones lossless.

Needs Pillow. Run through `pnpm cli bazaar:diet`, which chains oxipng after.
"""

import io
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parents[2] / "public/images/bazaar"
STREET_MAX_HEIGHT = 1000
MAX_COLORS = 256
ERR_FLAG_THRESHOLD = 6.0
TOP_MOVERS = 12


def cap_height(rel: Path, image: Image.Image) -> Image.Image:
    is_street = rel.parts[0] == "street"
    if not is_street or image.height <= STREET_MAX_HEIGHT:
        return image
    width = round(image.width * STREET_MAX_HEIGHT / image.height)
    return image.resize((width, STREET_MAX_HEIGHT), Image.Resampling.NEAREST)


def fits_palette(image: Image.Image) -> bool:
    return image.convert("RGBA").getcolors(MAX_COLORS) is not None


def mean_error(a: Image.Image, b: Image.Image) -> float:
    diff = ImageChops.difference(a.convert("RGBA"), b.convert("RGBA"))
    return sum(ImageStat.Stat(diff).mean) / 4


def encode(image: Image.Image) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    return buffer.getvalue()


def diet(path: Path) -> dict:
    rel = path.relative_to(ROOT)
    source_bytes = path.stat().st_size
    image = Image.open(path)
    image.load()
    resized = cap_height(rel, image)
    was_resized = resized is not image

    if fits_palette(resized):
        if not was_resized:
            return {"file": rel, "before": source_bytes, "after": source_bytes, "err": None}
        packed = encode(resized)
        path.write_bytes(packed)
        return {"file": rel, "before": source_bytes, "after": len(packed), "err": None}

    quantized = resized.quantize(
        MAX_COLORS, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE
    )
    packed = encode(quantized)
    keep = was_resized or len(packed) < source_bytes
    if keep:
        path.write_bytes(packed)
    return {
        "file": rel,
        "before": source_bytes,
        "after": len(packed) if keep else source_bytes,
        "err": mean_error(resized, quantized) if keep else None,
    }


def kb(size: int) -> str:
    return f"{round(size / 1024)}K"


def main() -> int:
    files = sorted(ROOT.rglob("*.png"))
    results = [diet(path) for path in files]

    movers = sorted(
        (r for r in results if r["after"] < r["before"]),
        key=lambda r: r["before"] - r["after"],
        reverse=True,
    )
    for r in movers[:TOP_MOVERS]:
        print(f"{r['file']}: {kb(r['before'])} -> {kb(r['after'])}")

    flagged = [r for r in results if r["err"] is not None and r["err"] > ERR_FLAG_THRESHOLD]
    for r in sorted(flagged, key=lambda r: -r["err"]):
        print(f"EYES: {r['file']} quantize err {r['err']:.1f}")

    before = sum(r["before"] for r in results)
    after = sum(r["after"] for r in results)
    print(f"{len(movers)}/{len(results)} files shrank")
    print(f"total: {kb(before)} -> {kb(after)} (-{round((1 - after / before) * 100)}%)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
