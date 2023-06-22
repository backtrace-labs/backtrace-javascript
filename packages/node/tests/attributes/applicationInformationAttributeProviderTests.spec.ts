import fs from 'fs';
import path from 'path';
import { BacktraceConfiguration } from '../../src';
import { ApplicationInformationAttributeProvider } from '../../src/attributes/ApplicationInformationAttributeProvider';

describe('Application information attribute provider tests', () => {
    it('Should allow to set application and application.version attribute via attribute system', () => {
        const expectedApplicationName = 'test';
        const applicationKey = 'application';
        const expectedApplicationVersion = '1.0.0';
        const applicationVersionKey = 'application.version';
        const provider = new ApplicationInformationAttributeProvider({
            url: 'not-used',
            userAttributes: {
                [applicationKey]: expectedApplicationName,
                [applicationVersionKey]: expectedApplicationVersion,
            },
        } as BacktraceConfiguration);

        const attributes = provider.get();

        expect(attributes[applicationKey]).toBe(expectedApplicationName);
        expect(attributes[applicationVersionKey]).toBe(expectedApplicationVersion);
    });

    describe('search path tests', () => {
        const sourceDir = path.dirname(path.dirname(__dirname));
        const libraryPackageJson = path.join(sourceDir, 'package.json');
        const expectedPackageJson = JSON.parse(fs.readFileSync(libraryPackageJson, 'utf8'));
        it('Should find a package.json file in the project structure', () => {
            const testedPackageDir = path.join(sourceDir, 'foo', 'bar', 'baz', '123', 'foo', 'bar');
            const provider = new ApplicationInformationAttributeProvider({} as BacktraceConfiguration, [
                testedPackageDir,
            ]);
            const attributes = provider.get();

            expect(attributes[provider.APPLICATION_ATTRIBUTE]).toBe(expectedPackageJson.name);

            expect(attributes[provider.APPLICATION_VERSION_ATTRIBUTE]).toBe(expectedPackageJson.version);
        });

        it('Should try to find a package.json in the current project', () => {
            const provider = new ApplicationInformationAttributeProvider({} as BacktraceConfiguration);
            const attributes = provider.get();

            expect(attributes[provider.APPLICATION_ATTRIBUTE]).toBe(expectedPackageJson.name);

            expect(attributes[provider.APPLICATION_VERSION_ATTRIBUTE]).toBe(expectedPackageJson.version);
        });

        it('Should throw an error when the package.json information does not exist', () => {
            const testedPackageDir = path.join('/foo', 'bar', 'baz', '123', 'foo', 'bar');
            const provider = new ApplicationInformationAttributeProvider({} as BacktraceConfiguration, [
                testedPackageDir,
            ]);

            expect(() => provider.get()).toThrow(Error);
        });
    });
});
