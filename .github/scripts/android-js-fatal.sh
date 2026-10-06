#!/usr/bin/env bash
# Asserts a fatal JS error produces one report, no duplicate from the rethrown JavascriptException, and no 5 s wait.
set -euo pipefail

PACKAGE="com.reactnative"
ACTIVITY="$PACKAGE/.MainActivity"
APK="examples/sdk/reactNative/android/app/build/outputs/apk/release/app-release.apk"
MARKER="ci-js-fatal-$(date +%s)"
TRIGGER_URL="backtrace-example://ci-js-fatal?marker=$MARKER"
EXIT_BOUND_S=8

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

log_time() {
    adb logcat -d -v epoch | grep -E "$1" | head -1 | awk '{print $1}'
}

trap 'adb logcat -d > /tmp/js-fatal-logcat.txt 2>/dev/null || true' EXIT

adb wait-for-device
adb uninstall "$PACKAGE" >/dev/null 2>&1 || true
adb install -r "$APK"
adb shell pm clear "$PACKAGE" >/dev/null
adb logcat -c

adb shell am start -n "$ACTIVITY" >/dev/null
wait_for_log "BT_CI_DRIVER_ARMED" 120

adb shell am start -n "$ACTIVITY" -a android.intent.action.VIEW -d "'$TRIGGER_URL'" >/dev/null
echo "fatal JS error fired: $MARKER"

wait_for_log "FATAL EXCEPTION" 30
for _ in $(seq 1 30); do
    if ! adb shell pidof "$PACKAGE" >/dev/null 2>&1; then
        break
    fi
    sleep 1
done
adb logcat -d > /tmp/js-fatal-logcat.txt

if adb shell pidof "$PACKAGE" >/dev/null 2>&1; then
    echo "::error::the app is still running 30 s after the fatal JS error"
    exit 1
fi

FIRED_AT="$(log_time "BT_CI_DRIVER firing: backtrace-example://ci-js-fatal")"
DIED_AT="$(log_time "FATAL EXCEPTION")"
ELAPSED="$(python3 -c "print(round(float('$DIED_AT') - float('$FIRED_AT'), 1))")"
echo "process exit ${ELAPSED}s after the fatal JS error"
if python3 -c "import sys; sys.exit(0 if float('$ELAPSED') <= $EXIT_BOUND_S else 1)"; then :; else
    echo "::error::the process exited ${ELAPSED}s after the fatal, expected at most ${EXIT_BOUND_S}s"
    exit 1
fi

if ! grep -q "Skipping the JavascriptException of a fatal error already reported from JavaScript" /tmp/js-fatal-logcat.txt; then
    echo "::error::the Java handler did not skip the rethrown JavascriptException"
    grep -iE "backtrace|BT_CI|FATAL" /tmp/js-fatal-logcat.txt | tail -30
    exit 1
fi
if grep -q "Timed out waiting for the unhandled exception report" /tmp/js-fatal-logcat.txt; then
    echo "::error::the Java handler waited for a report that could never arrive"
    exit 1
fi

# The example's placeholder URL rejects the upload.
RECORDS="$(adb shell run-as "$PACKAGE" find files/backtrace -maxdepth 1 -name '*-record.json' 2>/dev/null | tr -d '\r' || true)"
COUNT="$(printf '%s\n' "$RECORDS" | grep -c . || true)"
echo "database records: $COUNT"
if [ "$COUNT" != "1" ]; then
    echo "::error::expected exactly one report record, found $COUNT"
    printf '%s\n' "$RECORDS"
    exit 1
fi
adb exec-out run-as "$PACKAGE" cat "$RECORDS" > /tmp/js-fatal-record.json

if ! grep -q "BT_CI_JS_FATAL $MARKER" /tmp/js-fatal-record.json; then
    echo "::error::the stored report is not the fatal JS error"
    head -c 2000 /tmp/js-fatal-record.json
    exit 1
fi
if grep -q "JavascriptException" /tmp/js-fatal-record.json; then
    echo "::error::the stored report is the rethrown JavascriptException, not the JS error"
    exit 1
fi
echo "one report with the JS error, no JavascriptException duplicate, exit after ${ELAPSED}s"
