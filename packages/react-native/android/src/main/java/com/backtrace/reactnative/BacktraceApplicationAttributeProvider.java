package com.backtrace.reactnative;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;

import android.text.TextUtils;
import android.provider.Settings;
import android.util.Log;
import android.content.pm.PackageManager;
import java.util.UUID;
import java.util.Map;
import java.util.HashMap;
import android.content.Context;


@ReactModule(name = BacktraceApplicationAttributeProvider.NAME)
public class BacktraceApplicationAttributeProvider extends ReactContextBaseJavaModule {
  public static final String NAME = "BacktraceApplicationAttributeProvider";

  /**
    * Application context
    */
  private final Context context;

  public BacktraceApplicationAttributeProvider(ReactApplicationContext reactContext) {
    super(reactContext);
    this.context = reactContext.getApplicationContext();
  }

  @Override
  @NonNull
  public String getName() {
    return NAME;
  }

  @ReactMethod(isBlockingSynchronousMethod = true)
  public String readApplicationName() {
    return this.context.getApplicationInfo()
      .loadLabel(this.context
      .getPackageManager()).toString();
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
  public String readApplicationVersion() {
    try {
        return this.context.getPackageManager()
                .getPackageInfo(this.context.getPackageName(), 0).versionName;
    } catch (PackageManager.NameNotFoundException e) {
        Log.d(this.NAME, "Could not resolve application version");
        e.printStackTrace();
    }
    return "Unknown";
  }
}
