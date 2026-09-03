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
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

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

    private boolean _callbackInvoked = false;

    private final CountDownLatch _reportProcessed = new CountDownLatch(1);

    private static final long REPORT_PROCESSED_TIMEOUT_MS = 5000;

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
    public synchronized void uncaughtException(final Thread thread, final Throwable throwable) {
        _lastCaughtBackgroundExceptionThread = thread;
        _lastCaughtBackgroundException = throwable;
        if (_shouldStop == true) {
            finish();
            return;
        }
        // React Native callbacks are single-use; invoking one twice throws.
        if (throwable instanceof Exception && !_callbackInvoked) {
            _callbackInvoked = true;
            String throwableType = throwable.getClass().getName();
            _callback.invoke(throwableType, throwable.getMessage(), stackTraceToString(throwable.getStackTrace()));
            waitForReportProcessing();
        }
        finish();
    }

    private void waitForReportProcessing() {
        try {
            if (!_reportProcessed.await(REPORT_PROCESSED_TIMEOUT_MS, TimeUnit.MILLISECONDS)) {
                Log.d(LOG_TAG, "Timed out waiting for the unhandled exception report to be processed.");
            }
        } catch (InterruptedException ex) {
            Log.d(LOG_TAG, "Interrupted while waiting for the unhandled exception report to be processed.");
        }
    }

    // not synchronized: the crashing thread holds this monitor while it waits
    @ReactMethod
    public void reportProcessed() {
        Log.d(LOG_TAG, "Unhandled exception report processed by the JavaScript side.");
        _reportProcessed.countDown();
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