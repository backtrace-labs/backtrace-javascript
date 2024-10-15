package backtraceio.library;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.module.annotations.ReactModule;

import android.util.Log;

import android.content.Context;

import java.io.File;
import java.util.HashMap;

import backtraceio.library.nativeCalls.*;
import backtraceio.library.models.nativeHandler.CrashHandlerConfiguration;
import backtraceio.library.base.BacktraceBase;


@ReactModule(name = BacktraceReactNative.NAME)
public class BacktraceReactNative extends ReactContextBaseJavaModule {
    static {
        System.loadLibrary("backtrace-native");
    }

    public static final String NAME = "BacktraceReactNative";
    private final String _crashpadHandlerName = "/libcrashpad_handler.so";

    public native void Crash();

    private final Context context;

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
        String handlerPath = context.getApplicationInfo().nativeLibraryDir + _crashpadHandlerName;
 
        HashMap<String, Object> attributes = readableAttributes.toHashMap();

        String[] keys = attributes.keySet().toArray(new String[0]);
        String[] values = attributes.values().toArray(new String[0]);
        BacktraceCrashHandlerWrapper nativeCommunication = new BacktraceCrashHandlerWrapper();

        Boolean result =
                new File(handlerPath).exists()
                    ?   nativeCommunication.initializeCrashHandler(
                            minidumpSubmissionUrl,
                            databasePath,
                            handlerPath,
                            keys,
                            values,
                            attachmentPaths.toArrayList().toArray(new String[0]),
                            false,
                            null
                        )
                    :   nativeCommunication.initializeJavaCrashHandler(
                            minidumpSubmissionUrl,
                            databasePath,
                            crashHandlerConfiguration.getClassPath(),
                            keys,
                            values,
                            attachmentPaths.toArrayList().toArray(new String[0]),
                            crashHandlerConfiguration
                                .getCrashHandlerEnvironmentVariables(this.context.getApplicationInfo())
                                .toArray(new String[0])
                    );
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
    public void crash() {
        Log.d("BacktraceCrashHandlerRunner", "Crash");
        BacktraceBase.crash();
    }
}
