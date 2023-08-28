# @backtrace-labs/vite-plugin
If you're using Vite as your project bundler, you can use `@backtrace-labs/vite-plugin` to automate working with sourcemaps.

[(Source Map feature documentation)](https://docs.saucelabs.com/error-reporting/platform-integrations/source-map/)

## Enable Source Maps for Your Application

Set `sourcemap` in `output` to `true` in your `vite.config.js`:

```js
module.exports = {
  build: {
    sourcemap: true
  }
}
```

If you're using code transpiler plugins (such as Typescript), ensure to enable source-mapping there as well.

## Set up `@backtrace-labs/vite-plugin`

### Construct an upload URL

A specific URL is required to upload source maps. Follow [these instructions](https://docs.saucelabs.com/error-reporting/project-setup/submission-url/) to create an upload URL for the `sourcemap` endpoint with a `symbol-post` token.

### Install `@backtrace-labs/vite-plugin` as a developer dependency:

```bash
> npm install --save-dev @backtrace-labs/vite-plugin
```

### Add it to your `plugins` array in `vite.config.js`:

```js
import { BacktracePlugin } from '@backtrace-labs/vite-plugin';
// or
const { BacktracePlugin } = require('@backtrace-labs/vite-plugin');

module.exports = {
  // other configuration
  plugins: [new BacktracePlugin({
    // enable upload only on production builds
    uploadUrl: process.env.NODE_ENV === "production" ? "<your upload URL>" : undefined
  })]
}
```