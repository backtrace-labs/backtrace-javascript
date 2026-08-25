#!/usr/bin/env bash
# Fails when an ABI is missing from the APK, or its library lacks the JNI entry points.
set -euo pipefail

APK="${1:?usage: $0 <apk>}"
ABIS=${ABIS:-"arm64-v8a armeabi-v7a x86 x86_64"}
SYMBOLS_BOUND_AT_RUNTIME="Java_backtraceio_library_nativeCalls_BacktraceCrashHandler_initializeJavaCrashHandler Java_backtraceio_library_nativeCalls_BacktraceCrashHandler_handleCrash Java_backtraceio_library_BacktraceDatabase_addAttribute Java_backtraceio_library_base_BacktraceBase_crash"
SYMBOLS_PROVING_LIBRARY_VERSION="Java_backtraceio_library_BacktraceDatabase_addAttachment"
SYMBOLS=${SYMBOLS:-"$SYMBOLS_BOUND_AT_RUNTIME $SYMBOLS_PROVING_LIBRARY_VERSION"}

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

status=0
for abi in $ABIS; do
    lib="lib/$abi/libbacktrace-native.so"
    if ! unzip -o -q "$APK" "$lib" -d "$WORK" 2>/dev/null; then
        echo "::error::$abi: libbacktrace-native.so missing from the APK"
        status=1
        continue
    fi

    # Extract once: piping into `grep -q` under pipefail fails on SIGPIPE.
    strings -a "$WORK/$lib" > "$WORK/$abi.strings"

    missing=0
    for symbol in $SYMBOLS; do
        if ! grep -qF "$symbol" "$WORK/$abi.strings"; then
            echo "::error::$abi: missing JNI symbol $symbol"
            missing=1
            status=1
        fi
    done

    if [ "$missing" -eq 0 ]; then
        echo "$abi ok ($(wc -c < "$WORK/$lib") bytes)"
    fi
done

exit $status
