package backtraceio.library.anr;

import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.bridge.WritableNativeMap;

public class StackFrameMapper {
    private static final String NATIVE_FILE_PREFIX = "address: ";
    private static final String UNKNOWN_LIBRARY = "unknown";

    public static WritableArray toWritableFrames(StackTraceElement[] frames) {
        WritableArray result = new WritableNativeArray();
        for (StackTraceElement frame : frames) {
            result.pushMap(toWritableFrame(frame));
        }
        return result;
    }

    public static String toFormattedString(StackTraceElement[] frames) {
        StringBuilder formatted = new StringBuilder();
        for (StackTraceElement frame : frames) {
            formatted.append(frame.toString()).append('\n');
        }
        return formatted.toString();
    }

    private static WritableMap toWritableFrame(StackTraceElement frame) {
        WritableMap map = new WritableNativeMap();

        String fileName = frame.getFileName();
        if (fileName != null && fileName.startsWith(NATIVE_FILE_PREFIX)) {
            // parseNativeFrame stores the symbol in the method name and the library in the class name
            map.putString("funcName", frame.getMethodName());
            map.putString("library", frame.getClassName());
            map.putString("address", fileName.substring(NATIVE_FILE_PREFIX.length()));
            return map;
        }

        String className = frame.getClassName();
        map.putString("funcName", className.isEmpty()
                ? frame.getMethodName()
                : className + "." + frame.getMethodName());

        if (frame.isNativeMethod()) {
            map.putString("library", "Native");
        } else {
            map.putString("library", fileName != null ? fileName : UNKNOWN_LIBRARY);
        }

        if (frame.getLineNumber() > 0) {
            map.putInt("line", frame.getLineNumber());
        }
        return map;
    }
}
