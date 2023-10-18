package backtraceio.library;

import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;

import java.io.BufferedWriter;
import java.io.FileOutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;


@ReactModule(name = backtraceio.library.StreamWriter.NAME)
public class StreamWriter extends ReactContextBaseJavaModule {
    public static final String NAME = "StreamWriter";

    private static final transient String LOG_TAG = backtraceio.library.StreamWriter.class.getSimpleName();

    @Override
    @NonNull
    public String getName() {
        return NAME;
    }
    private HashMap<String, BufferedWriter> _map = new HashMap<>();

    @ReactMethod(isBlockingSynchronousMethod = true)
    public String create(String filePath) {
        String key = String.valueOf(System.currentTimeMillis());
        if (_map.containsKey(key)) {
            return null;
        }

        BufferedWriter writer = this.createWriter(filePath);

        if (writer == null) {
            return null;
        }
        Log.d(LOG_TAG, "Creating a writer for key " + key + " for file " + filePath);
        _map.put(key, writer);
        return key;
    }

    @ReactMethod
    public void append(String key, String line, Promise promise) {
        BufferedWriter writer = _map.get(key);
        if (writer == null) {
            Log.d(LOG_TAG, "Writer with key: " + key + " is not available.");
            promise.resolve(false);
            return;
        }

        try {
            writer.append(line);
            writer.flush();

            promise.resolve(true);
        } catch (Exception e) {
            Log.d(LOG_TAG, "Cannot append a breadcrumb line. Reason: " + e.getMessage());
            promise.resolve(false);
        }
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public boolean close(String key) {
        BufferedWriter writer = _map.get(key);
        if (writer == null) {
            return true;
        }
        _map.remove(key);
        try {
            writer.close();
            return true;
        } catch (Exception e) {
            Log.d(LOG_TAG, "Cannot close the stream. Reason:" + e.getMessage());
            return false;
        }

    }

    private BufferedWriter createWriter(String _sourceFile) {
        try {
            return new BufferedWriter(
                    new OutputStreamWriter(
                            new FileOutputStream(_sourceFile),
                            StandardCharsets.UTF_8
                    )
            );
        } catch (Exception e) {
            Log.d(LOG_TAG, "Cannot create a writer. Reason: " + e.getMessage());
            return null;
        }
    }
}
