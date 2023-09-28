package backtraceio.library;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;
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
    public WritableMap get() {
        WritableMap map = new WritableNativeMap();
        map.putString("culture", this.readCulture());
        map.putString("device.model", this.getDeviceModel());
        map.putString("device.brand", this.getDeviceBrand());
        map.putString("device.product", this.getDeviceProduct());
        map.putString("device.sdk", this.getDeviceSdk());
        map.putString("device.manufacturer", this.getDeviceManufacturer());
        map.putString("cpu.boottime", String.valueOf(java.lang.System.currentTimeMillis() - android.os.SystemClock
                .elapsedRealtime()));
        return map;
    }


    private String readCulture() {
        return Locale.getDefault().getDisplayLanguage();
    }

    private String getDeviceModel() {
        return Build.MODEL;
    }

    private String getDeviceBrand() {
        return Build.BRAND;
    }

    private String getDeviceProduct() {
        return Build.PRODUCT;
    }

    private String getDeviceSdk() {
        return String.valueOf(Build.VERSION.SDK_INT);
    }

    private String getDeviceManufacturer() {
        return Build.MANUFACTURER;
    }
}
