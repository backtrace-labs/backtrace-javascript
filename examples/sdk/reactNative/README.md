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

Add the upload step to your native build. Every release build then uploads its source map.

**On Android:**

Hermes writes a source map for every release build unless a `hermesFlags` override drops `-output-source-map`. To
upload it, add the Backtrace script at the end of `android/app/build.gradle`:

```gradle
apply from: "$rootDir/../node_modules/@backtrace/react-native/android/upload-sourcemaps.gradle"
```

Each release variant then uploads its own source map after `assemble` or `bundle` packages it. Debug variants upload
nothing. A failed upload fails the build. An existing `finalizedBy("uploadSourceMapsToBacktrace")` hook keeps working.

To build a release without uploading, set `backtraceUploadSourceMaps=false` in `gradle.properties` or pass it on the
command line:

```
./gradlew assembleRelease -PbacktraceUploadSourceMaps=false
```

**On iOS:**

In Xcode, select the app target, open `Build Phases` and expand `Bundle React Native code and images`. Add the lines
marked below around the phase's existing script. React Native writes a source map only when `SOURCEMAP_FILE` is
exported before its bundling line.

```bash
set -e
# added for Backtrace
project_directory="$(pwd)/.."
export SOURCEMAP_FILE="$project_directory/main.jsbundle.map"

# existing lines of the phase, unchanged
WITH_ENVIRONMENT="$REACT_NATIVE_PATH/scripts/xcode/with-environment.sh"
REACT_NATIVE_XCODE="$REACT_NATIVE_PATH/scripts/react-native-xcode.sh"

/bin/sh -c "\"$WITH_ENVIRONMENT\" \"$REACT_NATIVE_XCODE\""
# end of the existing lines

# added for Backtrace
source_map_upload="$project_directory/node_modules/@backtrace/react-native/scripts/ios-sourcemap-upload.sh"
backtrace_js_config="$project_directory/.backtracejsrc"

/bin/bash "$source_map_upload" "$SOURCEMAP_FILE" "$CONFIGURATION_BUILD_DIR/.backtrace-sourcemap-id" "$backtrace_js_config" "$project_directory"
```

The Backtrace serializer writes the debug id file to `$CONFIGURATION_BUILD_DIR`. Under Product > Archive that folder
differs from `$TARGET_BUILD_DIR`, and an archive built with `$TARGET_BUILD_DIR` uploads no source map.

The full setup is in the [React Native Integration Guide](https://docs.saucelabs.com/error-reporting/language-integrations/react-native/#upload-source-maps).
