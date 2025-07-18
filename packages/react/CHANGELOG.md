# Version 0.5.0

-   update `@backtrace/browser` to `0.6.0`
-   add `BrowserFileSystem` based on localStorage (#348)

# Version 0.4.1

-   add `@backtrace/browser` as normal dependency to fix typings

# Version 0.4.0

-   update `@backtrace/browser` to `0.4.0`
-   update code to use ES modules (#269, #279)
-   emit CJS and ES modules (#269, #279)

# Version 0.3.1

-   added a new HTTP header to report submission layer (#246)

# Version 0.3.0

-   update `@backtrace/sdk-core` to `0.3.0`
-   update `@backtrace/browser` to `0.3.0`

# Version 0.2.0

-   update `@backtrace/browser` to `0.2.0`
-   add middleware modes to redux middleware, move JSON action to breadcrumb attributes
-   fix global is undefined error (#187)
-   add abort support to metrics and request handlers

# Version 0.1.0

-   library rename to `@backtrace/react`

# Version 0.0.5

-   add file system abstractions
-   use `ErrorEvent` `message` field if `error` field is `undefined` in unhandled exception/rejection handlers
-   add support for `bigint` serialization
-   add `jsonEscaper` to `JSON.stringify()` and don't assume action exists in `BacktraceReduxMiddleware`
-   update `@backtrace/browser` to `0.0.5`

# Version 0.0.4

-   combine `Error` and `string` overloads in `send`
-   use single global client instance
-   update attachment management to use `addAttachment` instead of a mutable array
-   fix typo in `referrer` attribute
-   update `@backtrace/browser` to `0.0.4`

# Version 0.0.3

-   add deferred user attributes
-   fix skipping stack frame with message reports
-   fix missing library name
-   update `@backtrace/browser` to `0.0.3`

# Version 0.0.2

-   add disposing of `BacktraceClient`
-   simplify form data usage
-   export `BacktraceBrowserRequestHandler`
-   fix issues with ignoring jsonEscape in the formatter function
-   do not pass form data `Content-Type`
-   update `@backtrace/browser` to `0.0.2`

# Version 0.0.1

Initial release.
