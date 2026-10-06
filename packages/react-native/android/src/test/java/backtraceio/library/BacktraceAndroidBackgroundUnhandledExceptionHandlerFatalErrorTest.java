package backtraceio.library;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertSame;
import static org.junit.Assert.assertTrue;

import com.facebook.react.bridge.Callback;
import com.facebook.react.common.JavascriptException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;

public class BacktraceAndroidBackgroundUnhandledExceptionHandlerFatalErrorTest {
    private static final long WAIT_BOUND_MS = 1000;

    private Thread.UncaughtExceptionHandler previousDefaultHandler;
    private final List<Throwable> rootHandlerThrowables = new ArrayList<>();
    private final List<Object[]> callbackInvocations = new ArrayList<>();
    private BacktraceAndroidBackgroundUnhandledExceptionHandler handler;

    @Before
    public void installHandler() {
        previousDefaultHandler = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> rootHandlerThrowables.add(throwable));
        handler = new BacktraceAndroidBackgroundUnhandledExceptionHandler(null);
        Callback callback = args -> {
            callbackInvocations.add(args);
            handler.reportProcessed();
        };
        handler.start(callback);
    }

    @After
    public void restoreDefaultHandler() {
        handler.stop();
        Thread.setDefaultUncaughtExceptionHandler(previousDefaultHandler);
    }

    @Test
    public void markedJavascriptExceptionSkipsTheReportAndTheWait() {
        JavascriptException exception = new JavascriptException("Error: boom\n    at app (index.js:1:1)");
        handler.markFatalError();

        long elapsedMs = timed(() -> handler.uncaughtException(Thread.currentThread(), exception));

        assertEquals(0, callbackInvocations.size());
        assertEquals(1, rootHandlerThrowables.size());
        assertSame(exception, rootHandlerThrowables.get(0));
        assertTrue("forwarded after " + elapsedMs + " ms", elapsedMs < WAIT_BOUND_MS);
    }

    @Test
    public void unmarkedJavascriptExceptionIsReported() {
        JavascriptException exception = new JavascriptException("Error: boom");

        handler.uncaughtException(Thread.currentThread(), exception);

        assertEquals(1, callbackInvocations.size());
        assertEquals(JavascriptException.class.getName(), callbackInvocations.get(0)[0]);
        assertEquals(1, rootHandlerThrowables.size());
        assertSame(exception, rootHandlerThrowables.get(0));
    }

    @Test
    public void markIsConsumedByTheFirstJavascriptException() {
        handler.markFatalError();
        handler.uncaughtException(Thread.currentThread(), new JavascriptException("first"));

        handler.uncaughtException(Thread.currentThread(), new JavascriptException("second"));

        assertEquals(1, callbackInvocations.size());
        assertEquals(2, rootHandlerThrowables.size());
    }

    @Test
    public void markDoesNotApplyToOtherExceptions() {
        RuntimeException exception = new IllegalStateException("background failure");
        handler.markFatalError();

        handler.uncaughtException(Thread.currentThread(), exception);

        assertEquals(1, callbackInvocations.size());
        assertEquals(IllegalStateException.class.getName(), callbackInvocations.get(0)[0]);
        assertSame(exception, rootHandlerThrowables.get(0));
    }

    @Test
    public void synchronousMethodsReturnAValue() {
        assertTrue(handler.markFatalError());
        assertTrue(handler.reportProcessed());
    }

    private static long timed(Runnable runnable) {
        long start = System.nanoTime();
        runnable.run();
        return TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start);
    }
}
