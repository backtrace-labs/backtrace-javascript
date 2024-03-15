# Version 0.3.0

-   return submission result from the `send` method (#233)

# Version 0.2.0

-   fix global is undefined error (#187)
-   add abort support to metrics and request handlers

# Version 0.1.0

-   library rename to `@backtrace/sdk-core`

# Version 0.0.7

-   remove `const` from types for Typescript <5 compatibility

# Version 0.0.6

-   add methods to `BacktraceBreadcrumbs` interface and limit `BacktraceManager` visibility

# Version 0.0.5

-   add file system abstractions
-   add support for `bigint` serialization

# Version 0.0.4

-   combine `Error` and `string` overloads in `send`
-   use single global client instance

# Version 0.0.3

-   add deferred user attributes
-   fix skipping stack frame with message reports

# Version 0.0.2

-   add disposing of `BacktraceClient`

# Version 0.0.1

Initial release.
