# **Backtrace Session Replay module**

[Backtrace](https://backtrace.io) captures and reports handled and unhandled exceptions in your production software so
you can manage application quality through the complete product lifecycle.

The [`@backtrace/session-replay`](#) module allows your browser application to record user experience before an error occurs. You can view then the recording in Backtrace alongside your error reports.

## Table of Contents

1. [Integration](#integration)
    - [Install the package](#install-the-package)
    - [Integrate the module](#integrate-the-module)
2. [Features](#features)
    - [Event limiting](#event-limiting)
    - [Sampling options](#sampling-options)
    - [Privacy options](#privacy-options)
3. [Advanced features](#advanced-features)

## Integration

`@backtrace/session-replay` can be integrated with any Backtrace SDK that derives from the `@backtrace/browser` SDK.

### Install the package

```
$ npm install @backtrace/session-replay
```

### Integrate the module

To add the session replay integration, add the following code to the builder:

```ts
import { BacktraceClient, BacktraceConfiguration } from '@backtrace/browser';
import { BacktraceSessionReplayModule } from '@backtrace/session-replay';

// Configure client options
const options: BacktraceConfiguration = {
    // Name of the website/application
    name: 'MyWebPage',
    // Version of the website
    version: '1.2.3',
    // Submission url
    // <universe> is the subdomain of your Backtrace instance (<universe>.backtrace.io)
    // <token> can be found in Project Settings/Submission tokens
    url: 'https://submit.backtrace.io/<universe>/<token>/json',
};

// Initialize the client with the options
// Make sure to add `useModule` with `BacktraceSessionReplayModule`
const client = BacktraceClient.builder(options)
    .useModule(
        new BacktraceSessionReplayModule({
            maxEventCount: 100,
        }),
    )
    .build();
```

## Features

### Event limiting

You can configure max number of events, that will be sent with the report, using `maxEventCount` option:

```ts
new BacktraceSessionReplayModule({
    maxEventCount: 100,
});
```

By default, the event count will be set to 100. To disable max event limit, set `disableMaxEventCount` to `true`. **Note:** disabling the max event count is not recommended and may lead to large reports.

### Sampling options

You can control how events will be captured and sent with the report.

```ts
new BacktraceSessionReplayModule({
    sampling: {
        input: 'last',
    },
});
```

| Option             | Values                                    | Default     | Description                                                                                                                                                       |
| ------------------ | ----------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mousemove`        | `boolean`/`number`                        | `true`      | Controls whether mouse movement is recorded, or the interval of mouse movement events in milliseconds (i.e. will not capture more than one event every set time). |
| `mouseInteraction` | `boolean`/`{[MOUSE_INTERACTION]:boolean}` | `true`      | Controls all or specific [mouse interactions](#mouse-interactions).                                                                                               |
| `scroll`           | `number`                                  | `undefined` | Interval of scrolling events in milliseconds (i.e. will not capture more than one event every set time).                                                          |
| `media`            | `number`                                  | `undefined` | Interval of media events in milliseconds (i.e. will not capture more than one event every set time).                                                              |
| `input`            | `'all'`/ `'last'`                         | `'all'`     | Capture either `all` or `last` input events. When set to `last`, only final input will be captured.                                                               |

#### Mouse interactions

-   `MouseUp`
-   `MouseDown`
-   `Click`
-   `ContextMenu`
-   `DblClick`
-   `Focus`
-   `Blur`
-   `TouchStart`
-   `TouchMove_Departed`
-   `TouchEnd`
-   `TouchCancel`

### Privacy options

You can control how information is sent to Backtrace. Use this to mask PII.

For example, if you want to hide all HTML elements that have the `do-not-send` class:

```ts
new BacktraceSessionReplayModule({
    privacy: {
        blockClass: 'do-not-send',
    },
});
```

| Option                | Values                                             | Default              | Description                                                                                                                 |
| --------------------- | -------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `blockClass`          | `string`/`RegExp`                                  | `'bt-block'`         | Blocks elements with this class.                                                                                            |
| `blockSelector`       | `string`                                           | `undefined`          | Blocks elements matching this selector.                                                                                     |
| `ignoreClass`         | `string`                                           | `'bt-ignore'`        | Ignores elements with this class.                                                                                           |
| `ignoreSelector`      | `string`                                           | `undefined`          | Ignores elements matching this selector.                                                                                    |
| `ignoreCSSAttributes` | `string[]`                                         | `[]`                 | Set of CSS attributes that should be ignored.                                                                               |
| `maskTextClass`       | `string`/`RegExp`                                  | `'bt-mask'`          | Masks elements with this class.                                                                                             |
| `unmaskTextClass`     | `string`/`RegExp`                                  | `'bt-unmask'`        | Unmasks elements with this class.                                                                                           |
| `maskTextSelector`    | `string`                                           | `undefined`          | Masks elements matching this selector.                                                                                      |
| `unmaskTextSelector`  | `string`                                           | `undefined`          | Unmasks elements matching this selector.                                                                                    |
| `maskAllText`         | `boolean`                                          | `true`               | If `true`, will mask all text. Use `unmaskTextClass` or `unmaskTextSelector` to unmask.                                     |
| `maskAllInputs`       | `boolean`                                          | `true`               | If `true`, will mask all inputs.                                                                                            |
| `maskInputOptions`    | `{[INPUT_TYPE]:boolean}`                           | `{ password: true }` | Mask specific [kinds of inputs](#input-types).                                                                              |
| `maskInputFn`         | `(text: string, element: HTMLElement) => string)`  | mask with asterisks  | Callback to customize input masking. Returned string will be used in masked input.                                          |
| `maskTextFn`          | `(text: string, element?: HTMLElement) => string)` | mask with asterisks  | Callback to customize text masking. Returned string will be used in masked text.                                            |
| `inspect`             | `(event: eventWithTime) => eventWithTime?`         | include all events   | Callback to inspect the added event. You must return an event for it to be included. Return `undefined` to skip this event. |

#### Input types

-   `color`
-   `date`
-   `datetime-local`
-   `email`
-   `month`
-   `number`
-   `range`
-   `search`
-   `tel`
-   `text`
-   `time`
-   `url`
-   `week`
-   `textarea`
-   `select`
-   `password`

## Advanced features

`@backtrace/session-replay` is based on `rrweb`. You can use `advancedOptions` to pass options directly to `rrweb`:

```ts
new BacktraceSessionReplayModule({
    advancedOptions: {
        checkoutEveryNms: 10000,
    },
});
```

See [`rrweb` guide](https://github.com/rrweb-io/rrweb/blob/master/guide.md) for more details.
