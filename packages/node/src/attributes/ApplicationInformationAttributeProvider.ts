import { BacktraceAttributeProvider, BacktraceConfiguration } from '@backtrace/sdk-core';
import fs from 'fs';
import path from 'path';

export class ApplicationInformationAttributeProvider implements BacktraceAttributeProvider {
    private _applicationInformation: Record<string, string> = {};
    public get type(): 'scoped' | 'dynamic' {
        return 'scoped';
    }

    constructor(options: BacktraceConfiguration) {
        if (options.userAttributes?.['application'] && options.userAttributes?.['application.version']) {
            this._applicationInformation['application'] = options.userAttributes['application'] as string;
            this._applicationInformation['application.version'] = options.userAttributes[
                'application.version'
            ] as string;
        }
    }

    public get(): Record<string, unknown> {
        const applicationData = this.readApplicationInformation();
        if (!applicationData) {
            if (!this._applicationInformation) {
                throw new Error(
                    'Cannot find information about the package. Please define application and application.versino attribute',
                );
            }

            return this._applicationInformation;
        }

        return {
            package: applicationData,
            application: this._applicationInformation['application'] ?? applicationData['name'],
            ['application.version']: this._applicationInformation['application.version'] ?? applicationData['version'],
        };
    }

    private readApplicationInformation(): Record<string, unknown> | undefined {
        const maximumDepth = 5;
        const possibleSourcePaths = [process.cwd()];
        if (require.main?.path) {
            possibleSourcePaths.unshift(path.resolve(require.main.path, '..'));
        }

        for (let possibleSourcePath of possibleSourcePaths) {
            for (let index = 0; index < maximumDepth; index++) {
                const packagePath = path.join(possibleSourcePath, 'package.json');
                if (!fs.existsSync(packagePath)) {
                    possibleSourcePath = path.resolve(possibleSourcePath, '..');
                    continue;
                }
                return JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            }
        }
    }
}
