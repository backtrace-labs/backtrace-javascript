#!/usr/bin/env python3
"""Asserts a minidump carries the per-run marker annotation, key and value."""
import os
import re
import struct
import sys

EXPECTED_KEY = "ci.marker"
KNOWN_KEYS = (
    "application",
    "application.version",
    "backtrace.agent",
    "backtrace.version",
    "device.model",
    "error.type",
    "guid",
    "uname.sysname",
)


def length_prefixed(data, decoder, width):
    """Crashpad writes annotations as uint32 byte-length followed by the string."""
    out = set()
    for match in re.finditer(rb"(?=(....))", data, re.S):
        (declared,) = struct.unpack("<I", match.group(1))
        if not 1 <= declared <= 512 or declared % width:
            continue
        start = match.start() + 4
        raw = data[start : start + declared]
        if len(raw) < declared:
            continue
        try:
            text = raw.decode(decoder)
        except UnicodeDecodeError:
            continue
        if text.isprintable():
            out.add(text)
    return out


def main():
    path = sys.argv[1]
    expected = os.environ["MARKER"]
    data = open(path, "rb").read()

    if data[:4] != b"MDMP":
        print(f"::error::{path} is not a minidump (magic {data[:4]!r}, {len(data)} bytes)")
        return 1

    strings = length_prefixed(data, "ascii", 1) | length_prefixed(data, "utf-16-le", 2)
    keys = sorted(k for k in KNOWN_KEYS if k in strings)

    print(f"minidump ok: {len(data)} bytes, {len(strings)} length-prefixed strings")
    print(f"annotation keys found: {', '.join(keys) if keys else '<none>'}")

    checks = (
        (f"post-init key {EXPECTED_KEY}", EXPECTED_KEY in strings),
        (f"post-init value {expected}", expected in strings),
        # Set at init through userAttributes in the example, so it asserts init-time propagation.
        ("init-time key custom-attribute", "custom-attribute" in strings),
    )
    missing = [what for what, present in checks if not present]
    if not missing:
        print(f"minidump carries the init-time and post-init attributes ({EXPECTED_KEY}={expected})")
        return 0

    print(f"::error::minidump is missing: {', '.join(missing)}")
    if not keys:
        print("::error::no known annotation keys either, so the dump carries no attributes at all")
    return 1


if __name__ == "__main__":
    sys.exit(main())
