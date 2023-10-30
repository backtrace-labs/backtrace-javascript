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
