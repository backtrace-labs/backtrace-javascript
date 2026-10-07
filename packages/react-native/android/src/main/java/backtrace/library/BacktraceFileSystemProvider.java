package backtrace.library;

import android.os.FileUtils;
import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

@ReactModule(name = BacktraceFileSystemProvider.NAME)
public class BacktraceFileSystemProvider extends ReactContextBaseJavaModule {
    public static final String NAME = "BacktraceFileSystemProvider";
    private static final transient String LOG_TAG = BacktraceFileSystemProvider.class.getSimpleName();

    public BacktraceFileSystemProvider(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    @NonNull
    public String getName() {
        return NAME;
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public String readFileSync(String path) {
        File file = new File(path);
        if (!file.exists()) {
            return null;
        }

        try {
            return read(file);
        } catch (Exception e) {
            Log.d(LOG_TAG, e.getMessage());
            return null;
        }
    }

    @ReactMethod
    public void readFile(String path, Promise promise) {
        File file = new File(path);
        if (!file.exists()) {
            promise.reject(new FileNotFoundException(path));
            return;
        }
        try {
            promise.resolve(read(file));
        } catch (Exception e) {
            Log.d(LOG_TAG, e.getMessage());
            promise.reject(e);
        }
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public boolean writeFileSync(String path, String content) {
        try (FileOutputStream out = new FileOutputStream(path, false)) {
            out.write(content.getBytes(StandardCharsets.UTF_8));
            return true;
        } catch (Exception e) {
            Log.d(LOG_TAG, e.getMessage());
            return false;
        }
    }

    @ReactMethod
    public void writeFile(String path, String content, Promise promise) {
        try (FileOutputStream out = new FileOutputStream(path, false)) {
            out.write(content.getBytes(StandardCharsets.UTF_8));
            promise.resolve(true);
        } catch (Exception e) {
            Log.d(LOG_TAG, e.getMessage());
            promise.reject(e);
        }
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public boolean unlinkSync(String path) {
        return delete(path);
    }

    @ReactMethod
    public void unlink(String filePath, Promise promise) {
        promise.resolve(delete(filePath));
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public boolean existsSync(String path) {
        return exists(path);
    }

    @ReactMethod
    public void exists(String path, Promise promise) {
        promise.resolve(exists(path));
    }

    private boolean delete(String path) {
        try {
            File file = new File(path);
            return !file.exists() || file.delete();
        } catch (RuntimeException e) {
            Log.d(LOG_TAG, "Cannot delete " + path + ": " + e.getClass().getName());
            return false;
        }
    }

    private boolean exists(String path) {
        try {
            return new File(path).exists();
        } catch (RuntimeException e) {
            Log.d(LOG_TAG, "Cannot check " + path + ": " + e.getClass().getName());
            return false;
        }
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public boolean copySync(String sourcePath, String destinationPath) {
        return copy(sourcePath, destinationPath);
    }

    @ReactMethod
    public void copy(String sourcePath, String destinationPath, Promise promise) {
        promise.resolve(copy(sourcePath, destinationPath));
    }

    private boolean copy(String sourcePath, String destinationPath) {
        try (FileInputStream inputStream = new FileInputStream(sourcePath);
             FileOutputStream outputStream = new FileOutputStream(destinationPath, false)) {
            byte[] buf = new byte[1024];
            int len;
            while ((len = inputStream.read(buf)) > 0) {
                outputStream.write(buf, 0, len);
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private String read(File file) throws IOException {
        try (FileInputStream inputStream = new FileInputStream(file);
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            byte[] buf = new byte[1024];
            int len;
            while ((len = inputStream.read(buf)) > 0) {
                outputStream.write(buf, 0, len);
            }
            return new String(outputStream.toByteArray(), StandardCharsets.UTF_8);
        }
    }
}