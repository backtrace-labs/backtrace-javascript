const fs = require('fs');
const path = require('path');
const { DebugIdGenerator, SourceProcessor } = require('@backtrace/sourcemap-tools');

// Metro's internal modules are not published in its `exports` map, so a bare
// `require('metro/src/...')` is blocked by Node's exports enforcement in newer
// Metro (>= 0.82, shipped with RN >= 0.81). Resolve them by absolute path from
// the metro package root instead, which bypasses the exports gate. The file
// layout (metro/src/...) has been stable across the supported Metro versions.
const metroRoot = path.dirname(require.resolve('metro/package.json'));
// Newer Metro (>= 0.82, RN >= 0.81) compiles these modules to ESM-interop, so the
// export lives on `.default`; older Metro exported it directly. Prefer `.default`
// when present, otherwise use the module export itself.
const requireMetroInternal = (subpath) => {
    const mod = require(path.join(metroRoot, subpath));
    return mod && mod.default !== undefined ? mod.default : mod;
};

const bundleToString = requireMetroInternal('src/lib/bundleToString');
const baseJSBundle = requireMetroInternal('src/DeltaBundler/Serializers/baseJSBundle');
const CountingSet = requireMetroInternal('src/lib/CountingSet');

const DEBUG_ID_PATH = process.env.DEBUG_ID_PATH;

/**
 * Process metro build with source map support powered by Backtrace.
 */
async function processSourceMap(entryPoint, preModules, graph, options) {
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
    const { source, debugId } = await sourceProcessor.processSource(bundle.code);
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
