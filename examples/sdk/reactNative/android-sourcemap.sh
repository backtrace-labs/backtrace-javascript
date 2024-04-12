#/bin/bash

# This script shows how to add source map support to any react-native android application.
# By using it, you can upload source maps to Backtrace and built a release version of the app
# with hermesc support. This script uses .backtracejsrc file available in your react-native directory.
# 
# Additional information. This script prepares your bundle for you. In the relase build, to prevent "double" application build
# while building final apk/aab, in the build.gradle file, please use `debuggableVariants = ["release"]`. Otherwise 
# Gradle and react-native will try to build twice the application and override application version with source map support.

BUILD_DIR=${1:-build}
BUNDLE_PATH="$BUILD_DIR/index.android.bundle"
SOURCE_MAP_PATH="$BUILD_DIR/index.android.js.map"

mkdir -p $BUILD_DIR
# build react-native application
npx react-native bundle \
    --platform android \
    --dev false \
    --entry-file index.js \
    --reset-cache \
    --bundle-output $BUNDLE_PATH \
    --sourcemap-output $SOURCE_MAP_PATH \
    --minify false  \
    --assets-dest ./android/app/src/main/res/


# add source map identifier to final javascript bundle
npx backtrace-js process --path=$BUNDLE_PATH

HBC_OUTPUT="$BUILD_DIR/app.hbc"
HBC_MAP_OUTPUT="$HBC_OUTPUT.map"

# generate react-native executable
./node_modules/react-native/sdks/hermesc/osx-bin/hermesc \
    -emit-binary \
    -max-diagnostic-width=80  \
    -output-source-map \
    -out=$HBC_OUTPUT \
    $BUNDLE_PATH

# on this stage we have source map for built application via react-native 
# and source map for the final executable. Combination of both should generate
# final source map needed to process correctly reports
node ./node_modules/react-native/scripts/compose-source-maps.js \
    $SOURCE_MAP_PATH \
    $HBC_MAP_OUTPUT \
    -o $SOURCE_MAP_PATH

# uplaod data to Backtrace
backtrace-js run $BUNDLE_PATH

# prepare android application
mkdir -p ./android/app/src/main/assets
# rename hbc to android.bundle file
mv $HBC_OUTPUT $BUNDLE_PATH

# prepare android application
mkdir -p ./android/app/build/generated/assets/createBundleReleaseJsAndAssets
cp $BUNDLE_PATH ./android/app/build/generated/assets/createBundleReleaseJsAndAssets/
mkdir -p ./android/app/build/intermediates/assets/release/
cp $BUNDLE_PATH ./android/app/build/intermediates/assets/release/

cd android
./gradlew assembleRelease 
echo "Application build is available under path: ./android/app/build/outputs/apk/release/"