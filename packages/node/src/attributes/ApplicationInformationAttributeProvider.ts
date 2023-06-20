import { BacktraceAttributeProvider, BacktraceConfiguration } from '@backtrace/sdk-core';
import fs from 'fs';
import path from 'path';

export class ApplicationInformationAttributeProvider implements BacktraceAttributeProvider {
    private readonly APPLICATION_ATTRIBUTE = 'application';
    private readonly APPLICATION_VERSION_ATTRIBUTE = 'application.version';
    private _applicationInformation: Record<string, string> = {};
    public get type(): 'scoped' | 'dynamic' {
        return 'scoped';
    }

    constructor(options: BacktraceConfiguration) {
        if (
            options.userAttributes?.[this.APPLICATION_ATTRIBUTE] &&
            options.userAttributes?.[this.APPLICATION_VERSION_ATTRIBUTE]
        ) {
            this._applicationInformation[this.APPLICATION_ATTRIBUTE] = options.userAttributes[
                this.APPLICATION_ATTRIBUTE
            ] as string;
            this._applicationInformation[this.APPLICATION_VERSION_ATTRIBUTE] = options.userAttributes[
                this.APPLICATION_VERSION_ATTRIBUTE
            ] as string;
        }
    }

    public get(): Record<string, unknown> {
        const applicationData = this.readApplicationInformation();
        if (!applicationData) {
            if (!this._applicationInformation) {
                throw new Error(
                    'Cannot find information about the package. Please define application and application.version attribute',
                );
            }

            return this._applicationInformation;
        }

        return {
            package: applicationData,
            application: this._applicationInformation[this.APPLICATION_ATTRIBUTE] ?? applicationData['name'],
            [this.APPLICATION_VERSION_ATTRIBUTE]:
                this._applicationInformation[this.APPLICATION_VERSION_ATTRIBUTE] ?? applicationData['version'],
        };
    }

    private readApplicationInformation(): Record<string, unknown> | undefined {
        const possibleSourcePaths = [process.cwd()];
        if (require.main?.path) {
            possibleSourcePaths.unshift(path.dirname(require.main.path));
        }

        for (let possibleSourcePath of possibleSourcePaths) {
            const packagePath = path.join(possibleSourcePath, 'package.json');
            if (!fs.existsSync(packagePath)) {
                const parentPath = path.dirname(possibleSourcePath);
                // avoid checking the same directory twice.
                if (parentPath === possibleSourcePath) {
                    break;
                }
                possibleSourcePath = parentPath;
                continue;
            }
            return JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        }
    }
}
