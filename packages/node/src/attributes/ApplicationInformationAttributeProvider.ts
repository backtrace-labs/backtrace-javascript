import { BacktraceAttributeProvider } from '@backtrace/sdk-core';
import fs from 'fs';
import path from 'path';
import { BacktraceConfiguration } from '../BacktraceConfiguration';

export class ApplicationInformationAttributeProvider implements BacktraceAttributeProvider {
    public readonly APPLICATION_ATTRIBUTE = 'application';
    public readonly APPLICATION_VERSION_ATTRIBUTE = 'application.version';

    private _application?: string;
    private _applicationVersion?: string;

    public readonly applicationSearchPaths: string[];
    public get type(): 'scoped' | 'dynamic' {
        return 'scoped';
    }

    constructor(options: BacktraceConfiguration, applicationSearchPaths?: string[]) {
        if (
            options.userAttributes?.[this.APPLICATION_ATTRIBUTE] &&
            options.userAttributes?.[this.APPLICATION_VERSION_ATTRIBUTE]
        ) {
            this._application = options.userAttributes[this.APPLICATION_ATTRIBUTE] as string;
            this._applicationVersion = options.userAttributes[this.APPLICATION_VERSION_ATTRIBUTE] as string;
        }

        this.applicationSearchPaths = applicationSearchPaths ?? this.generateDefaultApplicationSearchPaths();
    }

    public get(): Record<string, unknown> {
        const applicationData = this.readApplicationInformation();
        if (applicationData) {
            this._application = this._application ?? (applicationData['name'] as string);
            this._applicationVersion = this._applicationVersion ?? (applicationData['version'] as string);
        }

        if (!this._application && !this._applicationVersion) {
            throw new Error(
                'Cannot find information about the package. Please define application and application.version attribute',
            );
        }

        return {
            package: applicationData,
            [this.APPLICATION_ATTRIBUTE]: this._application,
            [this.APPLICATION_VERSION_ATTRIBUTE]: this._applicationVersion,
        };
    }

    private generateDefaultApplicationSearchPaths() {
        const possibleSourcePaths = [process.cwd()];
        if (require.main?.path) {
            possibleSourcePaths.unshift(path.dirname(require.main.path));
        }
        return possibleSourcePaths;
    }

    private readApplicationInformation(): Record<string, unknown> | undefined {
        for (let possibleSourcePath of this.applicationSearchPaths) {
            while (possibleSourcePath !== '.') {
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
}
