# Version 0.2.0

-   update `@backtrace/sdk-core` to `0.6.0`
-   android crash handler upgrade (#301)
-   fix previous sessions not being cleared (#306)
-   fix invalid RN object returned from iOS BacktraceReactNative.initialize function (#308)
-   remove invalid imports from iOS headers (#307)
-   replace AlternatingFileWriter with WritableStream and ChunkifierSink for breadcrumbs (#315)
-   reduce breadcrumb size (#320)

# Version 0.1.1

-   update @backtrace/sdk-core to `0.3.2`
-   added a new HTTP header to report submission layer (#246)
-   Renamed attributes (#242)
-   Fixed `application.version` application value.
-   The library won't report now OOM reports generated when an application was in the background.

# Version 0.1.0

Initial release.
