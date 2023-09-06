package com.backtrace.reactnative;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;

import android.os.Build;
import android.text.TextUtils;
import android.provider.Settings;

import java.util.UUID;

import android.content.Context;

@ReactModule(name = BacktraceSystemAttributeProvider.NAME)
public class BacktraceSystemAttributeProvider extends ReactContextBaseJavaModule {
    public static final String NAME = "BacktraceSystemAttributeProvider";

    private final Context context;

    public BacktraceSystemAttributeProvider(ReactApplicationContext reactContext) {
        super(reactContext);
        this.context = reactContext.getApplicationContext();
    }


    @Override
    @NonNull
    public String getName() {
        return NAME;
    }


    @ReactMethod(isBlockingSynchronousMethod = true)
    public String readMachineId() {
        String androidId = Settings.Secure.getString(this.context.getContentResolver(),
                Settings.Secure.ANDROID_ID);

        if (TextUtils.isEmpty(androidId)) {
            return null;
        }

        return UUID.nameUUIDFromBytes(androidId.getBytes()).toString();
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public String readSystemArchitecture() {
        return System.getProperty("os.arch");
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public String readSystemRelease() {
        return Build.VERSION.RELEASE;
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public String readSystemVersion() {
        return System.getProperty("os.version");
    }
}
