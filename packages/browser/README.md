# Backtrace Browser
Backtrace error reporting tool for browser side JavaScript
 
## Table of Contents
1. [Integration Example](#integration-example)
1. [Features](#features)
    - [File Attachments](#file_attachments)
    - [Metrics](#metrics)
    - [Breadcrumbs](#breadcrumbs)

## Integration Example
```js
// Import the BacktraceClient from @backtrace/browser with your favoriate package manager.
import { BacktraceClient } from "@backtrace/browser";

// BacktraceClientOptions
const options = {
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
## Features

### File Attachments
***
Backtrace has several ways in which files can be attached: when initalizing the BacktraceClient, updating the BacktraceClient, or  dynamically for specific reports.  When specifing attachments to the BacktraceClient, all files will be uploaded with each report.

```js
// Import the attachment types from @backtrace/browser with your favoriate package manager.
import { BacktraceUint8ArrayAttachment, BacktraceStringAttachment  } from "@backtrace/browser";

// BacktraceStringAttachment should be used for text object like a log file for instance
var attachment1 = new BacktraceStringAttachment("logfile.txt", "This is the start of my log")

// BacktraceUint8ArrayAttachment should be used for binary files
var attachment2 = new BacktraceUint8ArrayAttachment("output.dmp", new Uint8Array(2));

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

### Metrics
Backtrace Metrics tracks unique application launches and unique identifiers (default: guid) and submits them to Backtrace.  This allows for overview in the Backtrace web console of how many errors occur compared to all active users for a given platform, version, and more to be seen.

Backtrace Metrics is enabled by default.  The following options can be passed to the `metrics` [BacktraceClientOptions](#backtraceclientoptions) item.

| Option Name | Type | Description | Default |
|-|-|-|-|
|`metricsSubmissionUrl`|String|Metrics server hostname|`https://events.backtrace.io`|
|`enable`|Boolean|Determines if the metrics support is enabled|`true`|
|`autoSendInterval`|Integer|Indicates how often crash free metrics are sent to Backtrace. The interval is a value in ms. The default is 30 minutes|`1800000`|
|`size`|Integer|Indicates how many events the metrics storage can store before auto submission|`50`|

### Breadcrumbs
Feature in developement

### Callback Methods
The Backtrace Browser has several callback methods that allow you to modify the reports
#### BeforeSend
Triggers an event every time an exception in the managed environment occurs, which allows you to skip the report (by returning a null value) or to modify data that library collected before sending the report. You can use the BeforeSend event to extend attributes or JSON object data based on data the application has at the time of exception or remove the same.

```js
import { BacktraceClient, BacktraceConfiguration, BacktraceData } from "@backtrace/browser";

function myBeforeSend(data: BacktraceData): BacktraceData {
    data.attributes.MyMessage = "Attribute testing!";
    for(let key in data.attributes) {
        console.log(`Key is: ${key} and value is ${data.attributes[key]}`);
    }
    return data;
}

const test: BacktraceConfiguration = {
    name: "blah",
    version: "1.2.3",
    url: "https://submit.backtrace.io/<universe>/<token>/json",
    beforeSend: myBeforeSend
}
```
#### SkipReport
If you want to ignore specific types of error reports, we recommend that you use the skipReport callback. By using it, based on the data generated in the report, you can decide to filter the report, or send it to Backtrace.

```js
import { BacktraceClient, BacktraceConfiguration, BacktraceData } from "@backtrace/browser";

function mySkipReport(data: BacktraceData): boolean {
    if ("specialKey" in data.attributes) {
        return true // Don't send the report
    }
    return false // Send the report
}

const test: BacktraceConfiguration = {
    name: "blah",
    version: "1.2.3",
    url: "https://submit.backtrace.io/<universe>/<token>/json",
    skipReport: mySkipReport
}
```

## Documentation

### BacktraceClient
***
The BacktraceClient class will take care of automatically sending unhandled errors and unhandled promise rejections.  It can also be used to send trapped exceptions & rejections.

#### Methods

##### builder(BacktraceClientOptions)

Configures the BacktraceClient builder with the provided [BacktraceClientOptions](#backtraceclientoptions).  In order to output and intialize a BacktraceClient the `build()` function must be called.

#### Configuration Options
##### BacktraceClientOptions

The following options are available for the BacktraceClientOptions passed when initializing the BacktraceClient. 

| Option Name | Type | Description | Default | Required? |
|-|-|-|-|-|
| `url` | String | Submission URL to send errors to | | <ul><li>[x]</li></ul> |
| `name` | String | Application name | | <ul><li>[x]</li></ul> |
| `version` | String | Application version | | <ul><li>[x]</li></ul> |
| `captureUnhandledErrors` | Boolean | Enable unhandled errors | `true` | <ul><li>[ ]</li></ul> |
| `captureUnhandledPromiseRejections` | Boolean | Enable unhandled promise rejection | `true` | <ul><li>[ ]</li></ul> |
| `token` | String | The submission token for error injestion.  This is required only if submitting directly to a Backtrace URL.| | <ul><li>[ ]</li></ul> |
| `timeout` | Integer | How long to wait in ms before timing out the connection | `15000` | <ul><li>[ ]</li></ul> |
| `ignoreSslCertificate` | Boolean | Ignore SSL Certificate errors | `false` | <ul><li>[ ]</li></ul> |
| `rateLimit` | Integer | Limits the number of reports the client will send per minute. If set to '0', there is no limit. If set to a value greater than '0' and the value is reached, the client will not send any reports until the next minute. |  | <ul><li>[ ]</li></ul> |
| `userAttributes` | Dictionary | Additional data that can be filtered and aggregated against in the Backtrace UI  | | <ul><li>[ ]</li></ul> |
| `attachments` | BacktraceAttachment[] | Additional files that can be sent with error to Backtrace.  See [Attaching Files](#attaching-files) | | <ul><li>[ ]</li></ul> |
| `metrics` | BacktraceMetricsOptions | See [Backtrace Metrics](#backtrace-metrics) | | <ul><li>[ ]</li></ul> |
| `database` | BacktraceDatabaseOptions | See [Backtrace Database](#backtrace-database) | |<ul><li>[ ]</li></ul> |

##



