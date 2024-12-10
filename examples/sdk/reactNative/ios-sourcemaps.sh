#!/bin/bash

# This script runs backtrace-js on given path and using given config.
# In this example, backtrace-js will process and upload sourcemaps.
# This should be executed by the iOS build after creating the .jsbundle file.

set -e
set -x

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
config_path=$BACKTRACE_JS_CONFIG
bundle_path=$BACKTRACE_JS_BUNDLE_PATH

if [[ ! -f "$bundle_path" ]]; then
    echo "warn: File $bundle_path does not exist. \
    Try switching to a Release build. \
    Sourcemaps will not be processed."

    exit 0
fi

# path to react-native module dir relative from this script
react_native_dir="${script_dir}/node_modules/react-native"
backtrace_js_path="${script_dir}/node_modules/.bin/backtrace-js"

# check and assign NODE_BINARY env
source "$react_native_dir/scripts/node-binary.sh"

# run backtrace-js on bundle
"$NODE_BINARY" "$backtrace_js_path" run \
    --config "$config_path" \
    --path "$bundle_path"
