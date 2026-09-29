'use strict';

const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
    throw new Error('Usage: node scripts/generate-agent-version.cjs [--check]');
}

const root = path.resolve(__dirname, '..');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
// Validate before interpolating package metadata into TypeScript source.
if (typeof version !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error('package.json must contain a valid package version.');
}

const target = path.join(root, 'src/common/agentVersion.ts');
const source = `// Generated from package.json; do not edit.\nexport const agentVersion = '${version}';\n`;
const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : undefined;

if (current !== source) {
    if (args[0] === '--check') {
        throw new Error('Stale agentVersion.ts. Run npm run generate:version.');
    }

    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, source, 'utf8');
}
