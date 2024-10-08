import fs from 'fs/promises';
import path from 'path';
import { npm } from './__helpers/npm.js';
import { PACKAGE_DIR } from './__helpers/packages.js';

// If -c or --clean is passed
const doClean = process.argv.some((v) => v === '-c' || v === '--clean');

/**
 * Returns all package directories inside the `packages` directory.
 */
async function discoverPackages() {
    return (await fs.readdir(PACKAGE_DIR, { withFileTypes: true }))
        .filter((f) => f.isDirectory())
        .map((f) => path.join(PACKAGE_DIR, f.name));
}

/**
 * Performs the following steps to clean the package:
 * * `npm run clean` (if the script is present)
 * * remove `node_modules`
 * * remove `package-lock.json`
 * @param dir package directory
 */
async function cleanPackage(dir: string) {
    await npm(dir, ['run', '--if-present', 'clean']);
    await fs.rm(path.join(dir, 'node_modules'), { recursive: true, force: true });
    await fs.rm(path.join(dir, 'package-lock.json'), { force: true });
}

/**
 * Performs the following steps to setup the package:
 * * `npm install`
 * * `npm run build` (if the script is present)
 * @param dir package directory
 */
async function setupPackage(dir: string) {
    await npm(dir, ['install']);
    await npm(dir, ['run', '--if-present', 'build']);
}

// Packages names can be passed to the script directly
let packagePaths = process.argv
    .slice(2)
    .filter((v) => !v.startsWith('-'))
    .map((p) => path.join(PACKAGE_DIR, p));

// If none has been passed, discover the packages automatically
if (!packagePaths.length) {
    packagePaths = await discoverPackages();
}

for (const packagePath of packagePaths) {
    const packageName = path.relative('.', packagePath);
    console.log(`======= PACKAGE ${packageName} =======`);
    console.log();

    if (doClean) {
        console.log(`[${packageName}] cleaning up package`);
        await cleanPackage(packagePath);
    }

    console.log(`[${packageName}] setting up package`);
    await setupPackage(packagePath);
}
