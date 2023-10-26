# **Backtrace Electron SDK**

[Backtrace](https://backtrace.io) captures and reports handled and unhandled exceptions in your production software so
you can manage application quality through the complete product lifecycle.

The [@backtrace/electron](#) SDK connects your JavaScript application to Backtrace. The basic integration is quick and
easy, after which you can explore the rich set of Backtrace features.

## Table of Contents

1. [Basic Integration - Reporting your first errors](#basic-integration)
    - [Install the package](#install-the-package)
    - [Integrate the SDK in the main process](#integrate-the-sdk-in-the-main-process)
    - [Integrate the SDK in the renderer process](#integrate-the-sdk-in-the-renderer-process)
    - [Upload source maps](#upload-source-maps)
1. [Error Reporting Features](#error-reporting-features)
    - [Attributes](#attributes)
    - [File Attachments](#file-attachments)
    - [Breadcrumbs](#breadcrumbs)
    - [Application Stability Metrics](#application-stability-metrics)
        - [Metrics Configuration](#metrics-configuration)
        - [Metrics Usage](#metrics-usage)
    - [Offline Database support](#offline-database-support)
        - [Database Configuration](#database-configuration)
        - [Native crash support](#native-crash-support)
        - [Manual database operations](#manual-database-operations)
1. [Advanced SDK Features](#advanced-sdk-features)
    - [BacktraceClient Options](#backtraceclient)
    - [Manually send an error](#manually-send-an-error)
    - [Modify/skip error reports](#modifyskip-error-reports)
    - [SDK Method Overrides](#sdk-method-overrides)

## Basic Integration

### Install the package

```
$ npm install @backtrace/electron
```

### Integrate the SDK in the main process

Add the following code to your application before all other scripts to report Electron errors to Backtrace.

```ts
// Import the BacktraceClient from @backtrace/electron with your favorite package manager.
import { BacktraceClient, BacktraceConfiguration } from '@backtrace/electron';

// Configure client options
const options: BacktraceConfiguration = {
    // Submission url
    // <universe> is the subdomain of your Backtrace instance (<universe>.backtrace.io)
    // <token> can be found in Project Settings/Submission tokens
    url: 'https://submit.backtrace.io/<universe>/<token>/json',
};

// Initialize the client with the options
const client = BacktraceClient.initialize(options);

// By default, Backtrace will send an error for Uncaught Exceptions and Unhandled Promise Rejections

// Manually send an error
client.send(new Error('Something broke!'));
```

### Integrate the SDK in the renderer process

You can use any browser based Backtrace SDK in your renderer process, such as `@backtrace/browser` or
`@backtrace/react`. Make sure to install it aside `@backtrace/electron`:

```
$ npm install @backtrace/browser
```

To add Backtrace to the renderer process with Electron IPC support, you need to use a
[preload script](https://www.electronjs.org/docs/latest/tutorial/tutorial-preload) in your `BrowserWindow`. Once you
have one, add this import to it:

```ts
import '@backtrace/electron/main/preload';
```

This will ensure that IPC APIs that Backtrace uses are loaded correctly.

After that, you can initialize Backtrace in your renderer process. There are two things that differ from the normal SDK
initialization:

1. URL is not used - you can leave it as an empty string,
1. You need to use `addBacktraceElectron` with the builder.

For example, if you are initializing the SDK using the `initialize` function:

```ts
const client = BacktraceClient.initialize(
    {
        url: '',
        name: 'My Renderer App',
        version: '0.0.1',
    },
    (builder) => addBacktraceElectron(builder),
);
```

Or, if you are using the `build` function:

```ts
const builder = BacktraceClient.builder({
    url: '',
    name: 'My Renderer App',
    version: '0.0.1',
});

addBacktraceElectron(builder);

const client = builder.build();
```

#### Submission process

The renderer client does not submit any errors. Everything that is being sent to Backtrace is routed via IPC to the main
process, which handles the submission.

This includes:

-   error reports,
-   error report attachments,
-   breadcrumbs,
-   metrics.

Main process' session ID is used in the renderer reports.

When an error occurs in the renderer process, the attachments from main and renderer process are included in the report.
The attachments are streamed if possible (`Blob`, `ReadableStream`), otherwise copied by serializing them to JSON.
However, renderer attachments are not included in the main process crashes. This is due to a possibility of having
multiple renderer processes, but it may change in the future.

#### Synchronized initialization

When adding Electron to the renderer SDK, data is exchanged with the main process to ensure same session IDs are used.
By default, this is done asynchronously as soon as possible. This may however be not enough in case of startup crashes
just after the SDK initialization, because the data may not be exchanged yet.

In those cases, you can use `synchronize` option in `addBacktraceBuilder`. Note, that if you do not ensure that the SDK
in the main process is initialized by the time you call `addBacktraceBuilder`, **your application may hang with a white
screen**. This is due to the synchronous nature of the IPC, that is blocking the renderer process until it receives a
response.

To enable synchronous initialization:

```ts
const client = BacktraceClient.initialize(
    {
        url: '',
        name: 'My Renderer App',
        version: '0.0.1',
    },
    (builder) => addBacktraceElectron(builder, { synchronous: true }),
);
```

### Upload source maps

Client-side error reports are based on minified code. Upload source maps and source code to resolve minified code to
your original source identifiers.

[(Source Map feature documentation)](https://docs.saucelabs.com/error-reporting/platform-integrations/source-map/)

<? TBD: Link to source upload doc ?>

## Error Reporting Features

All features here are described for the main process. If you want to know more about error reporting in browser, consult
your Backtrace browser SDK's readme.

### Attributes

Custom attributes are key-value pairs that can be added to your error reports. They are used in report aggregation,
sorting and filtering, can provide better contextual data for an error, and much more. They are foundational to many of
the advanced Backtrace features detailed in
[Error Reporting documentation](https://docs.saucelabs.com/error-reporting/getting-started/). By default attributes such
as application name and version are populated automatically from Electron app information.

There are several places where attributes can be added, modified or deleted.

#### Attach attributes object to BacktraceClient

It is possible to include an attributes object during [BacktraceClient](#backtraceclient) initialization. This list of
attributes will be included with every error report, referred to as global attributes.

```ts
// Create an attributes object that can be modified throughout runtime
const attributes: Record<string, unknown> = {
    release: 'PROD',
};

// BacktraceClientOptions
const options: BacktraceConfiguration = {
    url: 'https://submit.backtrace.io/<universe>/<token>/json',

    // Attach the attributes object
    userAttributes: attributes,
};

// Initialize the client
const client = BacktraceClient.initialize(options);
```

You can also include attributes that will be resolved when creating a report:

```ts
// BacktraceClientOptions
const options: BacktraceConfiguration = {
    url: 'https://submit.backtrace.io/<universe>/<token>/json',

    // Attach the attributes object
    userAttributes: () => ({
        attribute: getAttributeValue(),
    }),
};

// Initialize the client
const client = BacktraceClient.initialize(options);
```

#### Add attributes during application runtime

Global attributes can be set during the runtime once specific data has be loaded (e.g. a user has logged in).

```ts
const client = BacktraceClient.initialize(options);
...

client.addAttribute({
    "clientID": "de6faf4d-d5b5-486c-9789-318f58a14476"
})
```

You can also add attributes that will be resolved when creating a report:

```ts
const client = BacktraceClient.initialize(options);
...

client.addAttribute(() => ({
    "clientID": resolveCurrentClientId()
}))
```

#### Add attributes to an error report

The attributes list of a BacktraceReport object can be directly modified.

```ts
const report: BacktraceReport = new BacktraceReport('My error message', { myReportKey: 'myValue' });
report.attributes['myReportKey'] = 'New value';
```

---

### File Attachments

Files can be attached to error reports. This can be done when initalizing the BacktraceClient, updating the
BacktraceClient, or dynamically for specific reports. When including attachments in BacktraceClient, all files will be
uploaded with each report.

```ts
// Import attachment types from @backtrace/electron
import { BacktraceStringAttachment, BacktraceFileAttachment, BacktraceBufferAttachment } from "@backtrace/electron";

// BacktraceStringAttachment should be used for text object like a log file, for example
const stringAttachment = new BacktraceStringAttachment("logfile.txt", "This is the start of my log")

// Buffer attachment is an attachment type dedicated to store buffer data
const bufferAttachment = new BacktraceBufferAttachment('buffer-attachment.txt', Buffer.from('sample'));

// File attachment is an attachment type dedicated for streaming files
const fileAttachment = new BacktraceFileAttachment('/path/to/sample/file');

// BacktraceClientOptions
const options = {
    url: "https://submit.backtrace.io/<universe>/<token>/json",

    // Attach the files to all reports
    attachments: [path.join('/path/to/attachment'), stringAttachment],
}

const client = BacktraceClient.initialize(options);

// Later decide to add an attachment to all reports
client.addAttachment(bufferAttachment)

// After catching an exception and generating a report
try {
    throw new Error("Caught exception!")
} catch (error) {
    const report = const report = new BacktraceReport(error, {}, [fileAttachment])
    client.send(report);
}
```

---

### Breadcrumbs

Breadcrumbs are snippets of chronological data tracing runtime events. This SDK records a number of events by default,
and manual breadcrumbs can also be added.

[(Breadcrumbs feature documentation)](https://docs.saucelabs.com/error-reporting/web-console/debug/#breadcrumbs)

#### Breadcrumbs Configuration

| Option Name          | Type                                                       | Description                                                                                                                                                   | Default         | Required?                |
| -------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------ |
| `enable`             | Boolean                                                    | Determines if the breadcrumbs support is enabled. By default the value is set to true.                                                                        | `true`          | <ul><li>- [ ] </li></ul> |
| `logLevel`           | BreadcrumbLogLevel                                         | Specifies which log level severity to include. By default all logs are included.                                                                              | All Logs        | <ul><li>- [ ] </li></ul> |
| `eventType`          | BreadcrumbType                                             | Specifies which breadcrumb type to include. By default all types are included.                                                                                | All Types       | <ul><li>- [ ] </li></ul> |
| `maximumBreadcrumbs` | Number                                                     | Specifies maximum number of breadcrumbs stored by the library. By default, only 100 breadcrumbs will be stored.                                               | `100`           | <ul><li>- [ ] </li></ul> |
| `intercept`          | (breadcrumb: RawBreadcrumb) => RawBreadcrumb \| undefined; | Inspects breadcrumb and allows to modify it. If the undefined value is being returned from the method, no breadcrumb will be added to the breadcrumb storage. | All Breadcrumbs | <ul><li>- [ ] </li></ul> |

```ts
import { BacktraceClient, BacktraceConfiguration } from '@backtrace/electron';

// BacktraceClientOptions
const options: BacktraceConfiguration = {
    // ignoring all but breadcrumbs config for simplicity
    breadcrumbs: {
        // breadcrumbs configuration
    },
};

// Initialize the client
const client = BacktraceClient.initialize(options);
```

#### Default Breadcrumbs

| Type    | Description                                                              |
| ------- | ------------------------------------------------------------------------ |
| Console | Adds a breadcrumb every time console log is being used by the developer. |

#### Intercepting Breadcrumbs

If PII or other information needs to be filtered from a breadcrumb, you can use the intercept function to skip or filter
out the sensitive information. Any RawBreadcrumb returned will be used for the breadcrumb. If undefined is returned, no
breadcrumb will be added.

#### Manual Breadcrumbs

In addition to all of the default breadcrumbs that are automatically collected, you can also manually add breadcrumbs of
your own.

```ts
client.breadcrumbs?.info('This is a manual breadcrumb.', {
    customAttr: 'wow!',
});
```

---

### Application Stability Metrics

The Backtrace Electron SDK has the ability to send usage Metrics to be viewable in the Backtrace UI.

[(Stability Metrics feature documentation)](https://docs.saucelabs.com/error-reporting/project-setup/stability-metrics/)

#### Metrics Configuration

| Option Name            | Type    | Description                                                                                                                                                                                                                                                                                                                                              | Default                       | Required?                |
| ---------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------ |
| `metricsSubmissionUrl` | String  | Metrics server hostname. By default the value is set to https://events.backtrace.io.                                                                                                                                                                                                                                                                     | `https://events.backtrace.io` | <ul><li>- [ ] </li></ul> |
| `enable`               | Boolean | Determines if the metrics support is enabled. By default the value is set to true.                                                                                                                                                                                                                                                                       | `true`                        | <ul><li>- [ ] </li></ul> |
| `autoSendInterval`     | Number  | Indicates how often crash free metrics are sent to Backtrace. The interval is a value in ms. By default, session events are sent on application startup/finish, and every 30 minutes while the application is running. If the value is set to 0. The auto send mode is disabled. In this situation the application needs to maintain send mode manually. | On application startup/finish | <ul><li>- [ ] </li></ul> |
| `size`                 | Number  | Indicates how many events the metrics storage can store before auto submission.                                                                                                                                                                                                                                                                          | `50`                          | <ul><li>- [ ] </li></ul> |

#### Metrics Usage

```ts
// metrics will be undefined if not enabled
client.metrics?.send();
```

---

### Offline database support

The Backtrace Electron SDK can cache generated reports to local disk before sending them to Backtrace. This is
recommended; in certain configurations Electron applications can crash before the SDK finishes submitting data, and
under slow internet conditions your application might wait in a closing window until the HTTP submission finishes. In
this case, cached reports will be sent on next application launch.

With offline database support you can:

-   cache your reports when the user doesn't have an internet connection or the service is unavailable,
-   manually decide whether or not to send reports, and when.

Offline database support is disabled by default. To enable it, please add "enable: true" and the path to the directory
where Backtrace can store report data.

```ts
const client = BacktraceClient.initialize({
    // ignoring all but database config for simplicity
    database: {
        enable: true,
        path: '/path/to/the/database/directory',
        captureNativeCrashes: true,
    },
});

// manually send and keep the data on connection issue
client.database.send();
// manually send and remove all data no matter if received success or not.
client.database.flush();
```

#### Database Configuration

| Option Name               | Type    | Description                                                                                                                                                                  | Default | Required?                |
| ------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------ |
| `enabled`                 | Boolean | Enable/disable offline database support.                                                                                                                                     | false   | <ul><li>- [x] </li></ul> |
| `path`                    | String  | Local storage path for crash data.                                                                                                                                           | -       | <ul><li>- [x] </li></ul> |
| `createDatabaseDirectory` | Boolean | Allow the SDK to create the offline database directory.                                                                                                                      | true    |
| `autoSend`                | Boolean | Sends reports to the server based on the retry settings. If the value is set to 'false', you can use the Flush or Send methods as an alternative.                            | true    |
| `maximumNumberOfRecords`  | Number  | The maximum number of reports stored in the offline database. When the limit is reached, the oldest reports are removed. If the value is equal to '0', then no limit is set. | 8       |
| `retryInterval`           | Number  | The amount of time (in ms) to wait between retries if the database is unable to send a report.                                                                               | 60 000  |
| `maximumRetries`          | Number  | The maximum number of retries to attempt if the database is unable to send a report.                                                                                         | 3       |
| `captureNativeCrashes`    | Boolean | Capture and symbolicate stack traces for native crashes if the runtime supports this. A crash report is generated, stored locally, and uploaded upon next start.             | false   |

#### Native crash support

Backtrace Electron SDK can capture native crashes generated by a Electron application. In order to collect them, the SDK
uses the Electron's `crashReporter`.

Database records sent in the next session may not have some information about the crashing session such as attributes or
breadcrumbs. To reduce database record size, attachment support was limited only to file attachments.

#### Manual database operations

Database support is available in the client options with the BacktraceDatabase object. You can use it to manually
operate on database records.

## Advanced SDK Features

### BacktraceClient

BacktraceClient is the main SDK class. Error monitoring starts when this singleton object is instantiated, and it will
compose and send reports for unhandled errors and unhandled promise rejections. It can also be used to manually send
reports from exceptions and rejection handlers. Do not create more than one instance of this object.

#### BacktraceClientOptions

The following options are available for the BacktraceClientOptions passed when initializing the BacktraceClient.

| Option Name                         | Type                                                | Description                                                                                                                                                                                                                                                                                                                                                                                                        | Default | Required?                |
| ----------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ------------------------ |
| `url`                               | String                                              | Submission URL to send errors to                                                                                                                                                                                                                                                                                                                                                                                   |         | <ul><li>- [x] </li></ul> |
| `token`                             | String                                              | The submission token for error injestion. This is required only if submitting directly to a Backtrace URL. (uncommon)                                                                                                                                                                                                                                                                                              |         | <ul><li>- [ ] </li></ul> |
| `userAttributes`                    | Dictionary                                          | Additional attributes that can be filtered and aggregated against in the Backtrace UI.                                                                                                                                                                                                                                                                                                                             |         | <ul><li>- [ ] </li></ul> |
| `attachments`                       | BacktraceAttachment[]                               | Additional files to be sent with error reports. See [File Attachments](#file-attachments)                                                                                                                                                                                                                                                                                                                          |         | <ul><li>- [ ] </li></ul> |
| `beforeSend`                        | (data: BacktraceData) => BacktraceData \| undefined | Triggers an event every time an exception in the managed environment occurs, which allows you to skip the report (by returning a null value) or to modify data that library collected before sending the report. You can use the BeforeSend event to extend attributes or JSON object data based on data the application has at the time of exception. See [Modify/skip error reports](#modifyskip-error-reports)) |         | <ul><li>- [ ] </li></ul> |
| `skipReport`                        | (report: BacktraceReport) => boolean                | If you want to ignore specific types of error reports, we recommend that you use the skipReport callback. By using it, based on the data generated in the report, you can decide to filter the report, or send it to Backtrace.                                                                                                                                                                                    |         | <ul><li>- [ ] </li></ul> |
| `captureUnhandledErrors`            | Boolean                                             | Enable unhandled errors                                                                                                                                                                                                                                                                                                                                                                                            | `true`  | <ul><li>- [ ] </li></ul> |
| `captureUnhandledPromiseRejections` | Boolean                                             | Enable unhandled promise rejection                                                                                                                                                                                                                                                                                                                                                                                 | `true`  | <ul><li>- [ ] </li></ul> |
| `timeout`                           | Integer                                             | How long to wait in ms before timing out the connection                                                                                                                                                                                                                                                                                                                                                            | `15000` | <ul><li>- [ ] </li></ul> |
| `ignoreSslCertificate`              | Boolean                                             | Ignore SSL Certificate errors                                                                                                                                                                                                                                                                                                                                                                                      | `false` | <ul><li>- [ ] </li></ul> |
| `rateLimit`                         | Integer                                             | Limits the number of reports the client will send per minute. If set to '0', there is no limit. If set to a value greater than '0' and the value is reached, the client will not send any reports until the next minute.                                                                                                                                                                                           | `0`     | <ul><li>- [ ] </li></ul> |
| `metrics`                           | BacktraceMetricsOptions                             | See [Backtrace Stability Metrics](#application-stability-metrics)                                                                                                                                                                                                                                                                                                                                                  |         | <ul><li>- [ ] </li></ul> |
| `breadcrumbs`                       | BacktraceBreadcrumbsSettings                        | See [Backtrace Breadcrumbs](#breadcrumbs)                                                                                                                                                                                                                                                                                                                                                                          |         | <ul><li>- [ ] </li></ul> |
| `database`                          | BacktraceDatabaseSettings                           | See [Backtrace Database](#offline-database-support)                                                                                                                                                                                                                                                                                                                                                                |         | <ul><li>- [ ] </li></ul> |

### Manually send an error

There are several ways to send an error to Backtrace. For more details on the definition of `client.send()` see
[Methods](#methods) below.

```ts
// send as a string
await client.send('This is a string!');

// send as an Error
await client.send(new Error('This is an Error!'));

// as a BacktraceReport (string)
await client.send(new BacktraceReport('This is a report with a string!'));

// as a BacktraceReport (Error)
await client.send(new BacktraceReport(new Error('This is a report with a string!')));
```

### Modify/skip error reports

A BeforeSend event is triggered when an exception in the managed environment occurs to which you can attach a handler.
You can use the BeforeSend event to scrub PII, or extend attributes or JSON object data based on data your application
has at the time of exception. A report can be skipped sompletely by returning a null value.

```ts
const client = BacktraceClient.initialize({
    url: SUBMISSION_URL,
    beforeSend: (data: BacktraceData) => {
        // skip the report by returning a null from the callback
        if (!shouldSendReportToBacktrace(data)) {
            return undefined;
        }
        // apply custom attribute
        data.attributes['new-attribute"] = 'apply-data-in-callback';
        return data;
    },
});
```

### SDK Method Overrides

BacktraceClient.builder is used to override default BacktraceClient methods. File and http operation overrides, for
example, can be used to implement custom encryption for data at rest or in motion.

> Do not use these operations to modify the data objects. See [Modify/skip error reports](#modifyskip-error-reports) for
> the correct method to modify a report before sending it to Backtrace.

```ts
const client = BacktraceClient.builder(options)
    .useRequestHandler(requestHandler)
    .useBreadcrumbSubscriber(breadcrumbSubscriber)
    .addAttributeProvider(attributeProvider)
    .build();
```
