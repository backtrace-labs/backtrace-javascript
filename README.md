<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./slbt.light.png" width="640">
    <source media="(prefers-color-scheme: light)" srcset="./slbt.dark.png" width="640">
    <img src="./slbt.light.png">
  </picture>
</div>

# Sauce Labs Web SDK

Backtrace's first-class support for JavaScript platforms offers a robust solution for error monitoring and debugging in
production web applications, ultimately improving the quality and reliability of your software.

## Supported JavaScript frameworks

The @backtrace/browser is suitable for all JavaScript frameworks. Additional integrations are provided to take advantage
of the capabilities of different frameworks.

-   [@backtrace/browser](https://github.com/backtrace-labs/backtrace-javascript/tree/dev/packages/browser)
-   [@backtrace/react](https://github.com/backtrace-labs/backtrace-javascript/tree/dev/packages/react)
-   [@backtrace/node](https://github.com/backtrace-labs/backtrace-javascript/tree/dev/packages/node)
-   [@backtrace/nestjs](https://github.com/backtrace-labs/backtrace-javascript/tree/dev/packages/nestjs)
-   [@backtrace/electron](https://github.com/backtrace-labs/backtrace-javascript/tree/dev/packages/electron)

## Web SDK Features

Backtrace is an advanced Error Reporting service, with industry-leading features to correlate, explore, manage and
resolve production issues. The Backtrace Web SDK directly connects your applications to those advanced features. These
SDKs specifically provide the following:

<table>
<tr>
<td>Source map support</td>
<td>Source maps can be used to convert minified/transpiled production code into the original source code so error data can contain functions, line numbers, and more. In addition, the report can  show the failing function in the your source code.</td>
</tr>
<tr>
<td>Advanced breadcrumbs</td>
<td>You can include helpful breadcrumbs for tracing application flow. Backtrace will also include useful default breadcrumbs for browsers, like http requests, navigation changes, and more.</td>
</tr>
<tr>
<td>PII/Data management</td>
<td>Error reports can be scrubbed for PII and otherwise altered before submission.</td>
</tr>
<td>Attachment support</td>
<td>File attachments can be added to error submissions.</td>
</tr>
<tr>
<td>Default and dynamic attributes</td>
<td>The SDK provides accurate information about the browser and OS by default, including additional attributes specific to each Javascript framework.

You can also add dynamic attributes resolved every time when the library generates a report.</td>

</tr>
<tr>
<td>Application Stability Metrics</td>
<td>Backtrace SDKs have built in functionality to generate application session and stability metrics like “Error free sessions” in the Backtrace web console.</td>
</tr>
<tr>
<td>(Node) Persistent crash data</td>
<td>Error data is stored locally when access to the internet is disrupted or the application is not able to send data.  Data will be sent on restart.</td>
</tr>
<tr>
<td>(Node) Crash and Out of Memory (OOM) detection</td>
<td>The Node SDK can submit crash data and out of memory exceptions.</td>
</tr>
<tr>
<td>(React) Redux support</td>
<td>Backtrace will capture redux actions and states in our breadcrumb system. This allows for tracing the user journey when debugging an error.</td>
</tr>
<tr>
<td>(React) Error Boundary support</td>
<td>The error boundary component can capture the error and provide options to render a fallback component.</td>
</tr>
<tr>
<td>Build system plugins</td>
<td>Webpack, Vite and Rollup plugins are provided to support Backtrace integration with common build systems of JavaScript projects. The Backtrace plugins allow:
<ul>
<li>Generation and upload of multiple source maps to Backtrace.</li>
<li>Multiple source maps per application.</li>
<li>Source content to be included in source maps, simplifying source integration.</li>
</td>
</tr>
</table>
