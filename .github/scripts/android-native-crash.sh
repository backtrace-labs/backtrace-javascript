#!/usr/bin/env bash
# Asserts a native crash produces a minidump carrying an attribute set after init.
set -euo pipefail

PACKAGE="com.reactnative"
ACTIVITY="$PACKAGE/.MainActivity"
APK="examples/sdk/reactNative/android/app/build/outputs/apk/release/app-release.apk"
UI=/tmp/ui-hierarchy.txt

dump_ui() {
    for _ in 1 2 3; do
        adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1 || true
        adb shell cat /sdcard/ui.xml 2>/dev/null | tr '>' '\n' > "$UI" || true
        if [ -s "$UI" ]; then
            return 0
        fi
        sleep 5
    done

    echo "::error::could not read the UI hierarchy"
    return 1
}

tap_node() {
    local attribute="$1" value="$2" optional="${3:-required}"
    dump_ui

    # `|| true` so a missing node reports what was on screen instead of failing bare.
    local bounds
    bounds="$(grep "$attribute=\"$value\"" "$UI" \
        | grep -oE 'bounds="\[[0-9]+,[0-9]+\]\[[0-9]+,[0-9]+\]"' \
        | head -1 \
        | grep -oE '[0-9]+' \
        | tr '\n' ' ' || true)"

    if [ -z "$bounds" ]; then
        if [ "$optional" = "optional" ]; then
            return 0
        fi
        echo "::error::could not find $attribute=\"$value\""
        echo "content-desc on screen:"
        grep -oE 'content-desc="[^"]+"' "$UI" | sort -u || true
        echo "text on screen:"
        grep -oE 'text="[^"]+"' "$UI" | sort -u | head -20 || true
        return 1
    fi

    local x1 y1 x2 y2
    read -r x1 y1 x2 y2 <<<"$bounds"
    adb shell input tap $(((x1 + x2) / 2)) $(((y1 + y2) / 2))
    sleep 2
}

adb wait-for-device
adb install -r "$APK"

adb shell pm clear "$PACKAGE" >/dev/null
adb logcat -c
adb shell am start -n "$ACTIVITY" >/dev/null
sleep 20

if ! adb logcat -d | grep -q "Initializing native crash reporter"; then
    echo "::error::native crash reporter did not initialize"
    adb logcat -d | tail -50
    exit 1
fi

# The example warns about an unset submission url on startup, which covers the buttons.
tap_node text OK optional

tap_node content-desc "Update a time attribute"
sleep 3

ATTRIBUTE="$(adb logcat -d | grep -oE "Setting a time attribute to [0-9]+" | tail -1 | grep -oE "[0-9]+" || true)"
if [ -z "$ATTRIBUTE" ]; then
    echo "::error::the app did not report setting a time attribute"
    adb logcat -d | grep -i reactnativejs | tail -20
    exit 1
fi
echo "attribute set after init: time=$ATTRIBUTE"

tap_node text OK optional
tap_node content-desc "Crash application"
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
