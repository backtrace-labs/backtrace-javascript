import fs from 'fs/promises';
import path from 'path';
import { npm } from './__helpers/npm.js';
import { PACKAGE_DIR } from './__helpers/packages.js';

async function discoverPackages() {
    return (await fs.readdir(PACKAGE_DIR, { withFileTypes: true }))
        .filter((f) => f.isDirectory())
        .map((f) => path.join(PACKAGE_DIR, f.name));
}

async function cleanPackage(dir: string) {
    await npm(dir, ['run', '--if-present', 'clean']);
    await fs.rm(path.join(dir, 'node_modules'), { recursive: true, force: true });
    await fs.rm(path.join(dir, 'package-lock.json'), { force: true });
}

async function setupPackage(dir: string) {
    await npm(dir, ['install']);
    await npm(dir, ['run', '--if-present', 'build']);
}

let packagePaths = process.argv.slice(2).map((p) => path.join(PACKAGE_DIR, p));
if (!packagePaths.length) {
    packagePaths = await discoverPackages();
}

for (const packagePath of packagePaths) {
    console.log(`======= PACKAGE ${path.relative('.', packagePath)} =======`);
    console.log();
    console.log(`[${path.relative('.', packagePath)}] cleaning up package`);
    await cleanPackage(packagePath);
    console.log(`[${path.relative('.', packagePath)}] setting up package`);
    await setupPackage(packagePath);
}
