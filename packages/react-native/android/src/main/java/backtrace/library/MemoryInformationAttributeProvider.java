package backtraceio.library;

import androidx.annotation.NonNull;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;
import com.facebook.react.module.annotations.ReactModule;
import android.content.Context;
import java.util.HashMap;
import java.util.Map;

import backtrace.library.AttributeReader;

@ReactModule(name = MemoryInformationAttributeProvider.NAME)
public class MemoryInformationAttributeProvider extends ReactContextBaseJavaModule {
    public static final String NAME = "MemoryInformationAttributeProvider";

    private final Context context;
    private final String attributePath = "/proc/meminfo";

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

        _attributeMapping.put("MemTotal", "system.memory.total");
        _attributeMapping.put("MemFree", "system.memory.free");
        _attributeMapping.put("Buffers", "system.memory.buffers");
        _attributeMapping.put("Cached", "system.memory.cached");
        _attributeMapping.put("SwapCached", "system.memory.swap.cached");
        _attributeMapping.put("Active", "system.memory.active");
        _attributeMapping.put("Inactive", "system.memory.inactive");
        _attributeMapping.put("SwapTotal", "system.memory.swap.total");
        _attributeMapping.put("SwapFree", "system.memory.swap.free");
        _attributeMapping.put("Dirty", "system.memory.dirty");
        _attributeMapping.put("Writeback", "system.memory.writeback");
        _attributeMapping.put("Slab", "system.memory.slab");
        _attributeMapping.put("VmallocTotal", "system.memory.vmalloc.total");
        _attributeMapping.put("VmallocUsed", "system.memory.vmalloc.used");
        _attributeMapping.put("VmallocChunk", "system.memory.vmalloc.chunk");
    }

    public MemoryInformationAttributeProvider(ReactApplicationContext reactContext) {
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
        Map<String,String> memoryAttributes = AttributeReader.readAttributesFromFile(attributePath, _attributeMapping);
        for (Map.Entry<String, String> entry : memoryAttributes.entrySet()) {
            map.putString(entry.getKey(), entry.getValue());
        }
        return map;
    }

}