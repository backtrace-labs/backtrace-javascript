# @backtrace-labs/webpack-plugin
If you're using Webpack as your project bundler, you can use `@backtrace-labs/webpack-plugin` to automate working with sourcemaps.

[(Source Map feature documentation)](https://docs.saucelabs.com/error-reporting/platform-integrations/source-map/)

## Enable Source Maps for Your Application

Set `devtool` to `source-map` in your `webpack.config.js`:

```js
module.exports = {
  devtool: 'source-map',
  // other configuration
}
```

If you're using code transpiler plugins (such as Typescript), ensure to enable `source-mapping` there as well.

## Set up `@backtrace-labs/webpack-plugin`

### Construct an upload URL

A specific URL is required to upload source maps. Follow [these instructions](https://docs.saucelabs.com/error-reporting/project-setup/submission-url/) to create a `symbol-post` token for the `sourcemap` endpoint.

### Install `@backtrace-labs/webpack-plugin` as a developer dependency:

```bash
> npm install --save-dev @backtrace-labs/webpack-plugin
```

### Add it to your `plugins` array in `webpack.config.js`:

```js
import { BacktracePlugin } from '@backtrace-labs/webpack-plugin';
// or
const { BacktracePlugin } = require('@backtrace-labs/webpack-plugin');

module.exports = {
  // other configuration
  plugins: [new BacktracePlugin({
    // enable upload only on production builds
    uploadUrl: process.env.NODE_ENV === "production" ? "<your upload URL>" : undefined
  })]
}
```