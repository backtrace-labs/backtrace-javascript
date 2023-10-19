# Version 0.0.5

-   update `@backtrace-labs/sdk-core` to `0.0.5`
-   add file system abstractions
-   use `ErrorEvent` `message` field if `error` field is `undefined` in unhandled exception/rejection handlers
-   add support for `bigint` serialization
-   add `jsonEscaper` to `JSON.stringify()` and don't assume action exists in `BacktraceReduxMiddleware`

# Version 0.0.4

-   update `@backtrace-labs/sdk-core` to `0.0.4`
-   combine `Error` and `string` overloads in `send`
-   use single global client instance
-   update attachment management to use `addAttachment` instead of a mutable array
-   fix typo in `referrer` attribute

# Version 0.0.3

-   update `@backtrace-labs/sdk-core` to `0.0.3`
-   add deferred user attributes
-   fix skipping stack frame with message reports
-   fix missing library name

# Version 0.0.2

-   update `@backtrace-labs/sdk-core` to `0.0.2`
-   add disposing of `BacktraceClient`
-   simplify form data usage
-   export `BacktraceBrowserRequestHandler`
-   fix issues with ignoring jsonEscape in the formatter function
-   do not pass form data `Content-Type`

# Version 0.0.1

Initial release.
