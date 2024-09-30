#!/bin/bash

set -e 
set -x

# This script shows how process your application code with source maps and hermesc. By using this script, Backtrace integration can process
# your source code to generate valid source map files. This script does exactly the same what the hermesc script does, with one exception - 
# before the native library is generated, this script will process source code and source map to generate output needed in next steps for source map integration.


hermes_engine_path="$PODS_ROOT/hermes-engine"
[ -z "$HERMES_CLI_PATH_OVERRIDE" ] && HERMES_CLI_PATH_OVERRIDE="$hermes_engine_path/destroot/bin/hermesc"

app_bundle_file="${BASH_ARGV[0]}"

if [[ ! -f "$app_bundle_file" ]]; then
    echo "error: File $app_bundle_file does not exist. " >&2
    exit 2
fi

# check and assign NODE_BINARY env
source "$REACT_NATIVE_PATH/scripts/node-binary.sh"

backtrace_js_path="${REACT_NATIVE_PATH}/../.bin/backtrace-js"

"$NODE_BINARY" "$backtrace_js_path" process --path="$app_bundle_file"

$HERMES_CLI_PATH_OVERRIDE "$@"
