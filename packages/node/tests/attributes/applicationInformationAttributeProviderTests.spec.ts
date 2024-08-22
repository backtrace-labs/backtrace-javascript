import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ApplicationInformationAttributeProvider } from '../../src/attributes/ApplicationInformationAttributeProvider';

describe('Application information attribute provider tests', () => {
    describe('search path tests', () => {
        const sourceDir = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
        const libraryPackageJson = path.join(sourceDir, 'package.json');
        const expectedPackageJson = JSON.parse(fs.readFileSync(libraryPackageJson, 'utf8'));
        it('Should find a package.json file in the project structure', () => {
            const testedPackageDir = path.join(sourceDir, 'foo', 'bar', 'baz', '123', 'foo', 'bar');
            const provider = new ApplicationInformationAttributeProvider([testedPackageDir]);
            const attributes = provider.get();

            expect(attributes[provider.APPLICATION_ATTRIBUTE]).toBe(expectedPackageJson.name);

            expect(attributes[provider.APPLICATION_VERSION_ATTRIBUTE]).toBe(expectedPackageJson.version);
        });

        it('Should try to find a package.json in the current project', () => {
            const provider = new ApplicationInformationAttributeProvider();
            const attributes = provider.get();

            expect(attributes[provider.APPLICATION_ATTRIBUTE]).toBe(expectedPackageJson.name);

            expect(attributes[provider.APPLICATION_VERSION_ATTRIBUTE]).toBe(expectedPackageJson.version);
        });

        it('Should throw an error when the package.json information does not exist', () => {
            const testedPackageDir = path.join('/foo', 'bar', 'baz', '123', 'foo', 'bar');
            const provider = new ApplicationInformationAttributeProvider([testedPackageDir], {});

            expect(() => provider.get()).toThrow(Error);
        });
    });
});
