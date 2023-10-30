# @backtrace/rollup-plugin

If you're using rollup as your project bundler, you can use `@backtrace/rollup-plugin` to automate working with
sourcemaps.

[(Source Map feature documentation)](https://docs.saucelabs.com/error-reporting/platform-integrations/source-map/)

## Enable Source Maps for Your Application

Set `sourcemap` in `output` to `true` in your `rollup.config.js`:

```js
module.exports = {
    build: {
        sourcemap: true,
    },
};
```

If you're using code transpiler plugins (such as Typescript), ensure to enable source-mapping there as well.

## Set up `@backtrace/rollup-plugin`

### Construct an upload URL

A specific URL is required to upload source maps. Follow
[these instructions](https://docs.saucelabs.com/error-reporting/project-setup/submission-url/) to create an upload URL
for the `sourcemap` endpoint with a `symbol-post` token.

### Install `@backtrace/rollup-plugin` as a developer dependency:

```bash
> npm install --save-dev @backtrace/rollup-plugin
```

### Add it to your `plugins` array in `rollup.config.js`:

```js
import { BacktracePlugin } from '@backtrace/rollup-plugin';
// or
const { BacktracePlugin } = require('@backtrace/rollup-plugin');

module.exports = {
    // other configuration
    plugins: [
        new BacktracePlugin({
            // enable upload only on production builds
            uploadUrl: process.env.NODE_ENV === 'production' ? '<your upload URL>' : undefined,
        }),
    ],
};
```
