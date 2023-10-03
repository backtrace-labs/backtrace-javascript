package backtraceio.library;

public class BacktraceDatabase {
    public static native boolean initialize(String url, String databasePath, String handlerPath,
                                     String[] attributeKeys, String[] attributeValues,
                                     String[] attachmentPaths, boolean enableClientSideUnwinding,
                                     backtraceio.library.UnwindingMode unwindingMode);



    public static native void addAttribute(String name, String value);
}
