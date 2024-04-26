# @backtrace/react-native demo

This example app shows features available in the @backtrace/react-native package.

## Running the Example

1. Add your universe and token to the SUBMISSION_URL in src/consts.ts
2. `npm install`. If you're on iOS, navigate to the `ios` directory and run `pod install`
3. `npm run start` and pick desired platform

#### Source maps

Before executing any step:

-   Please update .backtracejsrc file with your symbols submission URL and your sourcemap settings.
-   please install @backtrace/javascript-cli library.

On Android: You can verify our example app with the source map support. In order to do that, please use the
android-sourcemap.sh script.

```bash
./android-sourcemap.sh ./optional-path-to-directory
```

The script will prepare a release APK version of your React Native application with the sourcemap and Hermes support.
The APK can be found in the ./android/app/build/outputs/apk/release/ directory.

On iOS: Backtrace simplify the flow needed to upload source maps by instructing hermesc how to generate and prepare
source maps for your application. Without this additional step, react-native will not instruct your application to
support Backtrace source maps.

In order to prepare your application for source maps and automatically upload them to Backtrace, modify your "Build
Phase" with the following code:

```bash
set -e

# destination source map directory
SOURCE_MAP_DIR="$(pwd)/../build"
mkdir -p $SOURCE_MAP_DIR

export SOURCEMAP_FILE="$SOURCE_MAP_DIR/main.js.map";
WITH_ENVIRONMENT="../node_modules/react-native/scripts/xcode/with-environment.sh"
REACT_NATIVE_XCODE="../node_modules/react-native/scripts/react-native-xcode.sh"

# use hermesc script provided by Backtrace to populate source maps
# if you dont use hermes support, please skip this step.
export HERMES_CLI_PATH="$(pwd)/../ios-hermesc.sh"

/bin/sh -c "$WITH_ENVIRONMENT $REACT_NATIVE_XCODE"

# copy javascript build output to the build directory
cp "$CONFIGURATION_BUILD_DIR/main.jsbundle" $SOURCE_MAP_DIR

# process source map with javascript code
backtrace-js run --config "$(pwd)/../.backtracejsrc" --path "$SOURCE_MAP_DIR/main.jsbundle"

```

Note: this modification copy the output of the javascript build into the build directory created in your application
folder. Please also put ios-hermesc.
