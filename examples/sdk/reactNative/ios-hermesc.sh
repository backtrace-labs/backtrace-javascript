#/bin/bash

# This script shows how process your application code with source maps and hermesc. By using this script, Backtrace integration can process
# your source code to generate valid source map files. This script does exactly the same what the hermesc script does, with one exception - 
# before the native library is generated, this script will process source code and source map to generate output needed in next steps for source map integration.


HERMES_ENGINE_PATH="$PODS_ROOT/hermes-engine"
[ -z "$HERMES_CLI_PATH_OVERRIDE" ] && HERMES_CLI_PATH_OVERRIDE="$HERMES_ENGINE_PATH/destroot/bin/hermesc"


APP_BUNDLE_FILE="${BASH_ARGV[0]}"

if [[ ! -f "$APP_BUNDLE_FILE" ]]; then
    echo "error: File $APP_BUNDLE_FILE does not exist. " >&2
    exit 2
fi

npx --yes @backtrace/javascript-cli process --path=$APP_BUNDLE_FILE

$HERMES_CLI_PATH_OVERRIDE $@