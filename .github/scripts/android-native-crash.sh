#!/usr/bin/env bash
# Asserts a native crash produces a minidump carrying an attribute set after init.
set -euo pipefail

PACKAGE="com.reactnative"
ACTIVITY="$PACKAGE/.MainActivity"
APK="examples/sdk/reactNative/android/app/build/outputs/apk/release/app-release.apk"
MARKER="ci-marker-$(date +%s)"
TRIGGER_URL="backtrace-example://ci-native-crash?marker=$MARKER"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

wait_for_log() {
    local pattern="$1" deadline="$2"
    for _ in $(seq 1 "$deadline"); do
        if adb logcat -d | grep -qE "$pattern"; then
            return 0
        fi
        sleep 1
    done

    echo "::error::timed out after ${deadline}s waiting for: $pattern"
    adb logcat -d | tail -50
    return 1
}

adb wait-for-device
adb install -r "$APK"
adb shell pm clear "$PACKAGE" >/dev/null
adb logcat -c

echo "device abis: $(adb shell getprop ro.product.cpu.abilist | tr -d '\r')"
adb shell am start -n "$ACTIVITY" >/dev/null
echo "app abi:$(adb shell dumpsys package "$PACKAGE" | grep -m1 primaryCpuAbi | tr -d '\r' | cut -d= -f2)"

wait_for_log "Initializing native crash reporter" 120
wait_for_log "BT_CI_DRIVER_ARMED" 60

# Inner quotes survive to the device shell, which would otherwise glob the ? in the URL.
adb shell am start -n "$ACTIVITY" -a android.intent.action.VIEW -d "'$TRIGGER_URL'" >/dev/null
echo "marker set after init: ci.marker=$MARKER"

DUMP=""
PULLED=""
# The uploader can move a dump out of pending/ between finding and reading it, so re-find on every try.
# exec-out, not shell: a pty mangles binary and would corrupt the minidump.
for _ in $(seq 1 180); do
    DUMP="$(adb shell run-as "$PACKAGE" find files/backtrace/native -name '*.dmp' 2>/dev/null | tr -d '\r' | head -1 || true)"
    if [ -n "$DUMP" ] && adb exec-out run-as "$PACKAGE" cat "$DUMP" > /tmp/native-crash.dmp 2>/dev/null; then
        ON_DEVICE_SIZE="$(adb shell run-as "$PACKAGE" stat -c %s "$DUMP" 2>/dev/null | tr -d '\r' || true)"
        PULLED_SIZE="$(wc -c < /tmp/native-crash.dmp | tr -d ' ')"
        if [ -n "$ON_DEVICE_SIZE" ] && [ "$ON_DEVICE_SIZE" = "$PULLED_SIZE" ]; then
            PULLED=1
            break
        fi
    fi
    sleep 1
done

if [ -z "$PULLED" ]; then
    if [ -z "$DUMP" ]; then
        echo "::error::no minidump was written"
        if adb shell pidof "$PACKAGE" >/dev/null 2>&1; then
            echo "::error::the app is still running, so the crash never fired"
        fi
        adb shell run-as "$PACKAGE" ls -R files/backtrace 2>&1 || true
        adb logcat -d | grep -iE "backtrace|crashpad|SIGSEGV|BT_CI_DRIVER" | tail -30
    else
        echo "::error::could not pull a stable copy of $DUMP"
    fi
    exit 1
fi
echo "minidump: $DUMP"
echo "minidump pulled: $PULLED_SIZE bytes"

adb logcat -d > /tmp/logcat.txt

MARKER="$MARKER" python3 "$HERE/check-minidump-annotations.py" /tmp/native-crash.dmp
