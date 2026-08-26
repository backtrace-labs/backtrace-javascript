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

import java.io.File;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;

import backtraceio.library.nativeCalls.*;
import backtraceio.library.models.nativeHandler.CrashHandlerConfiguration;
import backtraceio.library.base.BacktraceBase;


@ReactModule(name = BacktraceReactNative.NAME)
public class BacktraceReactNative extends ReactContextBaseJavaModule {
    static {
        System.loadLibrary("backtrace-native");
    }

    public static final String NAME = "BacktraceReactNative";

    public native void Crash();

    private final Context context;

    private final Set<String> registeredAttachments = new HashSet<>();

    public BacktraceReactNative(ReactApplicationContext reactContext) {
        super(reactContext);
        this.context = reactContext.getApplicationContext();
    }

    @Override
    @NonNull
    public String getName() {
        return NAME;
    }


    @ReactMethod(isBlockingSynchronousMethod = true)
    public Boolean initialize(String minidumpSubmissionUrl, String databasePath, ReadableMap readableAttributes, ReadableArray attachmentPaths) {
        Log.d(this.NAME, "Initializing native crash reporter");
        CrashHandlerConfiguration crashHandlerConfiguration = new backtraceio.library.models.nativeHandler.CrashHandlerConfiguration();
        if (!crashHandlerConfiguration.isSupportedAbi()) {
            Log.d(this.NAME, "Unsupported ABI detected.");
            return false;
        }
 
        HashMap<String, Object> attributes = readableAttributes.toHashMap();
        String[] keys = attributes.keySet().toArray(new String[0]);
        String[] values = attributes.values().toArray(new String[0]);

        String[] attachments = attachmentPaths.toArrayList().toArray(new String[0]);

        BacktraceCrashHandlerWrapper nativeCommunication = new BacktraceCrashHandlerWrapper();
        Boolean result = nativeCommunication.initializeJavaCrashHandler(
                minidumpSubmissionUrl,
                databasePath,
                crashHandlerConfiguration.getClassPath(),
                keys,
                values,
                attachments,
                crashHandlerConfiguration.getCrashHandlerEnvironmentVariables(this.context.getApplicationInfo()).toArray(new String[0])
                );

        this.registeredAttachments.addAll(Arrays.asList(attachments));

        return result;
    }


    @ReactMethod()
    public void useAttributes(ReadableMap readableAttributes) {
        HashMap<String, Object> attributes = readableAttributes.toHashMap();

        String[] keys = attributes.keySet().toArray(new String[0]);
        String[] values = attributes.values().toArray(new String[0]);
        for (int attributeIndex = 0; attributeIndex < attributes.size(); attributeIndex++) {
            BacktraceDatabase.addAttribute(keys[attributeIndex], values[attributeIndex]);
        }
    }


    @ReactMethod()
    public void useAttachments(ReadableArray attachmentPaths) {
        for (int attachmentIndex = 0; attachmentIndex < attachmentPaths.size(); attachmentIndex++) {
            String attachmentPath = attachmentPaths.getString(attachmentIndex);
            if (attachmentPath == null || !this.registeredAttachments.add(attachmentPath)) {
                continue;
            }
            BacktraceDatabase.addAttachment(attachmentPath);
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
}
