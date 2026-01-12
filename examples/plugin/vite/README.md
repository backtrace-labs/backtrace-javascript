# Backtrace Vite Plugin Example

This example demonstrates how to use `@backtrace/vite-plugin` to automatically upload sourcemaps to Backtrace during the Vite build process.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the `.env` file and replace the placeholders with your Backtrace credentials:
   ```bash
   # Edit .env and replace {universe} and {token} with your values
   ```

## Configuration

Edit the `.env` file with your Backtrace credentials. This example uses two separate URLs:

| Variable | Purpose | Endpoint |
|----------|---------|----------|
| `BACKTRACE_UPLOAD_URL` | Sourcemap upload (build-time) | `.../sourcemap` |
| `VITE_BACKTRACE_SUBMISSION_URL` | Error submission (runtime) | `.../json` |

**Note:** The `VITE_` prefix is required for Vite to expose the variable to client-side code.

You can find your tokens in the Backtrace dashboard under Project Settings > Symbols > Access Tokens (for /sourcemap) and Project Settings > Error Submission > Submission tokens (for /json)

## Usage

Once you've configured your `.env` file:

```bash
# Build with sourcemap upload
npm run build

# Preview the built app
npm run preview
```

The build will:
1. Generate sourcemaps during the build
2. Process the sourcemaps (including source code with `includeSources: true`)
3. Upload them to your Backtrace instance

**Note:** If `BACKTRACE_UPLOAD_URL` contains placeholders or is invalid, the build will complete but sourcemaps won't be uploaded.

## Error Types

This example demonstrates several error submission types:

- **Send an error** - Sends a handled exception with an attachment
- **Send a message** - Sends a simple message/log to Backtrace
- **Send an unhandled exception** - Triggers an unhandled exception
- **Send a promise rejection** - Triggers an unhandled promise rejection

## Vite Version

This example uses Vite 7.1.5. The `@backtrace/vite-plugin` supports Vite versions 4.x through 7.x.
