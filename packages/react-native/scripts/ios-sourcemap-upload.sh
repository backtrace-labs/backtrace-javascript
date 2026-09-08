#!/bin/bash

# Adds the Backtrace debug id to a React Native source map and uploads it to Backtrace via backtrace-js.
#
# Usage:    ./ios-sourcemap-upload.sh <source_map_file_path> <debug_id_file_path> <backtrace_configuration_path> <project_directory_path>
# Parameters:
#   <source_map_file_path>          (Required) Path to the source map file.
#   <debug_id_file_path>            (Required) Path to the debug id file written by the Backtrace metro serializer.
#   <backtrace_configuration_path>  (Required) Path to the .backtracejsrc configuration file.
#   <project_directory_path>        (Required) Path to the react-native project directory.
# Environment:
#   DEBUG_ID_PATH   Overrides <debug_id_file_path>.
#   NODE_BINARY     Node executable, defaults to `node` on PATH. Inside an Xcode build phase, ios/.xcode.env and
#                   ios/.xcode.env.local are sourced first, like React Native's own bundle phase.
#
# Inside an Xcode build phase (CONFIGURATION is set) the script never fails the build over a missing input:
# builds that produce no debug id (SKIP_BUNDLING, or any Debug configuration, which bundles in dev mode) are
# skipped, and a missing source map, debug id, configuration file, backtrace-js or node is reported as an Xcode
# warning. Outside Xcode the same conditions are errors. A failed upload fails in both modes.
#
# The Backtrace serializer must be set as customSerializer in metro.config.js for the debug id file to exist.

set -e
set -x

in_xcode_build_phase=false
if [ -n "$CONFIGURATION" ]; then
    in_xcode_build_phase=true
fi

fail() {
    if [ "$in_xcode_build_phase" = true ]; then
        echo "warning: Backtrace: $1" >&2
        exit 0
    fi
    echo "Error: Backtrace: $1" >&2
    exit 1
}

if [ -z "$1" ]; then
    fail "Missing path to the source map file."
fi

if [ -z "$3" ]; then
    fail "Missing path to the .backtracejsrc file."
fi

if [ -z "$4" ]; then
    fail "Missing path to the project directory."
fi

source_map_file_path="$1"
debug_id_file_path=${DEBUG_ID_PATH:-${2:-}}
backtrace_configuration_path="$3"
project_directory_path="$4"

if [ -z "$debug_id_file_path" ]; then
    fail "Missing path to the debug id file."
fi

if [ "$in_xcode_build_phase" = true ]; then
    if [ -n "$SKIP_BUNDLING" ]; then
        echo "Backtrace: SKIP_BUNDLING is set, nothing was bundled, skipping source map upload."
        exit 0
    fi

    # Debug configurations bundle in dev mode, and the Backtrace serializer writes no debug id for dev bundles.
    case "$CONFIGURATION" in
        *Debug*)
            echo "Backtrace: Debug configuration produces no debug id, skipping source map upload."
            exit 0
            ;;
    esac
fi

if [ ! -f "$source_map_file_path" ]; then
    fail "Source map file '$source_map_file_path' does not exist. Check that SOURCEMAP_FILE is exported before the React Native bundle step."
fi

if [ ! -f "$debug_id_file_path" ]; then
    fail "Debug id file '$debug_id_file_path' does not exist. Check if customSerializer has been set to the Backtrace serializer in metro.config.js."
fi

if [ ! -f "$backtrace_configuration_path" ]; then
    fail "Configuration file '$backtrace_configuration_path' does not exist."
fi

backtrace_js_path="${project_directory_path}/node_modules/.bin/backtrace-js"

if [ ! -f "$backtrace_js_path" ]; then
    fail "backtrace-js not found at '$backtrace_js_path'. Install @backtrace/javascript-cli in the project."
fi

if [ -z "$NODE_BINARY" ] && [ -n "$PODS_ROOT" ]; then
    if [ -f "$PODS_ROOT/../.xcode.env" ]; then
        source "$PODS_ROOT/../.xcode.env"
    fi
    if [ -f "$PODS_ROOT/../.xcode.env.local" ]; then
        source "$PODS_ROOT/../.xcode.env.local"
    fi
fi

NODE_BINARY="${NODE_BINARY:-node}"

if ! type "$NODE_BINARY" >/dev/null 2>&1; then
    fail "Cannot find the '$NODE_BINARY' binary. Set NODE_BINARY in ios/.xcode.env or in the build phase."
fi

debug_id=$(<"$debug_id_file_path")
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$NODE_BINARY" "$script_dir/addDebugIdToSourceMap.js" \
    "$source_map_file_path" \
    "$debug_id"

"$NODE_BINARY" "$backtrace_js_path" upload \
    -p "$source_map_file_path" \
    --config "$backtrace_configuration_path"
