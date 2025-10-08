package backtraceio.library.nativeCalls;

public class BacktraceCrashHandlerWrapper{
    public boolean handleCrash(String[] args) {
        return BacktraceCrashHandler.handleCrash(args);
    }

    public boolean initializeJavaCrashHandler(String url, String databasePath, String classPath, String[] attributeKeys, String[] attributeValues,
                                              String[] attachmentPaths, String[] environmentVariables) {
        return BacktraceCrashHandler.initializeJavaCrashHandler(url, databasePath, classPath, attributeKeys, attributeValues, attachmentPaths, environmentVariables);
    }
}
