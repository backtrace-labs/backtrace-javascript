'use strict';

// Inspect the actual npm artifacts. Requires Node.js and tar, but no workspace dependencies.
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function read(root, file) {
    return fs.readFileSync(path.join(root, file), 'utf8');
}

function requireFile(root, file) {
    const target = path.resolve(root, file);
    assert(target.startsWith(root + path.sep), `File escapes package: ${file}`);
    assert(fs.statSync(target).isFile(), `Missing package file: ${file}`);
    assert(fs.statSync(target).size > 0, `Empty package file: ${file}`);
    return target;
}

function entry(root, manifest, field, extensions) {
    assert.equal(typeof manifest[field], 'string', `Missing ${manifest.name} ${field}`);
    const candidate = extensions
        .map((extension) => manifest[field] + extension)
        .find((file) => {
            const target = path.resolve(root, file);
            return target.startsWith(root + path.sep) && fs.existsSync(target) && fs.statSync(target).isFile();
        });
    assert(candidate, `Unresolvable ${manifest.name} ${field}: ${manifest[field]}`);
    return requireFile(root, candidate);
}

function unpack(archive, destination, expectedName) {
    fs.mkdirSync(destination);
    execFileSync('tar', ['-xzf', path.resolve(archive), '-C', destination], { stdio: 'pipe' });
    const root = path.join(destination, 'package');
    const manifest = JSON.parse(read(root, 'package.json'));
    assert.equal(manifest.name, expectedName, 'Unexpected package; pass core first, then React Native');
    assert.match(manifest.version, /^\d+\.\d+\.\d+-rc\.\d+$/, `${expectedName} must be a release candidate`);
    assert.equal(manifest.publishConfig?.tag, 'rc', `${expectedName} must publish to the rc tag`);
    assert.equal(manifest.publishConfig?.access, 'public');
    assert(manifest.scripts?.prepack, `${expectedName} must build during npm pack`);
    entry(root, manifest, 'main', ['', '.js']);
    entry(root, manifest, 'module', ['', '.js']);
    entry(root, manifest, 'types', ['']);
    return { root, manifest };
}

async function verify(coreArchive, nativeArchive, temporaryDirectory) {
    const core = unpack(coreArchive, path.join(temporaryDirectory, 'core'), '@backtrace/sdk-core');
    const native = unpack(nativeArchive, path.join(temporaryDirectory, 'react-native'), '@backtrace/react-native');
    const { root, manifest } = native;

    assert.equal(manifest.dependencies?.['@backtrace/sdk-core'], core.manifest.version, 'Core must be pinned exactly');
    for (const name of ['promise', 'pretty-format', 'web-streams-polyfill']) {
        assert.equal(typeof manifest.dependencies?.[name], 'string', `${name} must be a direct runtime dependency`);
    }
    for (const name of ['metro', '@backtrace/sourcemap-tools']) {
        assert.equal(typeof manifest.peerDependencies?.[name], 'string', `Missing optional peer ${name}`);
        assert.equal(manifest.peerDependenciesMeta?.[name]?.optional, true, `${name} must be optional`);
    }
    entry(root, manifest, 'source', ['', '.ts', '.tsx']);
    entry(root, manifest, 'react-native', ['', '.ts', '.tsx']);

    const escapedVersion = manifest.version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const versionLiteral = new RegExp(`\\bagentVersion\\s*=\\s*(['"])${escapedVersion}\\1`);
    assert.match(read(root, 'src/common/agentVersion.ts'), versionLiteral, 'Stale source agent version');
    assert.match(read(root, 'lib/typescript/common/agentVersion.d.ts'), versionLiteral, 'Stale declared agent version');
    const commonjsVersion = require(requireFile(root, 'lib/commonjs/common/agentVersion.js'));
    assert.equal(commonjsVersion.agentVersion, manifest.version, 'Stale CommonJS agent version');
    // Bob's module output uses .js without type:module, so load this self-contained module as ESM explicitly.
    const esmVersion = await import(
        `data:text/javascript;base64,${Buffer.from(read(root, 'lib/module/common/agentVersion.js')).toString('base64')}`
    );
    assert.equal(esmVersion.agentVersion, manifest.version, 'Stale ESM agent version');

    for (const [directory, extension] of [
        ['src', 'ts'],
        ['lib/commonjs', 'js'],
        ['lib/module', 'js'],
    ]) {
        // Keep the two dependency-cycle corrections from #397 in every published representation.
        assert.match(
            read(root, `${directory}/breadcrumbs/FileBreadcrumbsStorage.${extension}`),
            /['"]\.\.\/attachment\/BacktraceFileAttachment(?:\.js)?['"]/,
            `Breadcrumb attachment import regressed in ${directory}`,
        );
        const builder = read(root, `${directory}/builder/BacktraceClientBuilder.${extension}`);
        assert.match(builder, /BacktraceClientBuilder/);
        assert.match(builder, /['"]\.\.\/BacktraceClient(?:\.js)?['"]/);
        assert.doesNotMatch(
            read(root, `${directory}/BacktraceClient.${extension}`),
            /(?:from\s*|require\(\s*)['"]\.\.\/package\.json['"]/,
            `Runtime package.json import regressed in ${directory}`,
        );
    }
    requireFile(root, 'lib/typescript/builder/BacktraceClientBuilder.d.ts');

    const gradle = read(root, 'android/build.gradle');
    const namespace = gradle.match(/^\s*namespace\s+['"]([^'"]+)['"]/m)?.[1];
    const javaPackage = read(root, 'android/src/main/java/backtrace/library/ReactNativePackage.java').match(
        /^package\s+([\w.]+);/m,
    )?.[1];
    assert(namespace && javaPackage, 'Missing Android namespace or autolinking package');
    assert.equal(namespace, javaPackage, 'Android namespace must match ReactNativePackage');
    assert(read(root, 'android/src/main/AndroidManifest.xml').includes(`package="${javaPackage}"`));
    requireFile(root, 'android/src/main/AndroidManifestNew.xml');
    requireFile(root, 'android/consumer-rules.pro');
    for (const abi of ['arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64']) {
        requireFile(root, `android/src/main/jniLibs/${abi}/libbacktrace-native.so`);
    }
    assert.match(read(root, 'backtrace-react-native.podspec'), /s\.static_framework\s*=\s*true/);
    for (const file of [
        'ios/BacktraceReactNative.h',
        'ios/BacktraceReactNative.mm',
        'ios/BacktraceCrashReporter.mm',
        'android/upload-sourcemaps.gradle',
        'scripts/ios-sourcemap-upload.sh',
        'scripts/processSourceMap.js',
        'scripts/addDebugIdToSourceMap.js',
        'scripts/generate-agent-version.cjs',
        'RELEASE_CANDIDATE.md',
    ]) {
        requireFile(root, file);
    }

    console.log(`Verified ${manifest.name}@${manifest.version} with ${core.manifest.name}@${core.manifest.version}.`);
    console.log(
        'Package contents verified; consumer Metro builds and native device tests remain separate release gates.',
    );
}

async function main() {
    const args = process.argv.slice(2);
    assert.equal(args.length, 2, 'Usage: node verify-rc-packages.cjs <sdk-core.tgz> <react-native.tgz>');
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'backtrace-rc-packages-'));
    try {
        await verify(args[0], args[1], temporaryDirectory);
    } finally {
        fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
