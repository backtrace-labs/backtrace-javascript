# **Backtrace React-Native SDK**

[Backtrace](https://backtrace.io) captures and reports handled and unhandled exceptions in your production software so
you can manage application quality through the complete product lifecycle.

The [@backtrace/react-native](https://www.npmjs.com/package/@backtrace/react-native) SDK connects your JavaScript
application to Backtrace. This README covers setup and configuration. Symbolication is covered in the
[React Native Integration Guide](https://docs.saucelabs.com/error-reporting/language-integrations/react-native/).

## Table of Contents

1. [Supported Versions](#supported-versions)
1. [Supported Platforms](#supported-platforms)
1. [Basic Integration - Reporting your first errors](#basic-integration)
    - [Install the Package](#install-the-package)
    - [Integrate the SDK](#integrate-the-sdk)
    - [Upload Source Maps](#upload-source-maps)
1. [Error Reporting Features](#error-reporting-features)
    - [Attributes](#attributes)
    - [File Attachments](#file-attachments)
    - [Breadcrumbs](#breadcrumbs)
    - [Application Stability Metrics](#application-stability-metrics)
        - [Metrics Configuration](#metrics-configuration)
        - [Metrics Usage](#metrics-usage)
    - [ANR Detection](#anr-detection)
    - [Offline Database Support](#offline-database-support)
        - [Database Configuration](#database-configuration)
        - [Native Crash Support](#native-crash-support)
        - [Manual Database Operations](#manual-database-operations)
1. [Advanced SDK Features](#advanced-sdk-features)
    - [`BacktraceClient` Options](#backtraceclient)
    - [Manually Send an Error](#manually-send-an-error)
    - [Modify/Skip Error Reports](#modifyskip-error-reports)
    - [Error Boundary](#error-boundary)
    - [SDK Method Overrides](#sdk-method-overrides)

## Supported Versions

-   React Native 0.72+, verified up to 0.87
-   React 18+
-   Hermes JavaScript engine (JavaScriptCore is not supported)
-   New Architecture and Legacy Architecture (React Native 0.82 and later are New Architecture only)

## Supported Platforms

-   iOS: minimum iOS version follows React Native (15.1 for React Native 0.76 and above).
-   Android: minimum SDK version follows React Native (24 for React Native 0.76 and above). Native crash capture on
    arm64-v8a, armeabi-v7a and x86_64.

## Basic Integration

### Install the Package

```
$ npm install @backtrace/react-native
```

On iOS, install the pods after adding the package:

```
$ cd ios
$ pod install
```

### Integrate the SDK

Add the following code at the top of `index.js`, before `AppRegistry.registerComponent`. The SDK starts before other
application code runs.

```js
// Import the BacktraceClient from @backtrace/react-native
import { BacktraceClient } from '@backtrace/react-native';

// Configure client options
const options = {
    // Submission url
    // <universe> is the subdomain of your Backtrace instance (<universe>.sp.backtrace.io)
    // <token> can be found in Project Settings/Submission tokens
    url: 'https://submit.backtrace.io/<universe>/<token>/json',
    database: {
        enable: true,
        captureNativeCrashes: true,
        createDatabaseDirectory: true,
        path: `${BacktraceClient.applicationDataPath}/backtrace`,
    },
};

// Initialize the client with the options
const client = BacktraceClient.initialize(options);

// By default, Backtrace will send an error for Uncaught Exceptions and Unhandled Promise Rejections

// Manually send an error
client.send(new Error('Something broke!'));
```

### Upload Source Maps

Client-side error reports are based on minified code. Upload source maps and source code to resolve minified code to
your original source identifiers. Source map symbolication applies to release builds. Debug builds run
unminified JavaScript from Metro and need no source maps.

For the full React Native setup (Metro serializer, Android gradle task, iOS build phase), see
[Upload source maps in the React Native Integration Guide](https://docs.saucelabs.com/error-reporting/language-integrations/react-native/#upload-source-maps).

## Error Reporting Features

### Attributes

Custom attributes are key-value pairs that can be added to your error reports. They are used in report aggregation,
sorting and filtering, can provide better contextual data for an error, and much more. See
[Indexing Attributes](https://docs.saucelabs.com/error-reporting/project-setup/attributes/) for how they are indexed and used across
Backtrace. By default, attributes such as application name and version are populated automatically. If Backtrace cannot find them, you need to provide them
manually via the `userAttributes` option.

Attributes can be added, modified or deleted in several places.

#### Attach an Attributes Object to BacktraceClient

It is possible to include an attributes object during [`BacktraceClient`](#backtraceclient) initialization. This list of
attributes will be included with every error report, referred to as global attributes.

```ts
// Attributes sent with every report. Change them at runtime with client.addAttribute
const attributes: Record<string, unknown> = {
    release: 'PROD',
};

// Client options
const options: BacktraceConfiguration = {
    url: 'https://submit.backtrace.io/<universe>/<token>/json',

    // Attach the attributes object
    userAttributes: attributes,
};

// Initialize the client
const client = BacktraceClient.initialize(options);
```

Attributes given as a function are evaluated each time a report is created:

```ts
import { AppState } from 'react-native';

// Client options
const options: BacktraceConfiguration = {
    url: 'https://submit.backtrace.io/<universe>/<token>/json',

    // Evaluated for every report
    userAttributes: () => ({
        'app.state': AppState.currentState,
    }),
};

// Initialize the client
const client = BacktraceClient.initialize(options);
```

#### Add Attributes During Application Runtime

Global attributes can also be set at runtime, for example after a user logs in.

```ts
const client = BacktraceClient.initialize(options);
...

client.addAttribute({
    "clientID": "de6faf4d-d5b5-486c-9789-318f58a14476"
})
```

A function passed to `addAttribute` is evaluated each time a report is created:

```ts
const client = BacktraceClient.initialize(options);
...

client.addAttribute(() => ({
    'session.uptime.seconds': Math.round(performance.now() / 1000),
}));
```

#### Add Attributes to an Error Report

The attributes list of a `BacktraceReport` object can be directly modified.

```ts
const report: BacktraceReport = new BacktraceReport('My error message', { myReportKey: 'myValue' });
report.attributes['myReportKey'] = 'New value';
```

---

### File Attachments

Files can be attached to every report through the client options or `client.addAttachment`, or to a single report
when it is created. See [File Attachments](https://docs.saucelabs.com/error-reporting/platform-integrations/file-attachments/).

```ts
import { BacktraceClient, BacktraceReport, BacktraceStringAttachment } from "@backtrace/react-native";

// BacktraceStringAttachment is for text content such as a log file
const stringAttachment = new BacktraceStringAttachment("logfile.txt", "This is the start of my log")

// Client options
const options = {
    url: "https://submit.backtrace.io/<universe>/<token>/json",

    // Attach the files to all reports
    attachments: [stringAttachment],
}

const client = BacktraceClient.initialize(options);

// Later decide to add another attachment to all reports
client.addAttachment(new BacktraceStringAttachment("session.txt", "Added after initialization"))

// After catching an exception and generating a report
try {
    throw new Error("Caught exception!")
} catch (error) {
    const report = new BacktraceReport(error as Error, {}, [
        new BacktraceStringAttachment("error-context.txt", "Only on this report"),
    ]);
    client.send(report);
}
```

JavaScript reports sent in the same session accept every attachment type. Native crash reports and reports sent on a
later launch include file attachments only. Use `BacktraceFileAttachment` for those:

```ts
import { BacktraceClient, BacktraceFileAttachment, ReactNativeFileSystem } from '@backtrace/react-native';

const logPath = `${BacktraceClient.applicationDataPath}/app.log`;
client.addAttachment(new BacktraceFileAttachment(new ReactNativeFileSystem(), logPath, 'app.log'));
```

---

### Breadcrumbs

Breadcrumbs are snippets of chronological data tracing runtime events. This SDK records a number of events by default,
and manual breadcrumbs can also be added.

See [Breadcrumbs in the web console](https://docs.saucelabs.com/error-reporting/web-console/debug/#breadcrumbs).

#### Breadcrumbs Configuration

| Option Name                      | Type                                                      | Description                                                                                                                                                    | Default   |
| -------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `enable`                         | Boolean                                                   | Enables breadcrumb collection.                                                                                                                                 | `true`    |
| `logLevel`                       | BreadcrumbLogLevel                                        | Bitmask of the log levels to include. Combine `BreadcrumbLogLevel` values with `\|`. A single value selects only that level.                                   | All Logs  |
| `eventType`                      | BreadcrumbType                                            | Bitmask of the breadcrumb types to include. Combine `BreadcrumbType` values with `\|`.                                                                         | All Types |
| `maximumBreadcrumbs`             | Number                                                    | Maximum number of breadcrumbs stored. With the offline database enabled, between half this many and this many are kept.                                        | `100`     |
| `maximumAttributesDepth`         | Number \| false                                           | Maximum depth of nested objects in breadcrumb attributes. `false` removes the limit.                                                                           | `2`       |
| `maximumBreadcrumbMessageLength` | Number \| false                                           | Maximum length of a breadcrumb message. `false` removes the limit.                                                                                             | `255`     |
| `maximumBreadcrumbSize`          | Number \| false                                           | Maximum size of a single breadcrumb in bytes. Larger breadcrumbs are dropped. `false` removes the limit.                                                       | `65536`   |
| `maximumTotalBreadcrumbsSize`    | Number \| false                                           | Maximum total size of stored breadcrumbs in bytes. With the offline database enabled, between half this size and this size is kept. `false` removes the limit. | `1048576` |
| `intercept`                      | (breadcrumb: RawBreadcrumb) => RawBreadcrumb \| undefined | Inspects and can modify each breadcrumb before it is stored. Return `undefined` to drop it.                                                                    |           |

```ts
import { BacktraceClient, BacktraceConfiguration } from '@backtrace/react-native';

// Client options
const options: BacktraceConfiguration = {
    url: SUBMISSION_URL,
    breadcrumbs: {
        // breadcrumbs configuration
    },
};

// Initialize the client
const client = BacktraceClient.initialize(options);
```

#### Default Breadcrumbs

| Type              | Description                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Console           | Adds a breadcrumb for every `console.log`, `console.warn`, `console.error`, `console.debug` and `console.trace` call. `console.info` and other methods are not recorded. |
| HTTP              | Adds a breadcrumb for every `fetch` and `XMLHttpRequest` request, with the method, the full URL and the status.                                                          |
| Application state | Adds a breadcrumb when the application becomes active or moves to the background, when it becomes inactive on iOS, and on blur and focus on Android.                     |
| Memory warning    | Adds a warning breadcrumb when iOS reports low memory. Not available on Android.                                                                                         |
| Dimension change  | Adds a breadcrumb when the window or screen size changes.                                                                                                                |
| Report            | Adds a breadcrumb with the message of each report passed to `send`, including reports that `skipReport` drops.                                                           |

#### Intercepting Breadcrumbs

If PII or other information needs to be filtered from a breadcrumb, you can use the intercept function to skip or filter
out the sensitive information. Any `RawBreadcrumb` returned will be used for the breadcrumb. If undefined is returned, no
breadcrumb will be added. HTTP breadcrumbs record the full request URL, query string included, and the SDK's own
submission requests carry the submission token in the URL.

#### Manual Breadcrumbs

In addition to all of the default breadcrumbs that are automatically collected, you can also manually add breadcrumbs of
your own.

```ts
client.breadcrumbs?.info('This is a manual breadcrumb.', {
    customAttr: 'value',
});
```

---

### Application Stability Metrics

The SDK can send application stability metrics, viewable in the Backtrace UI.

See [Stability Metrics](https://docs.saucelabs.com/error-reporting/project-setup/stability-metrics/).

#### Metrics Configuration

| Option Name            | Type    | Description                                                                                                                                                                                                                  | Default                       |
| ---------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `metricsSubmissionUrl` | String  | Metrics server hostname.                                                                                                                                                                                                     | `https://events.backtrace.io` |
| `enable`               | Boolean | Enables stability metrics.                                                                                                                                                                                                   | `true`                        |
| `autoSendInterval`     | Number  | Interval in ms between metrics submissions. Session events are sent at startup and then on this interval. Nothing is sent at exit. With `0`, events go out only from `client.metrics.send()` or when a queue reaches `size`. | `1800000`                     |
| `size`                 | Number  | Maximum events stored before automatic submission.                                                                                                                                                                           | `50`                          |

#### Metrics Usage

```ts
// metrics will be undefined if not enabled
client.metrics?.send();
```

---

### ANR Detection

The SDK can detect Application Not Responding (ANR) errors on Android, where the main thread stays blocked for longer
than a set time (default 5 seconds), and reports them as `Hang` errors. Two detection methods are available:

-   `BacktraceAnrType.Threshold` watches the main thread from a background thread and reports while the application is
    still hung. It works on all supported Android versions. The check runs once per `timeout` period, and a hang
    shorter than two periods can go unreported.
-   `BacktraceAnrType.ApplicationExit` reads the ANRs Android recorded for earlier runs of the application (Android 11,
    API 30, and above) and reports them on the next start. The thread dump Android captured is attached as
    `anr-stacktrace.txt`. Each ANR is reported once.

```ts
import { BacktraceAnrType, BacktraceConfiguration } from '@backtrace/react-native';

const options: BacktraceConfiguration = {
    url: SUBMISSION_URL,
    anr: {
        enable: true,
        type: BacktraceAnrType.Threshold,
    },
};
```

| Option Name                   | Type               | Description                                                                                                                         | Default     |
| ----------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `enable`                      | Boolean            | Enables ANR detection. Android only.                                                                                                | `false`     |
| `type`                        | `BacktraceAnrType` | Detection mechanism: `Threshold` or `ApplicationExit`.                                                                              | `Threshold` |
| `timeout`                     | Number             | Length in milliseconds of one main-thread check period. Applies to the `Threshold` type only.                                       | `5000`      |
| `disableWhenDebuggerAttached` | Boolean            | When true and a debugger is attached at initialization, detection stays off for that session. Applies to the `Threshold` type only. | `false`     |

---

### Offline Database Support

The Backtrace react-native SDK can cache generated reports and crashes to local disk before sending them to Backtrace.
Enabling it is recommended: an application can crash before the SDK finishes sending, and on a slow network a closing
application may not finish the upload. Cached reports are sent on the next launch.

With the offline database enabled, the SDK:

-   Keeps reports while the device is offline or the service is unavailable.
-   Captures crashes.
-   Lets you decide whether and when to send reports.

Offline database support is disabled by default. To enable it, set `enable: true` and the path to the directory where
Backtrace can store crash data. Set `createDatabaseDirectory: true` to let the SDK create the directory.

```ts
const client = BacktraceClient.initialize({
    url: SUBMISSION_URL,
    database: {
        enable: true,
        path: `${BacktraceClient.applicationDataPath}/path/to/dir`,
        createDatabaseDirectory: true,
        captureNativeCrashes: true,
    },
});
```

`BacktraceClient.applicationDataPath` returns a base path for the database directory:

-   Android: the files directory of the application context
-   iOS: the application cache directory

#### Database Configuration

| Option Name                        | Type    | Description                                                                                                                                                                                                      | Default |
| ---------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `enable`                           | Boolean | Enable/disable offline database support.                                                                                                                                                                         | `false` |
| `path`                             | String  | Required when the database is enabled. Local storage path for crash data.                                                                                                                                        |         |
| `createDatabaseDirectory`          | Boolean | Create the `path` directory when it does not exist. With `false`, the directory has to exist before `BacktraceClient.initialize` is called.                                                                      | `false` |
| `autoSend`                         | Boolean | Sends stored reports at startup and then every `retryInterval`. With `false`, stored reports wait for `client.database?.send()` or `client.database?.flush()`. New reports are still sent when they are created. | `true`  |
| `maximumNumberOfRecords`           | Number  | The maximum number of reports stored in the offline database. When the limit is reached, the oldest reports are removed. With `0`, stored reports from earlier sessions are deleted at startup.                  | `8`     |
| `retryInterval`                    | Number  | Time in ms between retries when sending stored reports fails.                                                                                                                                                    | `60000` |
| `maximumNumberOfAttachmentRecords` | Number  | The maximum number of attachments stored in the offline database. When the limit is reached, the oldest attachments are removed.                                                                                 | `10`    |
| `maximumRetries`                   | Number  | Send attempts per session. An attempt stops at the first report that fails. Reports that still fail are retried on the next launch.                                                                              | `3`     |
| `maximumOldSessions`               | Number  | The number of previous sessions whose files, such as breadcrumbs, are kept on disk.                                                                                                                              | `1`     |
| `captureNativeCrashes`             | Boolean | Capture crashes in the native layer. Requires `enable: true`. Android sends the report at crash time. iOS sends it on the next launch. See [Native Crash Support](#native-crash-support).                        | `false` |

#### Native Crash Support

The Backtrace React-Native SDK can capture crashes generated in the native layer. JavaScript code cannot observe them.
The SDK collects them with the native crash reporters bundled in the package.

The native crash reporter uploads attributes and file attachments with the report. Some details differ from
JavaScript reports:

-   Attributes provided as callbacks are not evaluated. Attribute values set at initialization or later with
    `addAttribute` are included.
-   In-memory attachments (`BacktraceStringAttachment`, `BacktraceUint8ArrayAttachment`) are not included. File
    attachments are.
-   Breadcrumbs recorded up to the moment of the crash are attached.
-   `beforeSend` and `skipReport` do not run for native crashes.
-   Uncaught Java exceptions and errors are sent before the process exits or on the next launch. iOS native crashes
    are sent on the next launch.
-   Android native (NDK) crashes are sent at crash time by a separate crash-handler process.
-   On iOS, the SDK also sends an `OOMException` report on the next launch when the previous session ended in the
    foreground without a crash. Debugger sessions and OS or application updates are excluded. A forced kill in the
    foreground is reported the same way.

#### Manual Database Operations

The `BacktraceDatabase` instance, available as `client.database`, sends or discards the stored reports on demand. Use it
when `autoSend` is disabled. `send()` stops at the first report that fails and keeps the rest for a later attempt.
`flush()` sends the reports, then removes all of them, sent or not. `client.database` is `undefined` while the offline
database is disabled.

```ts
client.database?.send();
client.database?.flush();
```

## Advanced SDK Features

### BacktraceClient

`BacktraceClient` is the main SDK class. Error monitoring starts when this singleton object is instantiated, and it will
compose and send reports for unhandled errors and unhandled promise rejections. It can also be used to manually send
reports from exceptions and rejection handlers. Do not create more than one instance of this object.

#### BacktraceClientOptions

Pass these options to `BacktraceClient.initialize`. Only `url` is required.

| Option Name                         | Type                                                         | Description                                                                                                                                                                                             | Default |
| ----------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `url`                               | String                                                       | Required. Submission URL to send errors to.                                                                                                                                                             |         |
| `token`                             | String                                                       | Submission token for error ingestion. Needed only when submitting directly to a Backtrace URL (uncommon). Native crash and iOS `OOMException` reports ignore it. For those, include the token in `url`. |         |
| `userAttributes`                    | `Record<string, unknown> \| (() => Record<string, unknown>)` | Additional attributes that can be filtered and aggregated against in the Backtrace UI. A function is evaluated for every report.                                                                        |         |
| `attachments`                       | BacktraceAttachment[]                                        | Additional files to be sent with error reports. See [File Attachments](#file-attachments)                                                                                                               |         |
| `beforeSend`                        | (data: BacktraceData) => BacktraceData \| undefined          | Runs before each JavaScript report is sent. Modify the report data, or return `undefined` to skip it. See [Modify/Skip Error Reports](#modifyskip-error-reports)                                        |         |
| `skipReport`                        | (report: BacktraceReport) => boolean                         | Runs for each JavaScript report. Return `true` to drop it.                                                                                                                                              |         |
| `captureUnhandledErrors`            | Boolean                                                      | Capture uncaught errors                                                                                                                                                                                 | `true`  |
| `captureUnhandledPromiseRejections` | Boolean                                                      | Capture unhandled promise rejections                                                                                                                                                                    | `true`  |
| `timeout`                           | Integer                                                      | Time in ms before a JavaScript report or metrics request times out. Native crash uploads do not use it.                                                                                                 | `15000` |
| `rateLimit`                         | Integer                                                      | Limits the number of reports the client sends in any 60-second window. If set to '0', there is no limit. Reports over the limit are dropped, not queued or stored.                                      | `0`     |
| `metrics`                           | BacktraceMetricsOptions                                      | See [Backtrace Stability Metrics](#application-stability-metrics)                                                                                                                                       |         |
| `breadcrumbs`                       | BacktraceBreadcrumbsSettings                                 | See [Backtrace Breadcrumbs](#breadcrumbs)                                                                                                                                                               |         |
| `database`                          | BacktraceDatabaseConfiguration                               | See [Backtrace Database](#offline-database-support)                                                                                                                                                     |         |
| `anr`                               | BacktraceAnrConfiguration                                    | See [ANR Detection](#anr-detection)                                                                                                                                                                     |         |
| `proguard`                          | BacktraceProguardConfiguration                               | See [Deobfuscate ProGuard and R8 Builds](https://docs.saucelabs.com/error-reporting/language-integrations/react-native/#deobfuscate-proguard-and-r8-builds)                                             |         |

### Manually Send an Error

There are several ways to send an error to Backtrace. For more details on the definition of `client.send()` see
methods below.

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

### Modify/Skip Error Reports

The `beforeSend` callback runs before every report is sent. Use it to scrub PII or to extend attributes with data the
application has at the time of the exception. Return `undefined` to skip the report.

```ts
const client = BacktraceClient.initialize({
    url: SUBMISSION_URL,
    beforeSend: (data: BacktraceData) => {
        // skip the report by returning undefined from the callback
        if (!shouldSendReportToBacktrace(data)) {
            return undefined;
        }
        // apply custom attribute
        data.attributes['new-attribute'] = 'apply-data-in-callback';
        return data;
    },
});
```

### Error Boundary

Render errors that no error boundary catches are reported as fatal unhandled exceptions. `ErrorBoundary` reports
the errors in its subtree and keeps the app running with a fallback. Initialize `BacktraceClient` before the boundary
renders, then wrap your component tree:

```tsx
import { ErrorBoundary } from '@backtrace/react-native';
import { Text } from 'react-native';

export default function App() {
    return (
        <ErrorBoundary name="app" fallback={<Text>Something went wrong.</Text>}>
            <MainScreen />
        </ErrorBoundary>
    );
}
```

The report includes the React component stack as a separate `component-stack` thread and sets the
`errorboundary.name` attribute (default `main`). `fallback` is an element, or a function that takes the error and
returns an element. Without a valid fallback, the boundary renders nothing after an error.

### SDK Method Overrides

`BacktraceClient.builder` is used to override default `BacktraceClient` methods. File and http operation overrides, for
example, can be used to implement custom encryption for data at rest or in motion.

> Do not use these operations to modify the data objects. See [Modify/skip error reports](#modifyskip-error-reports) for
> the correct method to modify a report before sending it to Backtrace.

```ts
import type { BacktraceAttributeProvider, BacktraceRequestHandler } from '@backtrace/sdk-core';

const client = BacktraceClient.builder(options)
    .useRequestHandler(requestHandler)
    .useBreadcrumbSubscriber(breadcrumbSubscriber)
    .addAttributeProvider(attributeProvider)
    .build();
```

The types come from `@backtrace/sdk-core`, a dependency of `@backtrace/react-native` (with pnpm, add it to your app's
dependencies).
