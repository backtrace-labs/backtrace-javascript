package com.backtrace.reactnative;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;

import android.content.Context;
import android.os.Build;

import java.util.Locale;

@ReactModule(name = BacktraceDeviceAttributeProvider.NAME)
public class BacktraceDeviceAttributeProvider extends ReactContextBaseJavaModule {
    public static final String NAME = "BacktraceDeviceAttributeProvider";

    private final Context context;

    public BacktraceDeviceAttributeProvider(ReactApplicationContext reactContext) {
        super(reactContext);
        this.context = reactContext.getApplicationContext();
    }

    @Override
    @NonNull
    public String getName() {
        return NAME;
    }


    @ReactMethod(isBlockingSynchronousMethod = true)
    public String readCulture() {
        return Locale.getDefault().getDisplayLanguage();
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public String getDeviceModel() {
        return Build.MODEL;
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public String getDeviceBrand() {
        return Build.BRAND;
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public String getDeviceProduct() {
        return Build.PRODUCT;
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public String getDeviceSdk() {
        return String.valueOf(Build.VERSION.SDK_INT);
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public String getDeviceManufacturer() {
        return Build.MANUFACTURER;
    }
}
