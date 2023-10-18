package backtrace.library;

import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Scanner;

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

        try (Scanner scanner = new Scanner(file)){
            StringBuilder sb = new StringBuilder();

            while (scanner.hasNext()) {
                sb.append(scanner.nextLine());
            }

            return sb.toString();
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
        try (Scanner scanner = new Scanner(file)){
            StringBuilder sb = new StringBuilder();

            while (scanner.hasNext()) {
                sb.append(scanner.nextLine());
            }

            scanner.close();
            promise.resolve(sb.toString());
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
        File file = new File(path);
        if (!file.exists()) {
            return true;
        }
        Boolean result = file.delete();
        return result;
    }

    @ReactMethod
    public void unlink(String filePath, Promise promise) {
        File file = new File(filePath);
        if (!file.exists()) {
            promise.resolve(true);
            return;
        }
        Boolean result = file.delete();
        promise.resolve(result);
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public boolean existsSync(String path) {
        File file = new File(path);
        return file.exists();
    }

    @ReactMethod
    public void exists(String path, Promise promise) {
        File file = new File(path);
        promise.resolve(file.exists());
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public boolean renameSync(String sourcePath, String destinationPath) {
        File sourceFile = new File(sourcePath);
        File destinationFile = new File(destinationPath);
        return sourceFile.renameTo(destinationFile);
    }

    @ReactMethod
    public void rename(String sourcePath, String destinationPath, Promise promise) {
        File sourceFile = new File(sourcePath);
        File destinationFile = new File(destinationPath);
        promise.resolve(sourceFile.renameTo(destinationFile));
    }
}