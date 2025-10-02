package backtraceio.library.nativeCalls;

public class BacktraceCrashHandler {
    public static native boolean handleCrash(String[] args);

    public static native boolean initializeJavaCrashHandler(String url, String databasePath, String classPath, String[] attributeKeys, String[] attributeValues,
                                                            String[] attachmentPaths, String[] environmentVariables);
}
