package backtraceio.library;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;
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
    public WritableMap get() {
        WritableMap map = new WritableNativeMap();
        map.putString("guid", this.readMachineId());
        map.putString("uname.machine", this.readSystemArchitecture());
        map.putString("uname.sysname", "Android");
        map.putString("uname.version", this.readSystemVersion());
        map.putString("uname.release", this.readSystemRelease());
        return map;
    }

    private String readMachineId() {
        String androidId = Settings.Secure.getString(this.context.getContentResolver(),
                Settings.Secure.ANDROID_ID);

        if (TextUtils.isEmpty(androidId)) {
            return null;
        }

        return UUID.nameUUIDFromBytes(androidId.getBytes()).toString();
    }

    private String readSystemArchitecture() {
        return System.getProperty("os.arch");
    }

    private String readSystemRelease() {
        return Build.VERSION.RELEASE;
    }

    private String readSystemVersion() {
        return System.getProperty("os.version");
    }
}
