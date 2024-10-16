package backtraceio.library.nativeCalls;

public class BacktraceCrashHandlerWrapper{
    public boolean handleCrash(String[] args) {
        return BacktraceCrashHandler.handleCrash(args);
    }

    public boolean initializeJavaCrashHandler(String url, String databasePath, String classPath, String[] attributeKeys, String[] attributeValues,
                                              String[] attachmentPaths, String[] environmentVariables) {
        return BacktraceCrashHandler.initializeJavaCrashHandler(url, databasePath, classPath, attributeKeys, attributeValues, attachmentPaths, environmentVariables);
    }

    public boolean initializeCrashHandler(String url, String databasePath, String handlerPath,
                                          String[] attributeKeys, String[] attributeValues,
                                          String[] attachmentPaths, boolean enableClientSideUnwinding,
                                          Integer unwindingMode) {
        return BacktraceCrashHandler.initializeCrashHandler(url, databasePath, handlerPath, attributeKeys, attributeValues, attachmentPaths, enableClientSideUnwinding, unwindingMode);
    }
}
