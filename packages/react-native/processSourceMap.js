const bundleToString = require('metro/src/lib/bundleToString');
const baseJSBundle = require('metro/src/DeltaBundler/Serializers/baseJSBundle');
const CountingSet = require('metro/src/lib/CountingSet').default;
const fs = require('fs');
const path = require('path');
const { DebugIdGenerator, SourceProcessor } = require('@backtrace/sourcemap-tools');

const DEBUG_ID_PATH = process.env.DEBUG_ID_PATH;

/**
 * Process metro build with source map support powered by Backtrace.
 */
function processSourceMap(entryPoint, preModules, graph, options) {
    const bundle = bundleToString(baseJSBundle(entryPoint, preModules, graph, options));

    // development build - skip source map upload
    if (graph.transformOptions.hot || graph.transformOptions.dev) {
        return bundle;
    }

    // no source map option set
    const sourceMapOutputPathParameter = process.argv.indexOf('--sourcemap-output');
    if (sourceMapOutputPathParameter === -1) {
        return bundle;
    }

    const sourceMapOutputPath = process.argv[sourceMapOutputPathParameter + 1];
    const backtraceSourceMapId =
        DEBUG_ID_PATH ?? path.join(path.dirname(sourceMapOutputPath), '.backtrace-sourcemap-id');

    const debugIdGenerator = new DebugIdGenerator();
    const sourceProcessor = new SourceProcessor(debugIdGenerator);
    const { source, debugId } = sourceProcessor.processSource(bundle.code);
    const snippet = debugIdGenerator.generateSourceSnippet(debugId);

    console.debug(`Backtrace: saving debugId ${debugId} to ${backtraceSourceMapId}.`);
    fs.writeFileSync(backtraceSourceMapId, debugId);

    const debugIdPrepend = {
        dependencies: new Map(),
        getSource: () => Buffer.from(snippet),
        inverseDependencies: new CountingSet(),
        path: '__prelude__',
        output: [
            {
                type: 'js/script/virtual',
                data: {
                    code: snippet,
                    lineCount: 1,
                    map: [],
                },
            },
        ],
    };
    preModules.unshift(debugIdPrepend);
    return {
        ...bundle,
        code: source,
    };
}

module.exports = { processSourceMap };
