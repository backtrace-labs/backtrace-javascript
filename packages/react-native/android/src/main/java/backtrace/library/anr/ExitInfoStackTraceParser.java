package backtraceio.library.anr;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class ExitInfoStackTraceParser {
    private static final Pattern JAVA_FRAME_PATTERN = Pattern.compile("\\s*at (.*?)\\((.*?):(\\d+)\\)");
    private static final Pattern NATIVE_METHOD_FRAME_PATTERN = Pattern.compile("\\s*at (.*?)\\(Native method\\)");
    private static final int NATIVE_METHOD_LINE_NUMBER = -2;
    private static final String MAIN_THREAD_NAME = "main";
    private static final int NATIVE_STACK_ELEMENTS_NUMBER = 6;

    static StackTraceElement parseFrame(String frame) {
        StackTraceElement javaFrame = parseJavaFrame(frame);
        if (javaFrame != null) {
            return javaFrame;
        }

        StackTraceElement nativeMethodFrame = parseNativeMethodFrame(frame);
        if (nativeMethodFrame != null) {
            return nativeMethodFrame;
        }

        return parseNativeFrame(frame);
    }

    static StackTraceElement parseNativeMethodFrame(String frame) {
        Matcher matcher = NATIVE_METHOD_FRAME_PATTERN.matcher(frame);
        if (!matcher.find()) {
            return null;
        }

        // isNativeMethod, and so the reported library, keys off this line number
        return toStackTraceElement(matcher.group(1), null, NATIVE_METHOD_LINE_NUMBER);
    }

    static StackTraceElement parseNativeFrame(String frame) {
        if (!frame.startsWith("native")) {
            return null;
        }
        String[] parts = frame.split("\\s+", NATIVE_STACK_ELEMENTS_NUMBER);

        if (parts.length < NATIVE_STACK_ELEMENTS_NUMBER) {
            return null;
        }

        String address = parts[3];
        String library = parts[4];
        String funcName = parts[5];

        return new StackTraceElement(library, funcName, "address: " + address, 0);
    }

    static StackTraceElement parseJavaFrame(String frame) {
        Matcher matcher = JAVA_FRAME_PATTERN.matcher(frame);
        if (!matcher.find()) {
            return null;
        }

        return toStackTraceElement(matcher.group(1), matcher.group(2), Integer.parseInt(matcher.group(3)));
    }

    private static StackTraceElement toStackTraceElement(String fullClassNameMethod, String fileName, int lineNumber) {
        int lastDot = fullClassNameMethod.lastIndexOf('.');
        String className = (lastDot == -1) ? fullClassNameMethod : fullClassNameMethod.substring(0, lastDot);
        String methodName = (lastDot == -1) ? "" : fullClassNameMethod.substring(lastDot + 1);

        return new StackTraceElement(className, methodName, fileName, lineNumber);
    }

    public static StackTraceElement[] parseMainThreadStackTrace(Map<String, Object> parsedData) {
        Map<String, Object> mainThreadInfo = (Map<String, Object>) parsedData.get("main_thread");

        if (mainThreadInfo == null) {
            return new StackTraceElement[0];
        }

        return toStackTraceElements((List<String>) mainThreadInfo.get("stack_trace"));
    }

    // the dump repeats names across pool threads, so these stay a list and are deduplicated by the caller
    public static List<ThreadStackTrace> parseOtherThreadStackTraces(Map<String, Object> parsedData) {
        List<ThreadStackTrace> result = new ArrayList<>();
        List<Map<String, Object>> threads = (List<Map<String, Object>>) parsedData.get("threads");

        if (threads == null) {
            return result;
        }

        for (Map<String, Object> thread : threads) {
            Object name = thread.get("name");
            if (name == null || MAIN_THREAD_NAME.equals(name)) {
                continue;
            }
            result.add(new ThreadStackTrace(name.toString(),
                    toStackTraceElements((List<String>) thread.get("stack_trace"))));
        }
        return result;
    }

    public static class ThreadStackTrace {
        private final String name;
        private final StackTraceElement[] frames;

        ThreadStackTrace(String name, StackTraceElement[] frames) {
            this.name = name;
            this.frames = frames;
        }

        public String getName() {
            return this.name;
        }

        public StackTraceElement[] getFrames() {
            return this.frames;
        }
    }

    private static StackTraceElement[] toStackTraceElements(List<String> stackFrames) {
        if (stackFrames == null) {
            return new StackTraceElement[0];
        }

        List<StackTraceElement> elements = new ArrayList<>();
        for (String frame : stackFrames) {
            StackTraceElement element = parseFrame(frame);
            if (element != null) {
                elements.add(element);
            }
        }
        return elements.toArray(new StackTraceElement[0]);
    }

    public static Map<String, Object> parseANRStackTrace(String stackTrace) {
        Map<String, Object> parsedData = new HashMap<>();

        if (stackTrace == null || stackTrace.isEmpty()) {
            return parsedData;
        }

        parsedData.put("timestamp", parseTimestamp(stackTrace));

        Pattern pidPattern = Pattern.compile("----- pid (\\d+) at");
        Matcher pidMatcher = pidPattern.matcher(stackTrace);
        if (pidMatcher.find()) {
            parsedData.put("pid", Integer.parseInt(pidMatcher.group(1)));
        }

        Pattern cmdLinePattern = Pattern.compile("Cmd line: (.*)");
        Matcher cmdLineMatcher = cmdLinePattern.matcher(stackTrace);
        if (cmdLineMatcher.find()) {
            parsedData.put("command_line", cmdLineMatcher.group(1));
        }

        Pattern fingerprintPattern = Pattern.compile("Build fingerprint: '(.*?)'");
        Matcher fingerprintMatcher = fingerprintPattern.matcher(stackTrace);
        if (fingerprintMatcher.find()) {
            parsedData.put("build_fingerprint", fingerprintMatcher.group(1));
        }

        Pattern abiPattern = Pattern.compile("ABI: '(.*?)'");
        Matcher abiMatcher = abiPattern.matcher(stackTrace);
        if (abiMatcher.find()) {
            parsedData.put("abi", abiMatcher.group(1));
        }

        Pattern buildTypePattern = Pattern.compile("Build type: (.*)");
        Matcher buildTypeMatcher = buildTypePattern.matcher(stackTrace);
        if (buildTypeMatcher.find()) {
            parsedData.put("build_type", buildTypeMatcher.group(1));
        }

        Pattern heapPattern = Pattern.compile("Heap: (.*)");
        Matcher heapMatcher = heapPattern.matcher(stackTrace);
        if (heapMatcher.find()) {
            parsedData.put("heap_info", heapMatcher.group(1));
        }

        List<Map<String, Object>> threads = parseThreadDumps(stackTrace);
        parsedData.put("threads", threads);

        Map<String, Object> mainThreadInfo = getMainThreadInfo(threads);
        parsedData.put("main_thread", mainThreadInfo);

        return parsedData;
    }

    private static Object parseTimestamp(String stackTrace) {
        Pattern timestampPattern = Pattern.compile("----- pid \\d+ at (.*?) -----");
        Matcher timestampMatcher = timestampPattern.matcher(stackTrace);
        if (timestampMatcher.find()) {
            return timestampMatcher.group(1);
        }
        return null;
    }

    @Nullable
    private static Map<String, Object> getMainThreadInfo(List<Map<String, Object>> threads) {
        Map<String, Object> mainThreadInfo = null;
        for (Map<String, Object> thread : threads) {
            if (MAIN_THREAD_NAME.equals(thread.get("name"))) {
                mainThreadInfo = thread;
                break;
            }
        }
        return mainThreadInfo;
    }

    private static Map<String, Object> parseThreadInformation(String threadDump) {
        Map<String, Object> result = new HashMap<>();

        Pattern headerPattern = Pattern.compile("\"([^\"]+)\"\\s*(daemon)?\\s*prio=(\\d+)\\s*tid=(\\d+)\\s*([^\\n]+)");
        Matcher headerMatcher = headerPattern.matcher(threadDump);

        if (headerMatcher.find()) {
            result.put("name", headerMatcher.group(1));
            result.put("isDaemon", headerMatcher.group(2) != null);
            result.put("prio", Integer.parseInt(headerMatcher.group(3)));
            result.put("tid", Integer.parseInt(headerMatcher.group(4)));
            result.put("status", headerMatcher.group(5).trim());
        }

        result.put("stack_trace", parseThreadStackTrace(threadDump));

        return result;
    }

    @NonNull
    private static List<String> parseThreadStackTrace(String threadDump) {
        List<String> stackTrace = new ArrayList<>();
        String[] lines = threadDump.split("\n");
        boolean isStackTrace = false;

        for (String line : lines) {
            line = line.trim();

            if (isStackTrace && (line.isEmpty() || line.startsWith("\""))) {
                break;
            }

            if (line.isEmpty() || line.startsWith("\"")) {
                continue;
            }

            if (line.startsWith("at ") || line.startsWith("native:")) {
                isStackTrace = true;
                stackTrace.add(line);
            }
        }
        return stackTrace;
    }

    public static List<Map<String, Object>> parseThreadDumps(String input) {
        List<Map<String, Object>> threads = new ArrayList<>();

        String regex = "\\\"(.*?)\\\" (daemon )?prio=(\\d+) tid=(\\d+) (\\w+)(.*)\\n(?s)((.*?\\n))(?=(?:\\n\\n)|$)";

        Pattern threadStartPattern = Pattern.compile(regex, Pattern.MULTILINE);
        Matcher threadMatcher = threadStartPattern.matcher(input);

        while (threadMatcher.find()) {
            String threadDump = threadMatcher.group();
            Map<String, Object> threadInfo = parseThreadInformation(threadDump);
            threads.add(threadInfo);
        }

        return threads;
    }
}
