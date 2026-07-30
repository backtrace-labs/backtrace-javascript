package com.reactnative;

import android.app.Application;

import androidx.annotation.NonNull;

import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactHost;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactHost;
import com.facebook.react.defaults.DefaultReactNativeHost;

import java.util.List;

public class MainApplication extends Application implements ReactApplication {

    private final ReactNativeHost mReactNativeHost = new DefaultReactNativeHost(this) {
        @Override
        public List<ReactPackage> getPackages() {
            List<ReactPackage> packages = new PackageList(this).getPackages();
            packages.add(new BacktraceDemoPackage());
            return packages;
        }

        @Override
        public String getJSMainModuleName() {
            return "index";
        }

        @Override
        public boolean getUseDeveloperSupport() {
            return BuildConfig.DEBUG;
        }

        @Override
        public boolean isNewArchEnabled() {
            return BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;
        }
    };

    @NonNull
    @Override
    public ReactNativeHost getReactNativeHost() {
        return mReactNativeHost;
    }

    @Override
    public ReactHost getReactHost() {
        // RN 0.81's getDefaultReactHost has a third (jsRuntimeFactory) parameter that is
        // optional in Kotlin but not from Java, so pass null explicitly.
        return DefaultReactHost.getDefaultReactHost(getApplicationContext(), mReactNativeHost, null);
    }

    @Override
    public void onCreate() {
        super.onCreate();
        SoLoaderInit.init(this);
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            // If you opted-in for the New Architecture, we load the native entry point for
            // this app.
            DefaultNewArchitectureEntryPoint.load();
        }
    }
}
