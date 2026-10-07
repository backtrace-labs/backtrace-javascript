package backtraceio.library;

import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.common.JavascriptException;
import com.facebook.react.module.annotations.ReactModule;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Handle unhandled Android exceptions from background threads.
 */
@ReactModule(name = backtraceio.library.BacktraceAndroidBackgroundUnhandledExceptionHandler.NAME)
public class BacktraceAndroidBackgroundUnhandledExceptionHandler extends ReactContextBaseJavaModule implements Thread.UncaughtExceptionHandler  {
    private final static transient String LOG_TAG = BacktraceAndroidBackgroundUnhandledExceptionHandler.class.getSimpleName();

    private static final Object INSTALL_LOCK = new Object();

    private volatile Thread.UncaughtExceptionHandler _rootHandler;

    private boolean _installed = false;

    // React Native callbacks are single-use; invoking one twice throws.
    private final AtomicReference<Callback> _callback = new AtomicReference<>();

    private volatile CountDownLatch _reportProcessed = new CountDownLatch(0);

    private static final long REPORT_PROCESSED_TIMEOUT_MS = 5000;

    private static final long FATAL_ERROR_MARK_TIMEOUT_MS = 5000;

    private static final int MAX_FATAL_ERROR_MARKS = 8;

    private final List<FatalErrorMark> _fatalErrorMarks = new ArrayList<>();

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
        synchronized (INSTALL_LOCK) {
            if (!_installed) {
                _rootHandler = Thread.getDefaultUncaughtExceptionHandler();
                Thread.setDefaultUncaughtExceptionHandler(this);
                _installed = true;
            }
        }
        _callback.set(callback);
    }

    @Override
    public synchronized void uncaughtException(final Thread thread, final Throwable throwable) {
        try {
            if (isReportedFatalError(throwable)) {
                Log.d(LOG_TAG, "Skipping the JavascriptException of a fatal error already reported from JavaScript.");
            } else {
                report(throwable);
            }
        } catch (RuntimeException | Error ex) {
            Log.w(LOG_TAG, "Failed to report the unhandled exception.", ex);
        } finally {
            Thread.UncaughtExceptionHandler rootHandler = _rootHandler;
            if (rootHandler != null) {
                rootHandler.uncaughtException(thread, throwable);
            }
        }
    }

    // The interop layer rejects a void synchronous method.
    @ReactMethod(isBlockingSynchronousMethod = true)
    public boolean markFatalError(String message) {
        synchronized (_fatalErrorMarks) {
            removeExpiredMarks();
            if (_fatalErrorMarks.size() == MAX_FATAL_ERROR_MARKS) {
                _fatalErrorMarks.remove(0);
            }
            _fatalErrorMarks.add(new FatalErrorMark(message, System.nanoTime()));
        }
        return true;
    }

    private boolean isReportedFatalError(Throwable throwable) {
        if (!(throwable instanceof JavascriptException)) {
            return false;
        }
        String errorMessage = errorMessageOf((JavascriptException) throwable);
        synchronized (_fatalErrorMarks) {
            removeExpiredMarks();
            for (Iterator<FatalErrorMark> marks = _fatalErrorMarks.iterator(); marks.hasNext(); ) {
                if (marks.next().matches(errorMessage)) {
                    marks.remove();
                    return true;
                }
            }
        }
        return false;
    }

    private void removeExpiredMarks() {
        for (Iterator<FatalErrorMark> marks = _fatalErrorMarks.iterator(); marks.hasNext(); ) {
            if (!marks.next().isRecent()) {
                marks.remove();
            }
        }
    }

    // React Native appends ", stack:" and the JS frames to the error message.
    private static String errorMessageOf(JavascriptException exception) {
        String text = exception.getMessage();
        if (text == null) {
            return "";
        }
        int stackStart = text.indexOf(", stack:");
        return stackStart >= 0 ? text.substring(0, stackStart) : text;
    }

    private void report(Throwable throwable) {
        Callback callback = _callback.getAndSet(null);
        if (callback == null) {
            return;
        }
        CountDownLatch reportProcessed = new CountDownLatch(1);
        _reportProcessed = reportProcessed;
        String throwableType = throwable.getClass().getName();
        callback.invoke(throwableType, throwable.getMessage(), stackTraceToString(throwable.getStackTrace()));
        waitForReportProcessing(reportProcessed);
    }

    private void waitForReportProcessing(CountDownLatch reportProcessed) {
        try {
            if (!reportProcessed.await(REPORT_PROCESSED_TIMEOUT_MS, TimeUnit.MILLISECONDS)) {
                Log.d(LOG_TAG, "Timed out waiting for the unhandled exception report to be processed.");
            }
        } catch (InterruptedException ex) {
            Log.d(LOG_TAG, "Interrupted while waiting for the unhandled exception report to be processed.");
        }
    }

    // not synchronized: the crashing thread holds this monitor while it waits
    @ReactMethod(isBlockingSynchronousMethod = true)
    public boolean reportProcessed() {
        Log.d(LOG_TAG, "Unhandled exception report processed by the JavaScript side.");
        _reportProcessed.countDown();
        return true;
    }

    private static final class FatalErrorMark {
        private final String message;
        private final long markedAtNanos;

        FatalErrorMark(String message, long markedAtNanos) {
            this.message = message == null ? "" : message;
            this.markedAtNanos = markedAtNanos;
        }

        boolean matches(String errorMessage) {
            if (message.isEmpty()) {
                String trimmed = errorMessage.trim();
                return trimmed.isEmpty() || trimmed.endsWith(":");
            }
            return errorMessage.contains(message);
        }

        boolean isRecent() {
            return System.nanoTime() - markedAtNanos <= TimeUnit.MILLISECONDS.toNanos(FATAL_ERROR_MARK_TIMEOUT_MS);
        }
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

    @ReactMethod
    public void stop() {
        Log.d(LOG_TAG, "Uncaught exception handler has been disabled.");
        _callback.set(null);
        synchronized (INSTALL_LOCK) {
            if (Thread.getDefaultUncaughtExceptionHandler() == this) {
                Thread.setDefaultUncaughtExceptionHandler(_rootHandler);
                _installed = false;
            }
        }
    }

    @Override
    public void invalidate() {
        stop();
        super.invalidate();
    }
}
