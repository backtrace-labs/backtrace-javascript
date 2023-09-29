package backtraceio.library;

import androidx.annotation.NonNull;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.List;
import java.util.ArrayList;
import java.util.Collections;

public class ReactNativePackage implements ReactPackage {
    @NonNull
    @Override
    public List<NativeModule> createNativeModules(@NonNull ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new backtraceio.library.BacktraceReactNative(reactContext));
        modules.add(new backtraceio.library.BacktraceApplicationAttributeProvider(reactContext));
        modules.add(new backtraceio.library.BacktraceSystemAttributeProvider(reactContext));
        modules.add(new backtraceio.library.BacktraceDeviceAttributeProvider(reactContext));
        modules.add(new backtraceio.library.MemoryInformationAttributeProvider(reactContext));
        modules.add(new backtraceio.library.ProcessAttributeProvider(reactContext));
        modules.add(new backtraceio.library.BacktraceAndroidBackgroundUnhandledExceptionHandler(reactContext));

        // modules.add(new backtraceio.library.BacktraceFileSystemProvider(reactContext));
        // modules.add(new backtraceio.library.BacktraceDirectoryProvider(reactContext));
        return modules;
    }

    @NonNull
    @Override
    public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
