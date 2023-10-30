package backtrace.library;

import android.content.Context;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.module.annotations.ReactModule;

import java.io.File;
import java.util.stream.Stream;


@ReactModule(name = BacktraceDirectoryProvider.NAME)
public class BacktraceDirectoryProvider extends ReactContextBaseJavaModule {
    public static final String NAME = "BacktraceDirectoryProvider";

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
        File file = new File(path);

        WritableArray array = new WritableNativeArray();
        for (File directoryFile : file.listFiles()) {
            array.pushString(directoryFile.getPath());
        }

        return array;
    }

    @ReactMethod
    public void readDir(String path, Promise promise) {
        File file = new File(path);

        WritableArray array = new WritableNativeArray();
        for (File directoryFile : file.listFiles()) {
            array.pushString(directoryFile.getName());
        }

        promise.resolve(array);
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public boolean createDirSync(String path) {
        File directory = new File(path);

        if (directory.exists()) {
            return true;
        }
        return directory.mkdirs();
    }

    @ReactMethod
    public void createDir(String path, Promise promise) {
        File directory = new File(path);

        if (directory.exists()) {
            promise.resolve(true);
            return;
        }
        promise.resolve(directory.mkdirs());
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public String applicationDirectory() {
        return context.getFilesDir().getAbsolutePath();
    }
}
