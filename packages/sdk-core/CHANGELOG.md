# Version 0.6.0

-   add `setInterval` unreffing, fixing blocking of application exit (#291)
-   reduce breadcrumbs size (#228)
-   use core client and database as event emitter (#290)
-   add `application` and `application.version` attribute validation (#296)

# Version 0.5.0

-   update code to use ES modules (#266, #279)
-   emit CJS and ES modules (#266, #279)
-   fix abort event not being removed from signal (#265)

# Version 0.4.0

-   change how attachments are managed (#262)
-   add `BacktraceAttachmentProvider` (#262)
-   add attachment support to database (#262)
-   add `maximumNumberOfAttachmentRecords` to database config (#262)
-   remove `hash` and `count` from database records (#262)

# Version 0.3.3

-   fix `BacktraceClient.instance` not being set when the builder is used (#263)

# Version 0.3.2

-   added cancellation token support to `BacktraceDatabase` send/flush methods (#245)
-   prevent database from sending reports via send/flush methods when the client is disabled (#245)

# Version 0.3.1

-   allow to destroy the client instance on dispose()

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
