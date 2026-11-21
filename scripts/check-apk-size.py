import argparse
from collections import defaultdict
from hashlib import sha256
from pathlib import Path
from zipfile import BadZipFile, ZIP_DEFLATED, ZipFile

APP_BUDGET = 28_000_000
PORTRAIT_BUDGET = 800_000
PORTRAIT_DIRECTORY = (
    Path(__file__).resolve().parents[1]
    / "modules/anki-activity/android/src/main/res/drawable-nodpi"
)


def is_lossless_webp(data):
    if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        return False
    if int.from_bytes(data[4:8], "little") + 8 != len(data):
        return False

    offset = 12
    images = []
    while offset + 8 <= len(data):
        chunk = data[offset:offset + 4]
        length = int.from_bytes(data[offset + 4:offset + 8], "little")
        offset += 8 + length + (length % 2)
        if chunk in (b"VP8 ", b"VP8L", b"ANIM", b"ANMF"):
            images.append(chunk)
    return offset == len(data) and images == [b"VP8L"]


def check_portraits():
    portraits = {}
    names_by_digest = {}
    for path in sorted(PORTRAIT_DIRECTORY.iterdir()):
        if not path.stem.endswith(("_waiting", "_happy")):
            continue
        size = path.stat().st_size
        if size > PORTRAIT_BUDGET:
            raise ValueError(f"{path.name} is {size:,} bytes. The portrait budget is {PORTRAIT_BUDGET:,} bytes.")
        data = path.read_bytes()
        if path.suffix != ".webp" or not is_lossless_webp(data):
            raise ValueError(f"{path.name} must be a lossless WebP portrait.")
        digest = sha256(data).digest()
        if digest in names_by_digest:
            raise ValueError(f"{path.name} duplicates {names_by_digest[digest]}. Reuse the same drawable.")
        names_by_digest[digest] = path.name
        portraits[path.name] = (size, digest)

    if not portraits:
        raise ValueError("No character portraits found.")
    print(f"{len(portraits)} lossless portraits checked ({sum(size for size, _ in portraits.values()):,} bytes).")
    return portraits


def check_apk(path, portraits):
    with ZipFile(path) as apk:
        libraries = [entry for entry in apk.infolist() if entry.filename.startswith("lib/") and entry.filename.endswith(".so")]
        if not libraries or any(entry.compress_type != ZIP_DEFLATED for entry in libraries):
            raise ValueError("The APK must include compressed native libraries.")
        if apk.getinfo("assets/index.android.bundle").compress_type != ZIP_DEFLATED:
            raise ValueError("The APK must include a compressed JavaScript bundle.")

        portrait_sizes = {size for size, _ in portraits.values()}
        candidates = defaultdict(list)
        for entry in apk.infolist():
            if entry.file_size in portrait_sizes:
                candidates[sha256(apk.read(entry)).digest()].append(entry)

        portrait_bytes = 0
        for name, (_, digest) in portraits.items():
            matches = candidates[digest]
            if len(matches) != 1 or not matches[0].filename.startswith("res/"):
                raise ValueError(f"{name} must be bundled once as an Android resource. Found {len(matches)} copies.")
            portrait_bytes += matches[0].compress_size

    size = path.stat().st_size
    base = size - portrait_bytes
    if base > APP_BUDGET:
        raise ValueError(f"The APK without portraits is {base:,} bytes. The app budget is {APP_BUDGET:,} bytes.")
    print(f"APK {size:,} bytes. App {base:,} of {APP_BUDGET:,} bytes. Portraits {portrait_bytes:,} bytes.")


def main():
    parser = argparse.ArgumentParser(description="Verify lossless portraits and an optional signed release APK.")
    parser.add_argument("apk", nargs="?", type=Path)
    args = parser.parse_args()
    try:
        portraits = check_portraits()
        if args.apk is not None:
            check_apk(args.apk, portraits)
    except (BadZipFile, KeyError, OSError, ValueError) as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
