#!/bin/bash

# Script responsible for preprocessing source maps with debugid and uploading it to Backtrace via backtrace-js. 
# Usage:    ./ios-sourcemap-upload.sh <source_map_file_path> <debug_id_file_path> <backtrace_configuration_path> <project_directory_path>
# Parameters:
#   <source_map_file_path>          (Required) Path to the source map file.
#   <debug_id_file_path>            (Required) Path to generated backtrace debug id.
#   <backtrace_configuration_path>  (Required) Path to the .backtracejsrc configuration file.
#   <project_directory_path>        (Required) Path to the react-native project directory
#
# Adjusting metro configuration is required in order to correctly use debug_id available in the debug_id_file_path.


set -e
set -x

if [ -z "$1" ]; then
    echo "Error: Missing path to the source map file."
    exit 1
fi

source_map_file_path="$1"

# Check if the file exists
if [ ! -f "$source_map_file_path" ]; then
    echo "Error: File '$source_map_file_path' does not exist."
    exit 1
fi

debug_id_file_path=${DEBUG_ID_PATH:-${2:-}}

if [ ! -f "$debug_id_file_path" ]; then
    echo "Error: File '$debug_id_file_path' does not exist."
    exit 1
fi

if [ -z "$3" ]; then
    echo "Error: Missing path to the .backtracejsrc file."
    exit 1
fi

if [ -z "$4" ]; then
    echo "Error: Missing path to the project directory."
    exit 1
fi

project_directory_path="$4"

backtrace_configuration_path="$3"

# check and assign NODE_BINARY env
source "$REACT_NATIVE_PATH/scripts/node-binary.sh"
debug_id=$(<"$debug_id_file_path")

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$NODE_BINARY" "$script_dir/addDebugIdToSourceMap.js" \
    "$source_map_file_path" \
    "$debug_id"

# path to react-native module dir relative from this script
backtrace_js_path="${project_directory_path}/node_modules/.bin/backtrace-js"

# run backtrace-js on bundle
"$NODE_BINARY" "$backtrace_js_path" upload \
    -p "$source_map_file_path" \
    --config "$backtrace_configuration_path"
