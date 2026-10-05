package backtraceio.library;

import android.os.Looper;
import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.bridge.WritableNativeMap;
import com.facebook.react.module.annotations.ReactModule;

import java.util.Map;

import backtraceio.library.anr.AnrWatchdog;
import backtraceio.library.anr.StackFrameMapper;

@ReactModule(name = BacktraceAnrWatchdog.NAME)
public class BacktraceAnrWatchdog extends ReactContextBaseJavaModule {
    public static final String NAME = "BacktraceAnrWatchdog";
    public static final String ANR_DETECTED_EVENT = "BacktraceAnrDetected";

    private AnrWatchdog watchdog;

    public BacktraceAnrWatchdog(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    @NonNull
    public String getName() {
        return NAME;
    }

    @ReactMethod()
    public void start(int timeout, boolean debug) {
        if (this.watchdog != null) {
            return;
        }

        try {
            this.watchdog = new AnrWatchdog(
                    timeout > 0 ? timeout : AnrWatchdog.DEFAULT_ANR_TIMEOUT,
                    debug,
                    this::emitAnrDetected);
        } catch (RuntimeException | OutOfMemoryError e) {
            Log.w(NAME, "Failed to start the ANR watchdog (" + e.getClass().getName() + ")");
        }
    }

    @ReactMethod()
    public void stop() {
        if (this.watchdog == null) {
            return;
        }

        try {
            this.watchdog.stopMonitoring();
        } catch (RuntimeException e) {
            Log.w(NAME, "Failed to stop the ANR watchdog (" + e.getClass().getName() + ")");
        }
        this.watchdog = null;
    }

    @Override
    public void invalidate() {
        stop();
        super.invalidate();
    }

    @ReactMethod()
    public void addListener(String eventName) {}

    @ReactMethod()
    public void removeListeners(Integer count) {}

    private void emitAnrDetected(Map<Thread, StackTraceElement[]> allThreads) {
        try {
            emitAnrEvent(allThreads);
        } catch (RuntimeException e) {
            Log.w(NAME, "Failed to report an ANR (" + e.getClass().getName() + ")");
        }
    }

    private void emitAnrEvent(Map<Thread, StackTraceElement[]> allThreads) {
        ReactApplicationContext context = getReactApplicationContext();
        if (context == null || !context.hasActiveReactInstance()) {
            return;
        }

        Thread mainThread = Looper.getMainLooper().getThread();
        StackTraceElement[] mainThreadFrames = allThreads.get(mainThread);
        if (mainThreadFrames == null) {
            mainThreadFrames = mainThread.getStackTrace();
        }

        WritableArray threads = new WritableNativeArray();
        for (Map.Entry<Thread, StackTraceElement[]> entry : allThreads.entrySet()) {
            if (entry.getKey() == mainThread) {
                continue;
            }
            WritableMap thread = new WritableNativeMap();
            thread.putString("name", entry.getKey().getName());
            thread.putArray("frames", StackFrameMapper.toWritableFrames(entry.getValue()));
            threads.pushMap(thread);
        }

        WritableMap event = new WritableNativeMap();
        event.putString("stackTrace", StackFrameMapper.toFormattedString(mainThreadFrames));
        event.putArray("frames", StackFrameMapper.toWritableFrames(mainThreadFrames));
        event.putArray("threads", threads);

        // getJSModule(RCTDeviceEventEmitter) drops events silently in bridgeless mode
        context.emitDeviceEvent(ANR_DETECTED_EVENT, event);
    }
}
