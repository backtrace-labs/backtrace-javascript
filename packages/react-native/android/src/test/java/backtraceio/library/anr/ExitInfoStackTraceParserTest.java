package backtraceio.library.anr;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.Test;

// The report stack comes entirely from parsing the text dump the system writes for an ANR, so
// a parsing mistake ships reports with a wrong or empty stack. The cases run against a real
// dump captured from a device and cover both the Java and the native frame formats.
public class ExitInfoStackTraceParserTest {
    private static final String ANR_APPEXIT_STACKTRACE_FILE = "anrAppExitInfoStacktrace.txt";

    @Test
    public void parseFrameJava() {
        // GIVEN
        String frame = "at backtraceio.backtraceio.MainActivity.handledException(MainActivity.java:157)";
        // WHEN
        StackTraceElement stackTraceElement = ExitInfoStackTraceParser.parseFrame(frame);
        // THEN
        assertEquals("backtraceio.backtraceio.MainActivity", stackTraceElement.getClassName());
        assertEquals("MainActivity.java", stackTraceElement.getFileName());
        assertEquals(157, stackTraceElement.getLineNumber());
        assertEquals("handledException", stackTraceElement.getMethodName());
    }

    @Test
    public void parseFrameNative() {
        // GIVEN
        String frame =
                "native: #19 pc 00630008  /apex/com.android.art/lib/libart.so (art::InvokeMethod(art::ScopedObjectAccessAlreadyRunnable const&, _jobject*, _jobject*, _jobject*, unsigned int)+1464)";
        // WHEN
        StackTraceElement stackTraceElement = ExitInfoStackTraceParser.parseFrame(frame);
        // THEN
        assertEquals("/apex/com.android.art/lib/libart.so", stackTraceElement.getClassName());
        assertEquals("address: 00630008", stackTraceElement.getFileName());
        assertEquals(0, stackTraceElement.getLineNumber());
        assertEquals(
                "(art::InvokeMethod(art::ScopedObjectAccessAlreadyRunnable const&, _jobject*, _jobject*, _jobject*, unsigned int)+1464)",
                stackTraceElement.getMethodName());
    }

    @Test
    public void parseAnrStackTrace() {
        // GIVEN
        String anrStacktraceString = readResource(ANR_APPEXIT_STACKTRACE_FILE);

        // WHEN
        Map<String, Object> anrStacktrace = ExitInfoStackTraceParser.parseANRStackTrace(anrStacktraceString);

        // THEN
        assertNotNull(anrStacktrace);
        assertNotNull(anrStacktrace.get("main_thread"));
        assertEquals("x86", anrStacktrace.get("abi"));
        assertEquals("74% free, 6892KB/25MB; 138095 objects", anrStacktrace.get("heap_info"));
        assertEquals(
                "google/sdk_gphone_x86/generic_x86_arm:11/RSR1.201013.001/6903271:user/release-keys",
                anrStacktrace.get("build_fingerprint"));
        assertEquals("optimized", anrStacktrace.get("build_type"));
        assertEquals("backtraceio.backtraceio", anrStacktrace.get("command_line"));
        assertEquals("2025-03-27 21:02:38", anrStacktrace.get("timestamp"));
        assertEquals(9207, anrStacktrace.get("pid"));

        // THEN THREADS
        List<Map<String, Object>> threads = (List<Map<String, Object>>) anrStacktrace.get("threads");
        assertEquals(20, threads.size());

        Map<String, Object> customThread4 = threads.get(18);
        List<String> thread4StackTrace = (List<String>) customThread4.get("stack_trace");

        assertEquals("Thread-4", threads.get(18).get("name"));
        assertEquals("at java.lang.Thread.sleep(Native method)", thread4StackTrace.get(0));
        assertEquals("at java.lang.Thread.sleep(Thread.java:442)", thread4StackTrace.get(1));
        assertEquals("at java.lang.Thread.sleep(Thread.java:358)", thread4StackTrace.get(2));
        assertEquals(
                "at backtraceio.library.watchdog.BacktraceANRHandlerWatchdog.run(BacktraceANRHandlerWatchdog.java:118)",
                thread4StackTrace.get(3));

        // THEN MAIN THREAD
        Map<String, Object> mainThread = (Map<String, Object>) anrStacktrace.get("main_thread");
        assertEquals(5, mainThread.get("prio"));
        assertEquals(1, mainThread.get("tid"));
        assertNull(mainThread.get("daemon"));

        ArrayList<?> stackTrace = (ArrayList<?>) mainThread.get("stack_trace");
        assertEquals(36, stackTrace.size());

        assertEquals(
                "native: #20 pc 005886a0  /apex/com.android.art/lib/libart.so (art::Method_invoke(_JNIEnv*, _jobject*, _jobject*, _jobjectArray*)+80)",
                stackTrace.get(20));
        assertEquals(
                "at androidx.appcompat.app.AppCompatViewInflater$DeclaredOnClickListener.onClick(AppCompatViewInflater.java:468)",
                stackTrace.get(24));
    }

    @Test
    public void parseAnrMainThreadStackTrace() {
        // GIVEN
        String anrStacktraceString = readResource(ANR_APPEXIT_STACKTRACE_FILE);
        Map<String, Object> anrStacktrace = ExitInfoStackTraceParser.parseANRStackTrace(anrStacktraceString);

        // WHEN
        StackTraceElement[] anrMainThreadStacktrace = ExitInfoStackTraceParser.parseMainThreadStackTrace(anrStacktrace);

        // THEN
        assertEquals(36, anrMainThreadStacktrace.length);

        assertEquals("(__kernel_vsyscall+7)", anrMainThreadStacktrace[0].getMethodName());
        assertEquals(0, anrMainThreadStacktrace[0].getLineNumber());
        assertEquals("address: 00000b97", anrMainThreadStacktrace[0].getFileName());
        assertEquals("[vdso]", anrMainThreadStacktrace[0].getClassName());

        assertEquals(
                "(art::interpreter::EnterInterpreterFromEntryPoint(art::Thread*, art::CodeItemDataAccessor const&, art::ShadowFrame*)+176)",
                anrMainThreadStacktrace[14].getMethodName());
        assertEquals(0, anrMainThreadStacktrace[14].getLineNumber());
        assertEquals("address: 00379b00", anrMainThreadStacktrace[14].getFileName());
        assertEquals("/apex/com.android.art/lib/libart.so", anrMainThreadStacktrace[14].getClassName());

        assertEquals("yield", anrMainThreadStacktrace[21].getMethodName());
        assertEquals("java.lang.Thread", anrMainThreadStacktrace[21].getClassName());
        assertTrue(anrMainThreadStacktrace[21].isNativeMethod());

        assertEquals("handledException", anrMainThreadStacktrace[22].getMethodName());
        assertEquals(157, anrMainThreadStacktrace[22].getLineNumber());
        assertEquals("MainActivity.java", anrMainThreadStacktrace[22].getFileName());
        assertEquals("backtraceio.backtraceio.MainActivity", anrMainThreadStacktrace[22].getClassName());
    }

    @Test
    public void parseFrameNativeMethod() {
        // GIVEN
        String frame = "  at java.lang.Thread.sleep(Native method)";

        // WHEN
        StackTraceElement element = ExitInfoStackTraceParser.parseFrame(frame);

        // THEN
        assertNotNull(element);
        assertEquals("java.lang.Thread", element.getClassName());
        assertEquals("sleep", element.getMethodName());
        assertNull(element.getFileName());
        assertTrue(element.isNativeMethod());
    }

    @Test
    public void parseAnrOtherThreadStackTraces() {
        // GIVEN
        String stacktrace = readResource(ANR_APPEXIT_STACKTRACE_FILE);
        Map<String, Object> parsed = ExitInfoStackTraceParser.parseANRStackTrace(stacktrace);

        // WHEN
        List<ExitInfoStackTraceParser.ThreadStackTrace> threads =
                ExitInfoStackTraceParser.parseOtherThreadStackTraces(parsed);

        // THEN
        assertNotNull(threads);
        assertFalse(threads.isEmpty());

        List<String> names = new ArrayList<>();
        for (ExitInfoStackTraceParser.ThreadStackTrace thread : threads) {
            names.add(thread.getName());
        }
        assertFalse(names.contains("main"));
        assertTrue(names.contains("Signal Catcher"));
    }

    @Test
    public void parseOtherThreadStackTracesKeepsRepeatedNames() {
        // GIVEN
        String dump = "\"OkHttp Dispatcher\" daemon prio=5 tid=12 Waiting\n"
                + "  at java.lang.Object.wait(Object.java:405)\n"
                + "\n"
                + "\"OkHttp Dispatcher\" daemon prio=5 tid=13 Waiting\n"
                + "  at java.lang.Thread.run(Thread.java:1572)\n"
                + "\n";
        Map<String, Object> parsed = ExitInfoStackTraceParser.parseANRStackTrace(dump);

        // WHEN
        List<ExitInfoStackTraceParser.ThreadStackTrace> threads =
                ExitInfoStackTraceParser.parseOtherThreadStackTraces(parsed);

        // THEN
        assertEquals(2, threads.size());
        assertEquals("OkHttp Dispatcher", threads.get(0).getName());
        assertEquals("OkHttp Dispatcher", threads.get(1).getName());
        assertEquals("wait", threads.get(0).getFrames()[0].getMethodName());
        assertEquals("run", threads.get(1).getFrames()[0].getMethodName());
    }

    private static String readResource(String fileName) {
        ClassLoader classLoader = ExitInfoStackTraceParserTest.class.getClassLoader();
        InputStream inputStream = classLoader.getResourceAsStream(fileName);
        assertNotNull(inputStream);

        StringBuilder builder = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream))) {
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line);
                if (reader.ready()) {
                    builder.append('\n');
                }
            }
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        return builder.toString();
    }
}
