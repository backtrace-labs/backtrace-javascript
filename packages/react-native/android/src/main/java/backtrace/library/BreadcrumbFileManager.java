package backtraceio.library;

import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileWriter;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.Scanner;
import java.util.concurrent.locks.ReentrantLock;

@ReactModule(name = BreadcrumbFileManager.NAME)
public class BreadcrumbFileManager extends ReactContextBaseJavaModule {
    public static final String NAME = "BreadcrumbFileManager";

    private static final transient String LOG_TAG = BreadcrumbFileManager.class.getSimpleName();

    private ReentrantLock _lock = new ReentrantLock();


    private Boolean _enabled = false;
    private String _sourceFile;
    private String _fallbackFile;
    private Integer _maximumBreadcrumbsPerFile;

    private BufferedWriter _writer;

    private Integer _currentBreadcrumbsLines = 0;

    public BreadcrumbFileManager(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    @NonNull
    public String getName() {
        return NAME;
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public void use(String sourceFile, String fallbackFile, Integer maximumBreadcrumbsPerFile) throws IOException {
        _sourceFile = sourceFile;
        _fallbackFile = fallbackFile;
        _maximumBreadcrumbsPerFile = maximumBreadcrumbsPerFile;
        _writer = this.createWriter(_sourceFile);
        _enabled = true;
    }


    @ReactMethod
    public void append(String line, Promise promise) {
        if (!_enabled) {
            return;
        }
        _lock.lock();

        try {
            if (_maximumBreadcrumbsPerFile < _currentBreadcrumbsLines + 1) {
                prepareNextBreadcrumbsBatch();
                _currentBreadcrumbsLines = 0;
            }

            _writer.append(line);
            _writer.flush();
            _currentBreadcrumbsLines += 1;

            promise.resolve(true);
        } catch (Exception e) {
            Log.d(LOG_TAG, "Cannot append a breadcrumb line. Reason: " + e.getMessage());
            promise.resolve(false);
        } finally {
            _lock.unlock();
        }
    }

    private BufferedWriter createWriter(String _sourceFile) throws IOException {
        return new BufferedWriter(
                new OutputStreamWriter(
                        new FileOutputStream(_sourceFile),
                        StandardCharsets.UTF_8
                )
        );
    }

    private void prepareNextBreadcrumbsBatch() throws IOException {
        _writer.close();
        rename(_sourceFile, _fallbackFile);
        _writer = createWriter(_sourceFile);
    }

    public void rename(String source, String destination) {
        File destinationFile = new File(destination);
        new File(source).renameTo(destinationFile);
    }
}