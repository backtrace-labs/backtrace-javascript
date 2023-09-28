package backtraceio.library;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;
import com.facebook.react.module.annotations.ReactModule;

import android.content.Context;
import android.util.Log;

import java.util.HashMap;
import java.util.Map;

import backtrace.library.AttributeReader;

@ReactModule(name = ProcessAttributeProvider.NAME)
public class ProcessAttributeProvider extends ReactContextBaseJavaModule {
    public static final String NAME = "ProcessAttributeProvider";
    private final static transient String LOG_TAG = ProcessAttributeProvider.class.getSimpleName();

    private final Context context;
    private static HashMap<String, String> _attributeMapping = new HashMap<String, String>();

    static {
        _attributeMapping.put("FDSize", "descriptor.count");
        _attributeMapping.put("VmPeak", "vm.vma.peak");
        _attributeMapping.put("VmSize", "vm.vma.size");
        _attributeMapping.put("VmLck", "vm.locked.size");
        _attributeMapping.put("VmHWM", "vm.rss.peak");
        _attributeMapping.put("VmRSS", "vm.rss.size");
        _attributeMapping.put("VmStk", "vm.stack.size");
        _attributeMapping.put("VmData", "vm.data");
        _attributeMapping.put("VmExe", "vm.exe");
        _attributeMapping.put("VmLib", "vm.shared.size");
        _attributeMapping.put("VmPTE", "vm.pte.size");
        _attributeMapping.put("VmSwap", "vm.swap.size");

        _attributeMapping.put("State", "state");


        _attributeMapping.put("voluntary_ctxt_switches", "sched.cs.voluntary");
        _attributeMapping.put("nonvoluntary_ctxt_switches", "sched.cs.involuntary");

        _attributeMapping.put("SigPnd", "vm.sigpnd");
        _attributeMapping.put("ShdPnd", "vm.shdpnd");
        _attributeMapping.put("Threads", "vm.threads");
    }

    public ProcessAttributeProvider(ReactApplicationContext reactContext) {
        super(reactContext);
        this.context = reactContext.getApplicationContext();
    }

    @Override
    @NonNull
    public String getName() {
        return NAME;
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public WritableMap get() {
        WritableMap map = new WritableNativeMap();
        int processId = android.os.Process.myPid();
        if (processId < 0) {
            Log.d(LOG_TAG, "Failed to read process id");
            return map;
        }
        map.putInt("process.id", processId);
        String processAttributes = String.format("/proc/%d/status", processId);
        Map<String, String> memoryAttributes = AttributeReader.readAttributesFromFile(processAttributes, _attributeMapping);
        for (Map.Entry<String, String> entry : memoryAttributes.entrySet()) {
            map.putString(entry.getKey(), entry.getValue());
        }
        return map;
    }

}