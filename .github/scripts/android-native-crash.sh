#!/usr/bin/env bash
# Asserts a native crash produces a minidump carrying an attribute set after init.
# INSTALL=apk installs the universal APK, INSTALL=split installs the device's APK set from the bundle, like Google Play.
set -euo pipefail

INSTALL="${INSTALL:-apk}"
PACKAGE="com.reactnative"
ACTIVITY="$PACKAGE/.MainActivity"
OUTPUTS="examples/sdk/reactNative/android/app/build/outputs"
APK="$OUTPUTS/apk/release/app-release.apk"
AAB="$OUTPUTS/bundle/release/app-release.aab"
KEYSTORE="examples/sdk/reactNative/android/app/debug.keystore"
BUNDLETOOL_JAR="${BUNDLETOOL_JAR:-bundletool.jar}"
MARKER="ci-marker-$INSTALL-$(date +%s)"
TRIGGER_URL="backtrace-example://ci-native-crash?marker=$MARKER"
DUMP_OUT="/tmp/native-crash-$INSTALL.dmp"
LOGCAT_OUT="/tmp/logcat-$INSTALL.txt"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK="$(mktemp -d)"
ADB="$(command -v adb)"

case "$INSTALL" in
    apk|split) ;;
    *) echo "::error::INSTALL must be apk or split, got '$INSTALL'"; exit 2 ;;
esac

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

install_apk() {
    adb install -r "$APK"
}

install_split() {
    if [ ! -f "$BUNDLETOOL_JAR" ]; then
        echo "::error::bundletool jar not found at $BUNDLETOOL_JAR"
        exit 1
    fi

    java -jar "$BUNDLETOOL_JAR" build-apks --bundle="$AAB" --output="$WORK/app.apks" --overwrite \
        --connected-device --adb="$ADB" ${ANDROID_SERIAL:+--device-id="$ANDROID_SERIAL"} \
        --ks="$KEYSTORE" --ks-key-alias=androiddebugkey --ks-pass=pass:android --key-pass=pass:android

    unzip -o -q "$WORK/app.apks" "splits/base-master.apk" "splits/base-$ABI_US.apk" -d "$WORK"
    if unzip -l "$WORK/splits/base-master.apk" | grep -q "libbacktrace-native.so"; then
        echo "::error::base-master.apk carries libbacktrace-native.so, this is not a Play-style split install"
        exit 1
    fi
    ABIS="$ABI" bash "$HERE/verify-jni-symbols.sh" "$WORK/splits/base-$ABI_US.apk"

    java -jar "$BUNDLETOOL_JAR" install-apks --apks="$WORK/app.apks" --adb="$ADB" ${ANDROID_SERIAL:+--device-id="$ANDROID_SERIAL"}

    local installed
    installed="$(adb shell pm path "$PACKAGE" | tr -d '\r')"
    echo "$installed"
    if ! grep -q "split_config.$ABI_US.apk" <<<"$installed"; then
        echo "::error::split_config.$ABI_US.apk is not installed"
        exit 1
    fi
}

adb wait-for-device
ABI="$(adb shell getprop ro.product.cpu.abi | tr -d '\r')"
ABI_US="${ABI//-/_}"
echo "install mode: $INSTALL, device abi: $ABI, device abis: $(adb shell getprop ro.product.cpu.abilist | tr -d '\r')"

adb uninstall "$PACKAGE" >/dev/null 2>&1 || true
case "$INSTALL" in
    apk) install_apk ;;
    split) install_split ;;
esac
adb shell pm clear "$PACKAGE" >/dev/null
adb logcat -c
trap 'adb logcat -d > "$LOGCAT_OUT" 2>/dev/null || true; rm -rf "$WORK"' EXIT

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
    if [ -n "$DUMP" ] && adb exec-out run-as "$PACKAGE" cat "$DUMP" > "$DUMP_OUT" 2>/dev/null; then
        ON_DEVICE_SIZE="$(adb shell run-as "$PACKAGE" stat -c %s "$DUMP" 2>/dev/null | tr -d '\r' || true)"
        PULLED_SIZE="$(wc -c < "$DUMP_OUT" | tr -d ' ')"
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
        adb logcat -d | grep -iE "backtrace|crashpad|SIGSEGV|BT_CI_DRIVER|AndroidRuntime|nativeloader" | tail -40
    else
        echo "::error::could not pull a stable copy of $DUMP"
    fi
    exit 1
fi
echo "minidump: $DUMP"
echo "minidump pulled: $PULLED_SIZE bytes"

MARKER="$MARKER" python3 "$HERE/check-minidump-annotations.py" "$DUMP_OUT"

if [ "$INSTALL" = "split" ]; then
    LOADED_FROM_SPLIT="BT_NATIVE_HANDLER_LOADED /.*/split_config\.$ABI_US\.apk!/lib/$ABI/libbacktrace-native\.so"
    if ! wait_for_log "$LOADED_FROM_SPLIT" 15; then
        echo "::error::missing BT_NATIVE_HANDLER_LOADED for split_config.$ABI_US.apk"
        adb logcat -d -s BacktraceCrashHandlerRunner:I '*:S' | tail -20
        exit 1
    fi
    adb logcat -d -v raw -s BacktraceCrashHandlerRunner:I '*:S' | grep -E "^BT_NATIVE_HANDLER_LOADED"
fi
