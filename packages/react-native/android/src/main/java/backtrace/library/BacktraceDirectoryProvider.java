package backtrace.library;

import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.module.annotations.ReactModule;

import java.io.File;


@ReactModule(name = BacktraceDirectoryProvider.NAME)
public class BacktraceDirectoryProvider extends ReactContextBaseJavaModule {
    public static final String NAME = "BacktraceDirectoryProvider";
    private static final String LOG_TAG = BacktraceDirectoryProvider.class.getSimpleName();

    private final Context context;

    public BacktraceDirectoryProvider(ReactApplicationContext reactContext) {
        super(reactContext);
        this.context = reactContext.getApplicationContext();
    }

    @Override
    @NonNull
    public String getName() {
        return NAME;
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public WritableArray readDirSync(String path) {
        return listDirectory(path);
    }

    @ReactMethod
    public void readDir(String path, Promise promise) {
        promise.resolve(listDirectory(path));
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public boolean createDirSync(String path) {
        return createDirectory(path);
    }

    @ReactMethod
    public void createDir(String path, Promise promise) {
        promise.resolve(createDirectory(path));
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public String applicationDirectory() {
        try {
            return context.getFilesDir().getAbsolutePath();
        } catch (RuntimeException e) {
            Log.w(LOG_TAG, "Cannot resolve the application files directory: " + e.getClass().getName());
            return "";
        }
    }

    private WritableArray listDirectory(String path) {
        WritableArray array = new WritableNativeArray();
        try {
            File[] files = new File(path).listFiles();
            if (files == null) {
                return array;
            }
            for (File directoryFile : files) {
                array.pushString(directoryFile.getName());
            }
        } catch (RuntimeException e) {
            Log.w(LOG_TAG, "Cannot list directory " + path + ": " + e.getClass().getName());
        }
        return array;
    }

    private boolean createDirectory(String path) {
        try {
            File directory = new File(path);
            return directory.exists() || directory.mkdirs();
        } catch (RuntimeException e) {
            Log.w(LOG_TAG, "Cannot create directory " + path + ": " + e.getClass().getName());
            return false;
        }
    }
}
