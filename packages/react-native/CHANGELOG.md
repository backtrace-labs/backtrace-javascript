# Version 0.2.3

Features

-   report React render errors that no error boundary catches, with the JavaScript stack and the component stack
-   Android: detect app hangs (ANRs) with the new `anr` option, as they happen or on the next launch
-   Android: deobfuscate Java crash and ANR reports from minified (R8 or ProGuard) builds with the new `proguard` option
-   Android: report fatal Java errors such as out-of-memory and stack overflow, not only exceptions

Improvements

-   support React Native up to 0.87 and React 19, require React Native 0.72 or later and React 18 or later
-   an internal SDK failure no longer crashes the app, the affected feature turns off and logs a warning
-   `BacktraceClient.initialize` returns a disabled client instead of throwing on invalid options or a failed setup
-   `dispose()` restores the app's previous error handlers and is safe to call more than once
-   native crash reports use the attributes and attachments of a new client created after `dispose()`, a new submission URL or database path applies only after the app restarts
-   release builds give the report of a fatal JavaScript error up to 5 seconds to send before the app closes
-   Android: update the native crash handler to backtrace-android 3.14.0, capture native crashes on x86_64, remove an unused native library
-   Android: release builds upload source maps without an extra hook in `app/build.gradle`, an existing hook keeps working
-   iOS: the source map upload step skips Debug builds and builds without a JavaScript bundle, and warns instead of failing the build on missing files or settings
-   iOS: upload source maps from archive builds, existing apps need the updated Xcode build phase from the integration guide
-   iOS: support apps built with dynamic frameworks (`use_frameworks!`)
-   iOS: support Xcode 27 builds on React Native 0.76 and later, with a Podfile step from the README

Bugfixes

-   native crash reports include attributes and attachments added or changed after the SDK starts
-   native crash reports include breadcrumbs
-   apply the `maximumBreadcrumbs` limit to breadcrumbs saved by the offline database
-   reports saved offline or during a crash are sent on the next launch with their breadcrumbs
-   a fatal JavaScript error produces one report instead of two
-   a failure while reporting an unhandled error or rejection no longer shows up as a new unhandled promise rejection
-   reports show the SDK version instead of `0.0.1`
-   fix a crash at startup on React Native 0.72
-   fix a startup `TypeError` when Metro's `experimentalImportSupport` is on
-   Android: capture native crashes in minified (R8 or ProGuard) release builds without extra keep rules
-   Android: capture native crashes in apps installed from Google Play app bundles
-   Android: give the report of a Java crash up to 5 seconds to send before the app closes
-   Android: after `dispose()`, Java crashes go to the previous crash handler again, a new client or a JavaScript reload turns reporting back on
-   Android: fix failed uploads when a breadcrumb is added while a report is being sent
-   Android: fix builds under Expo and on React Native 0.82 and later
-   Android: fix the source map upload on Gradle 9, upload the right map for each build variant, add a `backtraceUploadSourceMaps` Gradle property to turn uploads off

Packaging

-   update `@backtrace/sdk-core` to `0.8.4`
-   iOS: require PLCrashReporter 1.12.0, run `pod update PLCrashReporter` once when upgrading
-   fix missing dependencies in the package, `@backtrace/sourcemap-tools` and `metro` are optional and used for source maps
-   include the source map scripts (Metro serializer, iOS upload script) in the package
-   fix the package metadata
-   update `web-streams-polyfill` to 4.3.0

# Version 0.2.2

-   Fix: label unhandled promise rejections as 'Unhandled rejection' (#370)

# Version 0.2.1

-   update the React-Native SDK Android native libraries with 16KB support (#355)
-   improve crash handling on Android for better compatibility and stability on the latest Android versions (#355)

# Version 0.2.0

-   update `@backtrace/sdk-core` to `0.6.0`
-   android crash handler upgrade (#301)
-   fix previous sessions not being cleared (#306)
-   fix invalid RN object returned from iOS BacktraceReactNative.initialize function (#308)
-   remove invalid imports from iOS headers (#307)
-   replace AlternatingFileWriter with WritableStream and ChunkifierSink for breadcrumbs (#315)
-   reduce breadcrumb size (#320)
-   fixed debugger detection in the bridgeless mode (#325)

# Version 0.1.1

-   update @backtrace/sdk-core to `0.3.2`
-   added a new HTTP header to report submission layer (#246)
-   Renamed attributes (#242)
-   Fixed `application.version` application value.
-   The library won't report now OOM reports generated when an application was in the background.

# Version 0.1.0

Initial release.
