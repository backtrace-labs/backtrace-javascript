package backtraceio.library.anr;

import android.os.Debug;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

public class AnrWatchdog extends Thread {
    public interface OnAnrDetected {
        void onAnrDetected(StackTraceElement[] mainThreadFrames);
    }

    public static final int DEFAULT_ANR_TIMEOUT = 5000;

    private static final String LOG_TAG = AnrWatchdog.class.getSimpleName();

    private final Handler mainThreadHandler = new Handler(Looper.getMainLooper());
    private final int timeout;
    private final boolean debug;
    private final OnAnrDetected listener;

    private volatile boolean shouldStop = false;

    public AnrWatchdog(int timeout, boolean debug, OnAnrDetected listener) {
        this.timeout = timeout;
        this.debug = debug;
        this.listener = listener;
        this.start();
    }

    @Override
    public void run() {
        if (this.debug && (Debug.isDebuggerConnected() || Debug.waitingForDebugger())) {
            Log.w(LOG_TAG, "Detected a debugger connection. ANR watchdog is disabled");
            return;
        }

        boolean reported = false;
        while (!this.shouldStop && !isInterrupted()) {
            final BacktraceThreadWatcher threadWatcher = new BacktraceThreadWatcher();
            this.mainThreadHandler.post(threadWatcher::tickCounter);

            try {
                Thread.sleep(this.timeout);
            } catch (InterruptedException e) {
                return;
            }
            threadWatcher.tickPrivateCounter();

            if (threadWatcher.getCounter() == threadWatcher.getPrivateCounter()) {
                reported = false;
                continue;
            }

            // one report per hang, not one per polling interval
            if (reported) {
                continue;
            }
            reported = true;

            this.listener.onAnrDetected(Looper.getMainLooper().getThread().getStackTrace());
        }
    }

    public void stopMonitoring() {
        this.shouldStop = true;
    }
}
