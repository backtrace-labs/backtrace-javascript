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

import backtraceio.library.base.BacktraceBase;
import backtraceio.library.BacktraceDatabase;
import backtraceio.library.UnwindingMode;


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

        String handlerPath = context.getApplicationInfo().nativeLibraryDir + _crashpadHandlerName;

        if (!(new File(handlerPath).exists())) {
            Log.d(this.NAME, "Crashpad handler doesn't exist");
            return false;
        }
        HashMap<String, Object> attributes = readableAttributes.toHashMap();

        String[] keys = attributes.keySet().toArray(new String[0]);
        String[] values = attributes.values().toArray(new String[0]);

        Boolean result = BacktraceDatabase.initialize(
                minidumpSubmissionUrl,
                databasePath,
                handlerPath,
                keys,
                values,
                attachmentPaths.toArrayList().toArray(new String[0]),
                false,
                null
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
        BacktraceBase.crash();
    }
}
