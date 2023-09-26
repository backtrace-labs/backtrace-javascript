# backtrace-js

Backtrace utility for managing Javascript files.

## Table of Contents

1. [Description](#description)
1. [Usage](#usage)
    - [`run`](#run)
    - [`process`](#process)
    - [`upload`](#upload)
    - [`add-sources`](#add-sources)
    - [Global options](#global-options)
    - [Configuration file](#configuration-file)

# Description

Debugging of minified applications is easy with the usage of sourcemaps. They can also help improve your reports in
Backtrace. This tool helps to add identificators to source and sourcemap files to enable Backtrace to match sources with
sourcemaps.

Identificators in sources will be processed in runtime and attached to Backtrace reports. With uploaded sourcemaps,
Backtrace can match files in callstack with available sourcemaps and display additional information about the error.

# Usage

In most cases, you'll want to [`process`](#process) the files first, optionally [`add-sources`](#add-sources), and then
[`upload`](#upload) them.

It is advisable to add these commands to your production build scripts. For example:

```jsonc
// package.json
{
    "scripts": {
        "build": "tsc && npm run backtrace:process && npm run backtrace:add-sources && npm run backtrace:upload",
        "backtrace:process": "npx backtrace-js process ./lib",
        "backtrace:add-sources": "npx backtrace-js add-sources ./lib",
        "backtrace:upload": "npx backtrace-js upload ./lib --url ..."
    }
}
```

`backtrace-js` exposes the following commands:

## `run`

A handy shortcut for executing all commands. Executes commands in order:

1. [`process`](#process)
1. [`add-sources`](#add-sources)
1. [`upload`](#upload)

### Options

#### `--process`

Runs the [`process`](#process) command.

#### `--add-sources`

Runs the [`add-sources`](#add-sources) command.

#### `--upload`

Runs the [`upload`](#upload) command.

#### `--dry-run`, `-n`

Will not modify the files and not upload them.

#### `<path>`, `--path <string>`, `-p <string>`

Searches for files within provided paths. This is the default positional argument. If not provided, will search in the
current directory.

#### `--force`, `-f`

Forces processing of already processed files. May result in duplicate appended data.

#### `--pass-with-no-files`

By default, `run` will return a non-zero exit code when no files are found. Pass this to return 0.

#### `--output <string>`, `-o <string>`

Specify this to output the archive to a file instead of uploading it to Backtrace. Cannot be used with uploading.

#### `--url <string>`, `-u <string>`

URL to upload the sourcemaps to. Cannot be used with `--subdomain`.

#### `--subdomain <string>`, `-s <string>`

Subdomain to use for upload. You must also specify the `--token`. Cannot be used with `--url`.

#### `--token <string>`, `-t <string>`

Token to use with the upload. Usable only with `--subdomain`.

#### `--include-sources`

By default, the sources in sourcemap file will NOT be uploaded to Backtrace. Specify this to include `sourcesContent`
key in sourcemaps.

#### `--insecure`, `-k`

Disables HTTPS certificate checking.

## `process`

Adds debug identificators to both source and sourcemap files. Searches for source files in provided paths and their
corresponding sourcemaps using `sourceMappingURL`. If source is processed, it is skipped.

Sources will have a runtime snippet and `debugId` comment appended to the end of the file. When `//# debugId=#` is
present, the source and sourcemap are treated as already processed. Due to the runtime snippet offsetting the source
rows, the sourcemap mappings will be updated as well.

Sourcemaps will have `debugId` appended to the JSON object.

### Options

#### `<path>`, `--path <string>`, `-p <string>`

Searches for files within provided paths. This is the default positional argument. If not provided, will search in the
current directory.

#### `--dry-run`, `-n`

Will not modify the files at the end. Useful for showing the result of the command without actually modyfing the
sources.

#### `--force`, `-f`

Forces processing of already processed files. May result in duplicate appended data.

#### `--pass-with-no-files`

By default, `process` will return a non-zero exit code when no files are found. Pass this to return 0.

### Examples

```sh
> backtrace-js process ./lib
> backtrace-js process ./lib/source1.js ./lib/source2.js
```

## `upload`

Uploads processed sourcemaps to Backtrace. The sourcemaps are zipped and sent to your Backtrace instance's symbol
storage.

Before uploading, make sure to:

-   [`process`](#process) the sources and sourcemaps,
-   create a symbol submission token,
-   get your subdomain name or URL for uploading sourcemaps,

Sourcemaps are treated as processed when `debugId` field is in the sourcemap JSON object.

### Creating a symbol submission token

To upload sourcemaps, you have to have a submission token:

1. Go to your Backtrace instance, and open Project settings of the project you want to upload sourcemaps to.
1. Under **Symbols**, select **Access tokens**.
1. Copy or create a new symbol access token.

### Retrieving the subdomain name or URL for uploading sourcemaps

If you're using a hosted instance of Backtrace, most likely you need to only pass the subdomain name. You can resolve
your subdomain name from your instance address.

For example, if your instance address is `https://example.sp.backtrace.io`, your subdomain will be `example`.

If for some reason you cannot upload the URL by using this way, or you're using an on premise installation, retrieve the
whole URL using the following steps.

_TODO: A place in Backtrace.io to just copy the URL from?_

#### Hosted instance

If your instance is hosted on backtrace.io, you can create the URL using
`https://submit.backtrace.io/<your subdomain>/<submission token>/sourcemap`. If your instance is hosted on backtrace.io,
you can create the URL using `https://submit.backtrace.io/<your subdomain>/<submission token>/sourcemap`.

For example, for subdomain https://example.sp.backtrace.io, and token
`bebbbc8b2bdfac76ad803b03561b25a44039e892ffd3e0beeb71770d08e2c8a7`, the URL will be
`https://submit.backtrace.io/example/bebbbc8b2bdfac76ad803b03561b25a44039e892ffd3e0beeb71770d08e2c8a7/sourcemap`.

#### On premise

If your instance is hosted on premise, you can create the URL using
`<your address>:6098//post?format=sourcemap&token=<submission token>`.

For example, for address https://backtrace.example.com, and token
`bebbbc8b2bdfac76ad803b03561b25a44039e892ffd3e0beeb71770d08e2c8a7`, the URL will be
`https://backtrace.example.com:6098//post?format=sourcemap&token=bebbbc8b2bdfac76ad803b03561b25a44039e892ffd3e0beeb71770d08e2c8a7`.

### Options

#### `<path>`, `--path <string>`, `-p <string>`

Searches for files within provided paths. This is the default positional argument. If not provided, will search in the
current directory.

#### `--url <string>`, `-u <string>`

URL to upload the sourcemaps to. Cannot be used with `--subdomain`.

#### `--subdomain <string>`, `-s <string>`

Subdomain to use for upload. You must also specify the `--token`. Cannot be used with `--url`.

#### `--token <string>`, `-t <string>`

Token to use with the upload. Usable only with `--subdomain`.

#### `--include-sources`

By default, the sources in sourcemap file will NOT be uploaded to Backtrace. Specify this to include `sourcesContent`
key in sourcemaps.

#### `--insecure`, `-k`

Disables HTTPS certificate checking.

#### `--dry-run`, `-n`

Will not upload the files at the end. Useful for showing the result of the command without actually uploading the
sourcemaps.

#### `--force`, `-f`

Upload files even if not processed.

#### `--pass-with-no-files`

By default, `upload` will return a non-zero exit code when no files are found. Pass this to return 0.

#### `--output <string>`, `-o <string>`

Specify this to output the archive to a file instead of uploading it to Backtrace. Cannot be used with uploading.

### Examples

```
> backtrace-js upload --subdomain example --token bebbbc8b2bdfac76ad803b03561b25a44039e892ffd3e0beeb71770d08e2c8a7
> backtrace-js upload ./lib --url https://submit.backtrace.io/example/bebbbc8b2bdfac76ad803b03561b25a44039e892ffd3e0beeb71770d08e2c8a7/sourcemap
> backtrace-js upload ./lib/index.js.map -o archive.zip
```

## `add-sources`

If your building tool does not include the original sources in the sourcemaps, you can use this command to add the
sources to your sourcemaps before upload. Make sure to upload with `--include-sources`. If sourcemap already has
`sourcesContent`, it will be skipped.

Sources will be resolved from the `sources` array relative to the sourcemap location, or `sourceRoot` in the sourcemap,
if provided.

### Options

#### `<path>`, `--path <string>`, `-p <string>`

Searches for files within provided paths. This is the default positional argument. If not provided, will search in the
current directory.

#### `--dry-run`, `-n`

Will not modify the files at the end. Useful for showing the result of the command without actually modifying the files.

#### `--force`, `-f`

Processes files even if sourcesContent is not empty. Will overwrite existing sources.

#### `--pass-with-no-files`

By default, `add-sources` will return a non-zero exit code when no files are found. Pass this to return 0.

### Examples

```
> backtrace-js add-sources ./lib
> backtrace-js add-sources ./lib/index.js.map ./lib/other.js.map
```

## Global options

All commands share the following options:

#### `--help`, `-h`

Displays help message for the current command.

#### `--verbose`, `-v`

Verbosity level. -v prints debug logs, -vv prints ALL logs.

#### `--quiet`, `-q`

Disables ALL logging messages.

#### `--log-level <string>`

Sets the logging level. Can be one of: `quiet`, `error`, `warn`, `info`, `debug`, `verbose`. Default: `info`.

#### `--config <string>`

Path to the config file. See [Configuration file](#configuration-file) for more details.

## Configuration file

All commands can read from a configuration file. By default, the configuration is read from `.backtracejsrc` file. The
file should have a JSON with comments (`jsonc`) structure.

The configuration object can define value of each command's options. The options have to be passed with full name,
without prefixing `--`.

You can set options per specific command using the command name as key and passing options in an object.

An example of the file:

```jsonc
{
    // Paths used by all commands
    "path": ["./lib", "./dist"],
    "upload": {
        // Path used only by the upload command
        "path": "./output",
        "insecure": true,
        "url": "https://submit.backtrace.io/example/bebbbc8b2bdfac76ad803b03561b25a44039e892ffd3e0beeb71770d08e2c8a7/sourcemap"
    },
    "add-sources": {
        "force": true
    },
    "run": {
        "process": true,
        "add-sources": false,
        "upload": true
    }
}
```

Global options **cannot** be set in the configuration file.
