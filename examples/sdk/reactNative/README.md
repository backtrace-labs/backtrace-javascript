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

**On Android:**

Add the Backtrace script at the end of `android/app/build.gradle`. Each release variant then uploads its own source map after `assemble` or `bundle` packages it. Debug variants upload nothing.

```gradle
apply from: "$rootDir/../node_modules/@backtrace/react-native/android/upload-sourcemaps.gradle"
```

To build a release without uploading, pass `-PbacktraceUploadSourceMaps=false`.

**On iOS:**

In Xcode, open `Build Phases` > `Bundle React Native code and images` and add the marked lines around the existing script:

```bash
project_directory="$(pwd)/.."
# added for Backtrace
export SOURCEMAP_FILE="$project_directory/main.jsbundle.map"

# existing lines of the phase, unchanged
...

# added for Backtrace
source_map_upload="$project_directory/node_modules/@backtrace/react-native/scripts/ios-sourcemap-upload.sh"
backtrace_js_config="$project_directory/.backtracejsrc"

/bin/bash "$source_map_upload" "$SOURCEMAP_FILE" "$CONFIGURATION_BUILD_DIR/.backtrace-sourcemap-id" "$backtrace_js_config" "$project_directory"
```

Pass `$CONFIGURATION_BUILD_DIR`, not `$TARGET_BUILD_DIR`. Under Product > Archive the two folders differ, and an archive built with `$TARGET_BUILD_DIR` uploads no source map.

The full setup is in the [React Native Integration Guide](https://docs.saucelabs.com/error-reporting/language-integrations/react-native/#upload-source-maps).
