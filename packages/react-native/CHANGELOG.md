# Version 0.2.3-rc

Features

-   Android: detect ANRs with the new `anr` option, from a main-thread watchdog (`BacktraceAnrType.Threshold`) or from the exit records Android keeps for earlier runs (`BacktraceAnrType.ApplicationExit`)
-   Android: deobfuscate unhandled Java exception and ANR reports from R8 and ProGuard builds with the new `proguard` option

Improvements

-   support React Native 0.81 and React 19, declare `react >=18.0.0` and `react-native >=0.72.0` peer dependencies
-   SDK failures no longer crash the app, the failing feature turns off and logs a `Backtrace:` warning
-   `BacktraceClient.initialize` returns a disabled client instead of throwing on invalid options or a failed setup
-   restore the previous global error handler on `dispose()`, make `dispose()` safe to call more than once
-   Android: update `libbacktrace-native.so` to backtrace-android 3.14.0, add `x86_64` support for native crash capture, remove the unused `libnative-lib.so`
-   iOS: `ios-sourcemap-upload.sh` skips Debug and `SKIP_BUNDLING` builds, warns instead of failing the Xcode build on missing inputs, can run outside Xcode
-   iOS: support `use_frameworks! :linkage => :dynamic`

Bugfixes

-   forward attributes and file attachments added after `initialize()` to native crash reports
-   attach breadcrumb files and `breadcrumbs.lastId` to native crash reports
-   apply `maximumBreadcrumbs` to the breadcrumb files written with the offline database on
-   a failure while reporting an unhandled error or rejection no longer surfaces as a new unhandled rejection
-   report the package version in `agentVersion` and `backtrace.version` instead of `0.0.1`
-   fix the SDK init crash on React Native 0.72
-   fix `TypeError: Cannot read property 'prototype' of undefined` under Metro `experimentalImportSupport`
-   Android: capture native crashes from release builds minified with R8 or ProGuard, ship the keep rules the crash handler needs
-   Android: wait up to 5 seconds for the unhandled Java exception report to send before the process exits
-   Android: fix autolinking builds under Expo and React Native 0.82+
-   iOS: skip the duplicate native crash report for fatal unhandled JavaScript errors

Packaging

-   update `@backtrace/sdk-core` to `0.8.4-rc`
-   declare `promise` and `pretty-format` as dependencies, add `@backtrace/sourcemap-tools` and `metro` as optional peer dependencies
-   ship the `scripts` folder with the Metro serializer and the iOS source map upload script
-   fix the `repository` field and remove the self-dependency in `package.json`
-   raise `web-streams-polyfill` to `^4.3.0`

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
