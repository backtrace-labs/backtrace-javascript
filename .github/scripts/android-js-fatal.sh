#!/usr/bin/env bash
# Asserts a fatal JS error produces one report, no duplicate from the rethrown JavascriptException, and no 5 s wait.
set -euo pipefail

PACKAGE="com.reactnative"
ACTIVITY="$PACKAGE/.MainActivity"
APK="examples/sdk/reactNative/android/app/build/outputs/apk/release/app-release.apk"
MARKER="ci-js-fatal-$(date +%s)"
TRIGGER_URL="backtrace-example://ci-js-fatal?marker=$MARKER"
LOGCAT_OUT="/tmp/js-fatal-logcat.txt"
FORWARD_BOUND_S=7
EXIT_BOUND_S=2

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

seconds_between() {
    python3 -c "print(round(float('$2') - float('$1'), 2))"
}

at_most() {
    python3 -c "import sys; sys.exit(0 if float('$1') <= float('$2') else 1)"
}

trap 'adb logcat -d -v epoch > "$LOGCAT_OUT" 2>/dev/null || true' EXIT

adb wait-for-device
adb uninstall "$PACKAGE" >/dev/null 2>&1 || true
adb install -r "$APK"
adb shell pm clear "$PACKAGE" >/dev/null
adb logcat -c

adb shell am start -n "$ACTIVITY" >/dev/null
wait_for_log "BT_CI_DRIVER_ARMED" 120
PID="$(adb shell pidof "$PACKAGE" | tr -d '\r')"

adb shell am start -n "$ACTIVITY" -a android.intent.action.VIEW -d "'$TRIGGER_URL'" >/dev/null
echo "fatal JS error fired: $MARKER, pid $PID"

for _ in $(seq 1 30); do
    if ! adb shell pidof "$PACKAGE" >/dev/null 2>&1; then
        break
    fi
    sleep 1
done
if adb shell pidof "$PACKAGE" >/dev/null 2>&1; then
    echo "::error::the app is still running 30 s after the fatal JS error"
    exit 1
fi
sleep 1
adb logcat -d -v epoch > "$LOGCAT_OUT"

FIRED_AT="$(awk '/BT_CI_DRIVER firing: backtrace-example:\/\/ci-js-fatal/ { print $1; exit }' "$LOGCAT_OUT")"
RETHROWN_AT="$(awk -v pid="$PID" '$2 == pid && /AndroidRuntime: FATAL EXCEPTION/ { print $1; exit }' "$LOGCAT_OUT")"
DIED_AT="$(grep -F "Process $PACKAGE (pid $PID) has died" "$LOGCAT_OUT" | head -1 | awk '{ print $1 }' || true)"
if [ -z "$FIRED_AT" ] || [ -z "$RETHROWN_AT" ] || [ -z "$DIED_AT" ]; then
    echo "::error::missing log lines: fired '$FIRED_AT', rethrown '$RETHROWN_AT', died '$DIED_AT'"
    grep -E "BT_CI|AndroidRuntime|has died" "$LOGCAT_OUT" | tail -30
    exit 1
fi

FORWARD_S="$(seconds_between "$FIRED_AT" "$RETHROWN_AT")"
EXIT_S="$(seconds_between "$RETHROWN_AT" "$DIED_AT")"
echo "React Native rethrew ${FORWARD_S}s after the fatal JS error, the process died ${EXIT_S}s later"
if ! at_most "$FORWARD_S" "$FORWARD_BOUND_S"; then
    echo "::error::the JS handler held the fatal error ${FORWARD_S}s, expected at most ${FORWARD_BOUND_S}s"
    exit 1
fi
if ! at_most "$EXIT_S" "$EXIT_BOUND_S"; then
    echo "::error::the process died ${EXIT_S}s after the rethrow, expected at most ${EXIT_BOUND_S}s"
    exit 1
fi

RECORDS="$(awk -v since="$FIRED_AT" '$1 >= since && /BT_CI_RECORD/ { sub(/.*BT_CI_RECORD /, ""); print }' "$LOGCAT_OUT")"
COUNT="$(printf '%s\n' "$RECORDS" | grep -c . || true)"
echo "reports stored: $COUNT"
printf '%s\n' "$RECORDS"
if [ "$COUNT" != "1" ]; then
    echo "::error::expected exactly one stored report, found $COUNT"
    exit 1
fi
if ! printf '%s\n' "$RECORDS" | grep -qF "Error \"BT_CI_JS_FATAL $MARKER\""; then
    echo "::error::the stored report is not the fatal JS error"
    exit 1
fi
echo "one report with the JS error, no JavascriptException duplicate, process died ${EXIT_S}s after the rethrow"
