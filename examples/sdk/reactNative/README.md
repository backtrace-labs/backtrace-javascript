# @backtrace/react-native demo

This example app shows features available in the @backtrace/react-native package.

## Running the Example

1. Add your universe and token to the SUBMISSION_URL in src/consts.ts
2. `npm install`. If you're on iOS, navigate to the `ios` directory and run `pod install`
3. `npm run start` and pick desired platform

#### Source maps

On Android: You can verify our example app with the source map support. In order to do that, please use the
android-sourcemap.sh script.

```bash
./android-sourcemap.sh ./optional-path-to-directory
```

The scirpt will prepare a release APK verison of your react-native application with the source-map and hermes support.
The APK can be found in the ./android/app/build/outputs/apk/release/ directory.
