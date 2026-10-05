package backtraceio.library;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertSame;

import com.facebook.react.bridge.Callback;
import java.util.ArrayList;
import java.util.List;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;

public class BacktraceAndroidBackgroundUnhandledExceptionHandlerTest {
    private Thread.UncaughtExceptionHandler originalDefaultHandler;
    private RecordingHandler rootHandler;
    private BacktraceAndroidBackgroundUnhandledExceptionHandler handler;

    @Before
    public void setUp() {
        originalDefaultHandler = Thread.getDefaultUncaughtExceptionHandler();
        rootHandler = new RecordingHandler();
        Thread.setDefaultUncaughtExceptionHandler(rootHandler);
        handler = new BacktraceAndroidBackgroundUnhandledExceptionHandler(null);
    }

    @After
    public void tearDown() {
        Thread.setDefaultUncaughtExceptionHandler(originalDefaultHandler);
    }

    @Test
    public void startReportsExceptionAndForwardsToPreviousHandler() {
        RecordingCallback callback = new RecordingCallback(handler);
        handler.start(callback);

        crash(new IllegalStateException("boom"));

        assertEquals(1, callback.calls.size());
        assertEquals("java.lang.IllegalStateException", callback.calls.get(0)[0]);
        assertEquals("boom", callback.calls.get(0)[1]);
        assertEquals(1, rootHandler.received.size());
    }

    @Test
    public void stopRestoresPreviousHandler() {
        handler.start(new RecordingCallback(handler));

        handler.stop();

        assertSame(rootHandler, Thread.getDefaultUncaughtExceptionHandler());
    }

    @Test
    public void stopWhileWrappedForwardsWithoutReporting() {
        RecordingCallback callback = new RecordingCallback(handler);
        handler.start(callback);
        WrappingHandler wrapper = WrappingHandler.install();

        handler.stop();
        crash(new RuntimeException("after dispose"));

        assertSame(wrapper, Thread.getDefaultUncaughtExceptionHandler());
        assertEquals(0, callback.calls.size());
        assertEquals(1, rootHandler.received.size());
    }

    @Test
    public void startAfterStopReportsAndForwardsOnce() {
        RecordingCallback firstCallback = new RecordingCallback(handler);
        RecordingCallback secondCallback = new RecordingCallback(handler);
        handler.start(firstCallback);
        handler.stop();

        handler.start(secondCallback);
        crash(new RuntimeException("after re-init"));

        assertSame(handler, Thread.getDefaultUncaughtExceptionHandler());
        assertEquals(0, firstCallback.calls.size());
        assertEquals(1, secondCallback.calls.size());
        assertEquals(1, rootHandler.received.size());
    }

    @Test
    public void secondStartDoesNotChainToItself() {
        RecordingCallback firstCallback = new RecordingCallback(handler);
        RecordingCallback secondCallback = new RecordingCallback(handler);
        handler.start(firstCallback);

        handler.start(secondCallback);
        crash(new RuntimeException("second start"));
        handler.stop();

        assertEquals(0, firstCallback.calls.size());
        assertEquals(1, secondCallback.calls.size());
        assertEquals(1, rootHandler.received.size());
        assertSame(rootHandler, Thread.getDefaultUncaughtExceptionHandler());
    }

    @Test
    public void startAfterStopWhileWrappedDoesNotLoop() {
        handler.start(new RecordingCallback(handler));
        WrappingHandler wrapper = WrappingHandler.install();
        handler.stop();
        RecordingCallback callback = new RecordingCallback(handler);

        handler.start(callback);
        crash(new RuntimeException("re-init while wrapped"));

        assertSame(wrapper, Thread.getDefaultUncaughtExceptionHandler());
        assertEquals(1, wrapper.calls);
        assertEquals(1, callback.calls.size());
        assertEquals(1, rootHandler.received.size());
    }

    @Test(timeout = 2000)
    public void disposeAndReinitDuringReportForwardsWithoutWaiting() {
        RecordingCallback nextCallback = new RecordingCallback(handler);
        handler.start(args -> {
            handler.stop();
            handler.start(nextCallback);
            handler.reportProcessed();
        });

        crash(new RuntimeException("dispose during report"));

        assertEquals(0, nextCallback.calls.size());
        assertEquals(1, rootHandler.received.size());
    }

    @Test
    public void failingCallbackStillForwards() {
        handler.start(args -> {
            throw new RuntimeException("callback failed");
        });

        crash(new RuntimeException("boom"));

        assertEquals(1, rootHandler.received.size());
    }

    @Test
    public void errorIsForwardedWithoutConsumingTheCallback() {
        RecordingCallback callback = new RecordingCallback(handler);
        handler.start(callback);

        crash(new StackOverflowError());
        crash(new RuntimeException("after error"));

        assertEquals(1, callback.calls.size());
        assertEquals(2, rootHandler.received.size());
    }

    @Test
    public void stopBeforeStartKeepsCurrentHandler() {
        handler.stop();

        assertSame(rootHandler, Thread.getDefaultUncaughtExceptionHandler());

        RecordingCallback callback = new RecordingCallback(handler);
        handler.start(callback);
        crash(new RuntimeException("start after early stop"));

        assertEquals(1, callback.calls.size());
        assertEquals(1, rootHandler.received.size());
    }

    @Test
    public void invalidateRestoresPreviousHandler() {
        handler.start(new RecordingCallback(handler));

        handler.invalidate();

        assertSame(rootHandler, Thread.getDefaultUncaughtExceptionHandler());
    }

    @Test
    public void reloadedInstanceStartingFirstForwardsThroughInvalidatedInstance() {
        RecordingCallback oldCallback = new RecordingCallback(handler);
        handler.start(oldCallback);
        BacktraceAndroidBackgroundUnhandledExceptionHandler reloaded =
                new BacktraceAndroidBackgroundUnhandledExceptionHandler(null);
        RecordingCallback newCallback = new RecordingCallback(reloaded);

        reloaded.start(newCallback);
        handler.invalidate();
        reloaded.uncaughtException(Thread.currentThread(), new RuntimeException("after reload"));

        assertEquals(0, oldCallback.calls.size());
        assertEquals(1, newCallback.calls.size());
        assertEquals(1, rootHandler.received.size());
    }

    private void crash(Throwable throwable) {
        Thread.getDefaultUncaughtExceptionHandler().uncaughtException(Thread.currentThread(), throwable);
    }

    private static class RecordingHandler implements Thread.UncaughtExceptionHandler {
        final List<Throwable> received = new ArrayList<>();

        @Override
        public void uncaughtException(Thread thread, Throwable throwable) {
            received.add(throwable);
        }
    }

    private static class WrappingHandler implements Thread.UncaughtExceptionHandler {
        private final Thread.UncaughtExceptionHandler previous;
        int calls = 0;

        private WrappingHandler(Thread.UncaughtExceptionHandler previous) {
            this.previous = previous;
        }

        static WrappingHandler install() {
            WrappingHandler wrapper = new WrappingHandler(Thread.getDefaultUncaughtExceptionHandler());
            Thread.setDefaultUncaughtExceptionHandler(wrapper);
            return wrapper;
        }

        @Override
        public void uncaughtException(Thread thread, Throwable throwable) {
            calls++;
            previous.uncaughtException(thread, throwable);
        }
    }

    private static class RecordingCallback implements Callback {
        private final BacktraceAndroidBackgroundUnhandledExceptionHandler owner;
        final List<Object[]> calls = new ArrayList<>();

        RecordingCallback(BacktraceAndroidBackgroundUnhandledExceptionHandler owner) {
            this.owner = owner;
        }

        @Override
        public void invoke(Object... args) {
            calls.add(args);
            owner.reportProcessed();
        }
    }
}
