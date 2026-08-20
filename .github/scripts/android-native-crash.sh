#!/usr/bin/env bash
# Asserts a native crash produces a minidump carrying an attribute set after init.
set -euo pipefail

PACKAGE="com.reactnative"
ACTIVITY="$PACKAGE/.MainActivity"
APK="examples/sdk/reactNative/android/app/build/outputs/apk/release/app-release.apk"

tap_by_label() {
    local label="$1"
    adb shell uiautomator dump /sdcard/ui.xml >/dev/null

    # `|| true` so a missing button reports the labels it found instead of failing bare.
    local bounds
    bounds="$(adb shell cat /sdcard/ui.xml \
        | tr '>' '\n' \
        | grep "content-desc=\"$label\"" \
        | grep -oE 'bounds="\[[0-9]+,[0-9]+\]\[[0-9]+,[0-9]+\]"' \
        | head -1 \
        | grep -oE '[0-9]+' \
        | tr '\n' ' ' || true)"

    if [ -z "$bounds" ]; then
        echo "::error::could not find the '$label' button"
        echo "labels present on screen:"
        adb shell cat /sdcard/ui.xml | tr '>' '\n' | grep -oE 'content-desc="[^"]+"' | sort -u || true
        return 1
    fi

    # shellcheck disable=SC2086
    set -- $bounds
    adb shell input tap $(((${1} + ${3}) / 2)) $(((${2} + ${4}) / 2))
}

adb wait-for-device
adb install -r "$APK"

adb shell pm clear "$PACKAGE" >/dev/null
adb logcat -c
adb shell am start -n "$ACTIVITY" >/dev/null
sleep 15

if ! adb logcat -d | grep -q "Initializing native crash reporter"; then
    echo "::error::native crash reporter did not initialize"
    adb logcat -d | tail -50
    exit 1
fi

tap_by_label "Update a time attribute"
sleep 5

ATTRIBUTE="$(adb logcat -d | grep -oE "Setting a time attribute to [0-9]+" | tail -1 | grep -oE "[0-9]+" || true)"
if [ -z "$ATTRIBUTE" ]; then
    echo "::error::the app did not report setting a time attribute"
    adb logcat -d | grep -i reactnativejs | tail -20
    exit 1
fi
echo "attribute set after init: time=$ATTRIBUTE"

tap_by_label "Crash application"
sleep 15

if adb shell pidof "$PACKAGE" >/dev/null 2>&1; then
    echo "::error::app did not crash"
    exit 1
fi

DUMP="$(adb shell run-as "$PACKAGE" find files/backtrace/native -name '*.dmp' 2>/dev/null | tr -d '\r' | head -1)"
if [ -z "$DUMP" ]; then
    echo "::error::no minidump was written"
    adb shell run-as "$PACKAGE" ls -R files/backtrace 2>&1 || true
    adb logcat -d | grep -iE "backtrace|crashpad|SIGSEGV" | tail -30
    exit 1
fi
echo "minidump written: $DUMP"

adb shell run-as "$PACKAGE" cat "$DUMP" > /tmp/native-crash.dmp
if ! strings -a /tmp/native-crash.dmp | grep -qF "$ATTRIBUTE"; then
    echo "::error::minidump does not carry the attribute set after init (time=$ATTRIBUTE)"
    exit 1
fi
echo "minidump carries the post-init attribute"
