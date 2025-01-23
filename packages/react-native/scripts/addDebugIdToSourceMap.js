const fs = require('fs');
const path = require('path');

function includeDebugIdInSourceMap(sourceMapPath, debugId) {
    if (!fs.existsSync(sourceMapPath)) {
        console.error(`Backtrace: source map not found at path ${sourceMapPath}.`);
        process.exit(1);
    }

    const sourceMapContent = fs.readFileSync(sourceMapPath, 'utf8');
    const sourceMap = JSON.parse(sourceMapContent);

    sourceMap['debugId'] = debugId;

    fs.writeFileSync(sourceMapPath, JSON.stringify(sourceMap), 'utf8');
    console.debug(`Backtrace: Successfully updated source map file ${sourceMapPath} with debug id: ${debugId}`);
}

const args = process.argv.slice(2);
if (args.length < 2) {
    console.error(`Usage: node ${path.basename(args[1])}  <sourcemapPath> <debugId>`);
    process.exit(1);
}

const sourceMapPath = path.resolve(args[0]);
const debugId = args[1];
includeDebugIdInSourceMap(sourceMapPath, debugId);
