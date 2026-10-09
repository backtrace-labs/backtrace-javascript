package backtraceio.library;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.module.annotations.ReactModule;

import android.util.Log;

import android.content.Context;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import backtraceio.library.nativeCalls.*;
import backtraceio.library.models.nativeHandler.CrashHandlerConfiguration;
import backtraceio.library.base.BacktraceBase;


@ReactModule(name = BacktraceReactNative.NAME)
public class BacktraceReactNative extends ReactContextBaseJavaModule {
    public static final String NAME = "BacktraceReactNative";

    private static final boolean nativeLibraryLoaded = loadNativeLibrary();

    // The crash handler's start-up attributes outrank any later update of the same key in the uploaded report.
    private static final Set<String> HANDLER_ATTRIBUTE_NAMES = new HashSet<>(Arrays.asList("guid", "error.type"));

    public native void Crash();

    private final Context context;

    private final Set<String> registeredAttachments = new HashSet<>();

    private volatile boolean initialized = false;

    public BacktraceReactNative(ReactApplicationContext reactContext) {
        super(reactContext);
        this.context = reactContext.getApplicationContext();
    }

    @Override
    @NonNull
    public String getName() {
        return NAME;
    }

    private static boolean loadNativeLibrary() {
        try {
            System.loadLibrary("backtrace-native");
            return true;
        } catch (UnsatisfiedLinkError | SecurityException e) {
            Log.w(NAME, "libbacktrace-native did not load, native crash reporting is off (" + e.getClass().getName() + ")");
            return false;
        }
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public Boolean initialize(String minidumpSubmissionUrl, String databasePath, ReadableMap readableAttributes, ReadableArray attachmentPaths) {
        Log.d(NAME, "Initializing native crash reporter");
        if (!nativeLibraryLoaded) {
            Log.w(NAME, "libbacktrace-native did not load, native crash reporting is off");
            return false;
        }

        try {
            CrashHandlerConfiguration crashHandlerConfiguration = new CrashHandlerConfiguration();
            if (!crashHandlerConfiguration.isSupportedAbi()) {
                Log.w(NAME, "Unsupported ABI, native crash reporting is off");
                return false;
            }

            Map<String, Object> attributes = readableAttributes != null ? readableAttributes.toHashMap() : new HashMap<String, Object>();
            List<String> keys = new ArrayList<>();
            List<String> values = new ArrayList<>();
            for (Map.Entry<String, Object> attribute : attributes.entrySet()) {
                if (HANDLER_ATTRIBUTE_NAMES.contains(attribute.getKey())) {
                    keys.add(attribute.getKey());
                    values.add(stringValue(attribute.getValue()));
                }
            }

            List<String> attachments = stringList(attachmentPaths);

            BacktraceCrashHandlerWrapper nativeCommunication = new BacktraceCrashHandlerWrapper();
            boolean result = nativeCommunication.initializeJavaCrashHandler(
                    minidumpSubmissionUrl,
                    databasePath,
                    crashHandlerConfiguration.getClassPath(),
                    keys.toArray(new String[0]),
                    values.toArray(new String[0]),
                    attachments.toArray(new String[0]),
                    crashHandlerConfiguration.getCrashHandlerEnvironmentVariables(this.context.getApplicationInfo()).toArray(new String[0])
                    );

            if (!result) {
                Log.w(NAME, "The native crash handler did not start");
                return false;
            }

            for (Map.Entry<String, Object> attribute : attributes.entrySet()) {
                if (!HANDLER_ATTRIBUTE_NAMES.contains(attribute.getKey())) {
                    BacktraceDatabase.addAttribute(attribute.getKey(), stringValue(attribute.getValue()));
                }
            }

            this.registeredAttachments.addAll(attachments);
            this.initialized = true;
            return true;
        } catch (RuntimeException | LinkageError e) {
            Log.w(NAME, "Native crash reporting is off (" + e.getClass().getName() + ")");
            return false;
        }
    }


    @ReactMethod()
    public void useAttributes(ReadableMap readableAttributes) {
        if (!this.initialized || readableAttributes == null) {
            return;
        }

        try {
            for (Map.Entry<String, Object> attribute : readableAttributes.toHashMap().entrySet()) {
                BacktraceDatabase.addAttribute(attribute.getKey(), stringValue(attribute.getValue()));
            }
        } catch (RuntimeException | LinkageError e) {
            Log.w(NAME, "Failed to update native attributes (" + e.getClass().getName() + ")");
        }
    }


    @ReactMethod()
    public void useAttachments(ReadableArray attachmentPaths) {
        if (!this.initialized || attachmentPaths == null) {
            return;
        }

        try {
            for (String attachmentPath : stringList(attachmentPaths)) {
                if (!this.registeredAttachments.add(attachmentPath)) {
                    continue;
                }
                BacktraceDatabase.addAttachment(attachmentPath);
            }
        } catch (RuntimeException | LinkageError e) {
            Log.w(NAME, "Failed to update native attachments (" + e.getClass().getName() + ")");
        }
    }


    @ReactMethod()
    public void crash() {
        BacktraceBase.crash();
    }

    @ReactMethod()
    public void getAnrExitInfo(double sinceEpochMillis, Promise promise) {
        try {
            promise.resolve(new AnrExitInfoReader(this.context).read((long) sinceEpochMillis));
        } catch (Exception e) {
            Log.w(this.NAME, "Could not read ANR exit info", e);
            promise.reject("backtrace_anr_exit_info", e);
        }
    }

    private static String stringValue(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private static List<String> stringList(ReadableArray array) {
        List<String> result = new ArrayList<>();
        if (array == null) {
            return result;
        }
        for (int index = 0; index < array.size(); index++) {
            if (array.isNull(index)) {
                continue;
            }
            String value = array.getString(index);
            if (value != null) {
                result.add(value);
            }
        }
        return result;
    }
}
