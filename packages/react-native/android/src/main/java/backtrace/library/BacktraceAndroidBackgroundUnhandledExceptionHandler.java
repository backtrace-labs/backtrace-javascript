package backtraceio.library;

import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;

import java.io.PrintWriter;
import java.io.StringWriter;

/**
 * Handle unhandled Android exceptions from background threads.
 */
@ReactModule(name = backtraceio.library.BacktraceAndroidBackgroundUnhandledExceptionHandler.NAME)
public class BacktraceAndroidBackgroundUnhandledExceptionHandler extends ReactContextBaseJavaModule implements Thread.UncaughtExceptionHandler  {
    private final static transient String LOG_TAG = BacktraceAndroidBackgroundUnhandledExceptionHandler.class.getSimpleName();

    private Thread.UncaughtExceptionHandler _rootHandler;

    private Thread _lastCaughtBackgroundExceptionThread;
    private Throwable _lastCaughtBackgroundException;

    /**
     * Check if data shouldn't be reported.
     */
    private volatile boolean _shouldStop = false;

    /**
     * React native callback method
     */
    private Callback _callback;
    public static final String NAME = "BacktraceAndroidBackgroundUnhandledExceptionHandler";

    public BacktraceAndroidBackgroundUnhandledExceptionHandler(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    @NonNull
    public String getName() {
        return NAME;
    }


    @ReactMethod
    public void start(Callback callback) {
        Log.d(LOG_TAG, "Initializing Android unhandled exception handler");
        _callback = callback;
        _rootHandler = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler(this);
    }

    @Override
    public void uncaughtException(final Thread thread, final Throwable throwable) {
        _lastCaughtBackgroundExceptionThread = thread;
        _lastCaughtBackgroundException = throwable;
        if (_shouldStop == true) {
            finish();
            return;
        }
        if (throwable instanceof Exception) {
            String throwableType = throwable.getClass().getName();
            _callback.invoke(throwableType, throwable.getMessage(), stackTraceToString(throwable.getStackTrace()));
        }
        finish();
    }

    private static String stackTraceToString(StackTraceElement[] stackTrace) {
        StringWriter sw = new StringWriter();
        printStackTrace(stackTrace, new PrintWriter(sw));
        return sw.toString();
    }

    private static void printStackTrace(StackTraceElement[] stackTrace, PrintWriter pw) {
        for (StackTraceElement stackTraceEl : stackTrace) {
            pw.println(stackTraceEl);
        }
    }

    public void finish() {
        if (_lastCaughtBackgroundExceptionThread == null || _lastCaughtBackgroundException == null) {
            Log.d(LOG_TAG, "The exception object or the exception thread is not available. This is probably a bug.");
            return;
        }
        if (_shouldStop) {
            Log.d(LOG_TAG, "Backtrace client has been disposed. The report won't be available.");
            return;
        }
        _rootHandler.uncaughtException(_lastCaughtBackgroundExceptionThread, _lastCaughtBackgroundException);
    }

    @ReactMethod
    public void stop() {
        Log.d(LOG_TAG, "Uncaught exception handler has been disabled.");
        _shouldStop = true;
    }
}