package backtraceio.library;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;
import com.facebook.react.module.annotations.ReactModule;
import android.util.Log;
import android.content.pm.PackageManager;
import android.content.Context;

@ReactModule(name = BacktraceApplicationAttributeProvider.NAME)
public class BacktraceApplicationAttributeProvider extends ReactContextBaseJavaModule {
    private final static transient String LOG_TAG = BacktraceApplicationAttributeProvider.class.getSimpleName();
    public static final String NAME = "BacktraceApplicationAttributeProvider";

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
    public WritableMap get() {
        WritableMap map = new WritableNativeMap();
        map.putString("application", this.readApplicationName());
        map.putString("application.version", this.readApplicationVersion());
        return map;
    }

    private String readApplicationName() {
        return this.context.getApplicationInfo()
                .loadLabel(this.context
                        .getPackageManager()).toString();
    }

    private String readApplicationVersion() {
        try {
            return this.context.getPackageManager()
                    .getPackageInfo(this.context.getPackageName(), 0).versionName;
        } catch (PackageManager.NameNotFoundException e) {
            Log.d(LOG_TAG, "Could not resolve application version");
            e.printStackTrace();
        }
        return "Unknown";
    }
}
