# @backtrace/react-native demo

This example app shows features available in the @backtrace/react-native package.

## Running the Example

1. Add your universe and token to the SUBMISSION_URL in src/consts.ts
2. `npm install`. If you're on iOS, navigate to the `ios` directory and run `pod install`
3. `npm run start` and pick desired platform

### Source maps

This example application is integrated with the source map support. Once you change the .backtracejsrc file, source maps will be automatically uploaded to your project.

Before executing any step:

> Please update .backtracejsrc file with your symbols submission URL and your sourcemap settings.

Backtrace is compatible with metro build system. To enable source map support, set a `customSerializer` method in the `metro.config.js` file to the `processSourceMap` function available in `@backtrace/react-native/scripts/processSourceMap`.

```
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const backtraceSourceMapProcessor = require('@backtrace/react-native/scripts/processSourceMap');

const config = {
    serializer: {
        customSerializer: backtraceSourceMapProcessor.processSourceMap
    },
};
module.exports = mergeConfig(getDefaultConfig(__dirname), config);

```

Add Backtrace to build automation to ensure every build has source map support.

In order to upload source maps to Backtrace, you can:

**On Android:**

Enable source map support in `app/build.gradle` by uncommenting hermes source map flags. With additional parameters, source maps will be generated. To automatically upload them to Backtrace, you can use the gradle task available the @backtrace/react-native library.

`apply from: "$rootDir/../node_modules/@backtrace/react-native/android/upload-sourcemaps.gradle"`

Once you import the gradle task, you can simply add it to your flow for any build/assemble tasks.

```gradle
tasks.matching {
    it.name.startsWith("assemble") || it.name.startsWith("build")
}.configureEach { task ->
     task.finalizedBy("uploadSourceMapsToBacktrace")
}
```

**On iOS.**

Modify the code in the `Bundle React Native code and images` step in the `Build Phases` of your xcode project setting. In the end of the script, you can include the code below, to upload source maps directly to Backtrace after generating the applicaiton.

```bash
project_directory="$(pwd)/.."
# enable source map support
export SOURCEMAP_FILE="$project_directory/main.jsbundle.map"

...

# upload source maps to Backtrace
source_map_upload="$project_directory/node_modules/@backtrace/react-native/scripts/ios-sourcemap-upload.sh"
backtrace_js_config="$project_directory/.backtracejsrc"

/bin/sh -c "$source_map_upload $SOURCEMAP_FILE $TARGET_BUILD_DIR/.backtrace-sourcemap-id $backtrace_js_config $project_directory"

```
