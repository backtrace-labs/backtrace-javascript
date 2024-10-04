# Backtrace JS SDK smoketests

The tests ensure that our SDK is _at least usable_.

Local tests are executed by `jest`, and browser tests by `wdio` at Sauce Labs.

## Coverage

The tests should aim to test the simplest functionalities of the SDK, such as installing the SDK package and sending
an exception to Backtrace.

A test package should test these URLs:

-   direct submission URL (for on-premise users),
-   submit layer URL (for hosted users),
-   some invalid URL (to check if the package does not blow up).

The following use cases should be covered for a given environment:

-   sending an exception,
-   sending a message,
-   catching an unhandled exception,
-   catching an unhandled rejection.

## Running the tests

To start up the tests, ensure that the following environment variables are set:

-   `SMOKETESTS_SUBMIT_LAYER_URL` (e.g. https://submit.backtrace.io/universe/token/json),
-   `SMOKETESTS_DIRECT_SUBMIT_URL` (e.g. https://universe.sp.backtrace.io:6098/post?token=x&format=json),
-   `SMOKETESTS_SAUCE_USERNAME` for WDIO tests,
-   `SMOKETESTS_SAUCE_ACCESS_KEY` for WDIO tests.

### `npm run start` / `npm run start:jest` / `npm run start:wdio`

This command executes the following scripts:

#### `npm run prepare-packages`

The first test is to verify that the dependencies can be installed, and the package can be built if necessary.
This step runs `npm install` in the package directory, and `npm run build`, if the `build` script is available.

Optionally, you can clean the package before setting it up. To do that, pass `-c` or `--clean` to the script.
The clean operation runs `npm run clean`, if the `clean` script is available, and removes the `node_modules` directory
and the `package-lock.json` file.

#### `npm run jest` / `npm run wdio`

This command starts one of the test runners.

# Test packages

## Node smoketests

Node tests use `jest` to execute and are composed of multiple types of packages to ensure that the code is importable
by CJS and ESM environments, while also working with JS and TS code.

There are 4 packages for Node tests:

-   `node-js-cjs` - tests Javascript code with CJS imports,
-   `node-js-esm` - tests Javascript code with ESM imports,
-   `node-ts-cjs` - tests Typescript code with CJS imports,
-   `node-ts-esm` - tests Typescript code with ESM imports.

Most tests packages comprise of sending a simple exception to a given address.
As testing this is sufficient for knowing that the SDK works in a given environment, only `node-ts-esm` package has
additional tests. When adding tests that do not have to be checked by all enviroments, add them to this package.

## React smoketests

React tests use `wdio` to execute tests remotely on Sauce Labs' Virtual Device Cloud.

There is 1 package for React tests:

-   `react-ts-esm` - tests Typescript code with ESM imports.
