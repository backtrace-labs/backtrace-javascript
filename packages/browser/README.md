# Backtrace Browser
Backtrace error reporting tool for browser side JavaScript

## Table of Contents
1. [Basic Integration - Getting Your First Errors](#basic-integration)
1. [Error Reporting Features](#error-reporting-features)
    - [Attributes](#attributes)
    - [File Attachments](#file-attachments)
    - [Breadcrumbs](#breadcrumbs)
    - [Application Stability Metrics](#application-stability-metrics)
1. [Advanced SDK Features](#advanced-sdk-features)
    - [BacktraceClient](#backtraceclient)
    - [BacktraceDatabase](#backtracedatabase)
    - [BacktraceMetrics](#backtracemetrics)
    - [Callbacks](#callbacks)
        - [BeforeSend](#beforesend)
        - [FilterReport](#filterreport)
## Basic Integration
All code examples are given in TypeScript.
```ts
// Import the BacktraceClient from @backtrace/browser with your favoriate package manager.
import { BacktraceClient, BacktraceConfiguration } from "@backtrace/browser";

// BacktraceClientOptions
const options: BacktraceConfiguration = {
    // Name of the website/application
    name: "MyWebPage",
    // Version of the website
    version: "1.2.3",  
    // Submission url
    url: "https://submit.backtrace.io/<universe>/<token>/json",
}

// Initialize the client
const client = BacktraceClient.builder(options).build();

// When an error occurs
client.send(new Error("Something broke!"));
```

## Error Reporting Features
### Attributes
Error reports have the ability to contain additional contextual data in them, called attributes.  These are passed as key/value pairs and can be parsed by the Backtrace server to allow for aggrigation or filtering.  For information on setting up the attributes for indexing on the Backtrace server [see here](https://docs.saucelabs.com/error-reporting/project-setup/attributes/).

There are several places that attributes can be modified, deleted, or added.

#### During BacktraceClient Initialization
It is possible to set attributes during the [BacktraceClient](#backtraceclient) initialization with the `userAttributes` configuration option.  Doing so will send that list attributes along with every report, refered to as global attributes.
```ts
const attributes: Record<string, unknown> = {
    "release": "PROD",
}

// BacktraceClientOptions
const options: BacktraceConfiguration = {
    // Name of the website/application
    name: "MyWebPage",
    // Version of the website
    version: "1.2.3",  
    // Submission url
    url: "https://submit.backtrace.io/<universe>/<token>/json",
    userAttributes: attributes,
}

// Initialize the client
const client = BacktraceClient.builder(options).build();
```

#### During Runtime
Global attributes can also be set during the runtime once specific data has be loaded (e.g. a user has logged in).
```ts
client.addAttribute({
    "clientID": "de6faf4d-d5b5-486c-9789-318f58a14476"
})
```

#### Situationally in the BacktraceData or BacktraceReport
When a BacktraceReport object is provided the attributes list can be directly modified.

```ts
const report: BacktraceReport = new BacktraceReport("My error message");
report.attributes["myKey"] = "myValue";
```

### File Attachments
***
Backtrace has several ways in which files can be attached: when initalizing the BacktraceClient, updating the BacktraceClient, or  dynamically for specific reports.  When specifing attachments to the BacktraceClient, all files will be uploaded with each report.

```js
// Import the attachment types from @backtrace/browser with your favoriate package manager.
import { BacktraceUint8ArrayAttachment, BacktraceStringAttachment  } from "@backtrace/browser";

// BacktraceStringAttachment should be used for text object like a log file for instance
const attachment1 = new BacktraceStringAttachment("logfile.txt", "This is the start of my log")

// BacktraceUint8ArrayAttachment should be used for binary files
const attachment2 = new BacktraceUint8ArrayAttachment("output.dmp", new Uint8Array(2));

// Setup array of files to attach
const attachments = [attachment1];

// BacktraceClientOptions
const options = {
    // Name of the website/application
    name: "MyWebPage",
    // Version of the website
    version: "1.2.3",  
    // Submission url
    url: "https://submit.backtrace.io/<universe>/<token>/json",
    // Attach the files to all reports
    attachments: attachments
}

// Later decide to add an attachment to all reports
client.attachments.push(attachment2)

// After catching an exception and generating a report
try {
    throw new Error("Caught exception!")
} catch (error) {
    const report = new BacktraceReport(error);
    const attachment3 = new BacktraceStringAttachment("CaughtErrorLog", "some error logging data here");
    report.attachments.push(attachment3);
    client.send(report);
}
```

### Breadcrumbs
Feature in developement

### Application Stability Metrics

## Advanced SDK Features

### BacktraceClient
The BacktraceClient class will take care of automatically sending unhandled errors and unhandled promise rejections.  It can also be used to send trapped exceptions & rejections.

#### Properties
| Name | Type | Description |
| - | - | - |
| `agent` | string | Backtrace SDK name |

#### Methods

| Name | Return Type | Description |
| - | - | - |
| `addAttribute(attributes: Record<string, unknown>)` | void | Add attributes to the BacktraceClient reports |
| `builder(options: BacktraceClientOptions).build()` | BacktraceClient | Sets up a new BacktraceClient for reporting|

##### BacktraceClientOptions

The following options are available for the BacktraceClientOptions passed when initializing the BacktraceClient. 

| Option Name | Type | Description | Default | Required? |
|-|-|-|-|-|
| `url` | String | Submission URL to send errors to | | <ul><li>- [x] </li></ul> |
| `name` | String | Application name | | <ul><li>- [x] </li></ul> |
| `version` | String | Application version | | <ul><li>- [x] </li></ul> |
| `captureUnhandledErrors` | Boolean | Enable unhandled errors | `true` | <ul><li>- [ ] </li></ul> |
| `captureUnhandledPromiseRejections` | Boolean | Enable unhandled promise rejection | `true` | <ul><li>- [ ] </li></ul> |
| `token` | String | The submission token for error injestion.  This is required only if submitting directly to a Backtrace URL.| | <ul><li>- [ ] </li></ul> |
| `timeout` | Integer | How long to wait in ms before timing out the connection | `15000` | <ul><li>- [ ] </li></ul> |
| `ignoreSslCertificate` | Boolean | Ignore SSL Certificate errors | `false` | <ul><li>- [ ] </li></ul> |
| `rateLimit` | Integer | Limits the number of reports the client will send per minute. If set to '0', there is no limit. If set to a value greater than '0' and the value is reached, the client will not send any reports until the next minute. |  | <ul><li>- [ ] </li></ul> |
| `userAttributes` | Dictionary | Additional data that can be filtered and aggregated against in the Backtrace UI  | | <ul><li>- [ ] </li></ul> |
| `attachments` | BacktraceAttachment[] | Additional files that can be sent with error to Backtrace.  See [Attaching Files](#attaching-files) | | <ul><li>- [ ] </li></ul> |
| `metrics` | BacktraceMetricsOptions | See [Backtrace Metrics](#backtrace-metrics) | | <ul><li>- [ ] </li></ul> |
| `database` | BacktraceDatabaseOptions | See [Backtrace Database](#backtrace-database) | |<ul><li>- [ ] </li></ul> |

### BacktraceDatabase

### BacktraceMetrics

### Callbacks

#### BeforeSend

#### FilterReport