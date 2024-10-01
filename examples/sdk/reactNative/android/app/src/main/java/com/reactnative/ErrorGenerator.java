package com.reactnative;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.io.File;
import java.io.FileReader;
import java.io.IOException;

import android.util.Log;

public class ErrorGenerator extends ReactContextBaseJavaModule {
  ErrorGenerator(ReactApplicationContext context) {
    super(context);
  }

  @Override
  public String getName() {
    return "ErrorGenerator";
  }

  @ReactMethod
  public void throwError() throws IOException {
    readUserConfiguration();
  }

  private void readUserConfiguration() throws IOException {
    // I know for sure this file is there (spoiler alert, it's not)
    File mConfiguration = new File("configuration.json");
    FileReader mConfigurationDataReader = new FileReader(mConfiguration);
    char[] configurationDataBuffer = new char[255];
    mConfigurationDataReader.read(configurationDataBuffer);
  }
}
