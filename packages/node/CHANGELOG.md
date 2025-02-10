# Version 0.7.0

-   update `@backtrace/sdk-core` to `0.7.0`
-   add `BacktraceApi` (#335)

# Version 0.6.2

-   fix invalid error handler in `fileChunkSink` (#322)

# Version 0.6.1

-   fix invalid breadcrumb name in `FileBreadcrumbsStorage` (#303)

# Version 0.6.0

-   update `@backtrace/sdk-core` to `0.6.0`
-   reduce breadcrumbs size (#228)
-   use `application` and `application.version` attribute validation from `sdk-core` (#296)

# Version 0.5.0

-   update `@backtrace/sdk-core` to `0.5.0`
-   update code to use ES modules (#267, #279)
-   emit CJS and ES modules (#267, #279)

# Version 0.4.0

-   update `@backtrace/sdk-core` to `0.4.0`
-   upload attachments for native crashes (#262)
-   support `postAttachment` in `NodeBacktraceRequestHandler`

# Version 0.3.2

-   remove `native-reg` and use `reg query` executable to determine Windows machine GUID (#250)

# Version 0.3.1

-   added a new HTTP header to report submission layer (#246)

# Version 0.3.0

-   update `@backtrace/sdk-core` to `0.3.0`
-   bugfix: use correct http client (#232)

# Version 0.2.0

-   update `@backtrace/sdk-core` to `0.2.0`
-   fix native reports not sending after startup (#204)
-   fix global is undefined error (#187)
-   add abort support to metrics and request handlers

# Version 0.1.3

-   export `BacktraceNodeRequestHandler`

# Version 0.1.2

-   fix `AlternatingFileWriter` crash on high load

# Version 0.1.1

-   fix missing `NodeFileSystem` default setting in `BacktraceClient`

# Version 0.1.0

-   library rename to `@backtrace/node`

# Version 0.0.6

-   update `@backtrace/sdk-core` to `0.0.7`
-   remove `const` from types for Typescript <5 compatibility

# Version 0.0.5

-   update `@backtrace/sdk-core` to `0.0.6`
-   add breadcrumbs from previous session in database
-   add attributes from previous session in native crashes
-   add methods to `BacktraceBreadcrumbs` interface and limit `BacktraceManager` visibility
-   add file system abstractions
-   add support for `bigint` serialization

# Version 0.0.4

-   update `@backtrace/sdk-core` to `0.0.4`
-   update attachment management to use `addAttachment` instead of a mutable array
-   combine `Error` and `string` overloads in `send`
-   use single global client instance

# Version 0.0.3

-   update `@backtrace/sdk-core` to `0.0.3`
-   add deferred user attributes
-   fix skipping stack frame with message reports

# Version 0.0.2

-   update `@backtrace/sdk-core` to `0.0.2`
-   add disposing of `BacktraceClient`

# Version 0.0.1

Initial release.
