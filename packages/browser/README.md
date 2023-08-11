# **Backtrace Browser**
[Backtrace](https://backtrace.io) captures and reports handled and unhandled exceptions in your production software so you can manage application quality through the complete product lifecycle.

The [@backtrace/browser](#) SDK connects your JavaScript application to Backtrace. The basic integration is quick and easy, after which you can explore the rich set of Backtrace features.

## Table of Contents
1. [Basic Integration - Reporting your first errors](#basic-integration)
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
    // <universe> is the subdomain of your Backtrace instance (<universe>.backtrace.io)
    // <token> can be found in Project Settings/Submission tokens
    url: "https://submit.backtrace.io/<universe>/<token>/json",
}

// Initialize the client
const client = BacktraceClient.builder(options).build();

// Send an error
client.send(new Error("Something broke!"));
```

## Error Reporting Features
### Attributes

Custom attributes are key-value pairs that can be added to your error reports. They are used in report aggregation, sorting and filtering, can provide better contextual data for an error, and much more. They are foundational to many of the advanced Backtrace features detailed in [Error Reporting documentation](https://docs.saucelabs.com/error-reporting/getting-started/).

There are several places where attributes can be added, modified or deleted.

#### Attach attributes object to BacktraceClient
It is possible to include an attributes object during [BacktraceClient](#backtraceclient) initialization. This list of attributes will be included with every error report, referred to as global attributes.
```ts
// Create an attributes object that can be modified throughout runtime
const attributes: Record<string, unknown> = {
    "release": "PROD",
}

// BacktraceClientOptions
const options: BacktraceConfiguration = {
    name: "MyWebPage",
    version: "1.2.3",  
    url: "https://submit.backtrace.io/<universe>/<token>/json",

    // Attach the attributes object
    userAttributes: attributes,
}

// Initialize the client
const client = BacktraceClient.builder(options).build();
```

#### Add attributes during application runtime
Global attributes can be set during the runtime once specific data has be loaded (e.g. a user has logged in).
```ts
const client = BacktraceClient.builder(options).build();
...

client.addAttribute({
    "clientID": "de6faf4d-d5b5-486c-9789-318f58a14476"
})
```

#### Add attributes to an error report
The attributes list of a BacktraceReport object can be directly modified.

```ts
const report: BacktraceReport = new BacktraceReport("My error message", { "myReportKey": "myValue" });
report.attributes["myReportKey"] = "New value";
```
***
### File Attachments

Files can be attached to error reports. This can be done when initalizing the BacktraceClient, updating the BacktraceClient, or  dynamically for specific reports.  When including attachments in BacktraceClient, all files will be uploaded with each report.

```ts
// Import attachment types from @backtrace/browser
import { BacktraceStringAttachment, BacktraceUint8ArrayAttachment  } from "@backtrace/browser";

// BacktraceStringAttachment should be used for text object like a log file, for example
const attachment1 = new BacktraceStringAttachment("logfile.txt", "This is the start of my log")

// BacktraceUint8ArrayAttachment should be used for binary files
const attachment2 = new BacktraceUint8ArrayAttachment("connection_buffer", new Uint8Array(2));

// Setup array of files to attach
const attachments = [attachment1];

// BacktraceClientOptions
const options = {
    name: "MyWebPage",
    version: "1.2.3",  
    url: "https://submit.backtrace.io/<universe>/<token>/json",
    
    // Attach the files to all reports
    attachments,
}

// Later decide to add an attachment to all reports
client.attachments.push(attachment2)

// After catching an exception and generating a report
try {
    throw new Error("Caught exception!")
} catch (error) {
    const report = const report = new BacktraceReport(error, {}, [new BacktraceStringAttachment("CaughtErrorLog", "some error logging data here")])
    client.send(report);
}
```
***

### Breadcrumbs
Breadcrumbs are snippets of chronological data tracing runtime events. This SDK records a number of events by default, and manual breadcrumbs can also be added.

[(Breadcrumbs feature documentation)](https://docs.saucelabs.com/error-reporting/web-console/debug/#breadcrumbs)
***

### Application Stability Metrics
The Backtrace Browser SDK has the ability to send usage Metrics to be viewable in the Backtrace UI. See [BacktraceMetrics](#backtracemetrics) below to configure a metrics object during initialization to track additional metrics data.

[(Stability Metrics feature documentation)](https://docs.saucelabs.com/error-reporting/project-setup/stability-metrics/)

***
### Soure Map Support


## Advanced SDK Features

### BacktraceClient
BacktraceClient is the main SDK class. Error monitoring starts when this object is instantiated, and it will compose and send reports for unhandled errors and unhandled promise rejections. It can also be used to manually send reports from exceptions and rejection handlers.

#### BacktraceClientOptions

The following options are available for the BacktraceClientOptions passed when initializing the BacktraceClient. 

| Option Name | Type | Description | Default | Required? |
|-|-|-|-|-|
| `url` | String | Submission URL to send errors to | | <ul><li>- [x] </li></ul> |
| `name` | String | Your application name | | <ul><li>- [x] </li></ul> |
| `version` | String | Your application version | | <ul><li>- [x] </li></ul> |
| `token` | String | The submission token for error injestion.  This is required only if submitting directly to a Backtrace URL. (uncommon)| | <ul><li>- [ ] </li></ul> |
| `userAttributes` | Dictionary | Additional attributes that can be filtered and aggregated against in the Backtrace UI.  | | <ul><li>- [ ] </li></ul> |
| `attachments` | BacktraceAttachment[] | Additional files to be sent with error reports.  See [File Attachments](#file-attachments) | | <ul><li>- [ ] </li></ul> |
| `beforeSend` | Callback | Allows for modification of the report before sending it.  See [BeforeSend](#beforesend) | | <ul><li>- [ ] </li></ul> |
| `filterReport` | Callback | Allows for filtering of reports.  See [FilterReport](#filterreport) | <ul><li>- [ ] </li></ul> |
| `captureUnhandledErrors` | Boolean | Enable unhandled errors | `true` | <ul><li>- [ ] </li></ul> |
| `captureUnhandledPromiseRejections` | Boolean | Enable unhandled promise rejection | `true` | <ul><li>- [ ] </li></ul> |
| `timeout` | Integer | How long to wait in ms before timing out the connection | `15000` | <ul><li>- [ ] </li></ul> |
| `ignoreSslCertificate` | Boolean | Ignore SSL Certificate errors | `false` | <ul><li>- [ ] </li></ul> |
| `rateLimit` | Integer | Limits the number of reports the client will send per minute. If set to '0', there is no limit. If set to a value greater than '0' and the value is reached, the client will not send any reports until the next minute. | `0` | <ul><li>- [ ] </li></ul> |
| `metrics` | BacktraceMetricsOptions | See [Backtrace Metrics](#backtrace-metrics) | | <ul><li>- [ ] </li></ul> |
| `database` | BacktraceDatabaseOptions | See [Backtrace Database](#backtrace-database) | |<ul><li>- [ ] </li></ul> |

#### Methods

| Name | Return Type | Description |
| - | - | - |
| `addAttribute(attributes: Record<string, unknown>)` | void | Add attributes to the BacktraceClient reports |
| `builder(options: BacktraceClientOptions).build()` | BacktraceClient | Sets up a new BacktraceClient for reporting|

### BacktraceDatabase

### BacktraceMetrics

### BacktraceReport

### Callbacks

#### BeforeSend
Use BeforeSend to modify an error report. BeforeSend will be called at the last possible point in which the BacktraceReport can be modified (attributes added or deleted, additonal attachments added).  The BacktraceReport returned from this function will be the error report sent. If a null is returned the report will be skipped.

#### FilterReport