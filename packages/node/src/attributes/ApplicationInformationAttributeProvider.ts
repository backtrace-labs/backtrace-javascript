import { BacktraceAttributeProvider } from '@backtrace-labs/sdk-core';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { BacktraceConfiguration } from '../BacktraceConfiguration';

export class ApplicationInformationAttributeProvider implements BacktraceAttributeProvider {
    public readonly APPLICATION_ATTRIBUTE = 'application';
    public readonly APPLICATION_VERSION_ATTRIBUTE = 'application.version';

    private _application?: string = process.env.npm_package_name;
    private _applicationVersion?: string = process.env.npm_package_version;

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

        if (!this._application || !this._applicationVersion) {
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

    private generatePathBasedOnTheDirName() {
        const nodeModulesIndex = __dirname.lastIndexOf('node_modules');
        if (nodeModulesIndex === -1) {
            return __dirname;
        }

        return __dirname.substring(0, nodeModulesIndex);
    }

    private generateDefaultApplicationSearchPaths() {
        const possibleSourcePaths = [process.cwd()];
        const dirNamePath = this.generatePathBasedOnTheDirName();
        if (dirNamePath) {
            possibleSourcePaths.push(dirNamePath);
        }
        const potentialCommandLineStartupFile = process.argv[1];
        if (potentialCommandLineStartupFile) {
            const potentialCommandLineStartupFilePath = path.resolve(potentialCommandLineStartupFile);
            if (fs.existsSync(potentialCommandLineStartupFilePath)) {
                possibleSourcePaths.unshift(potentialCommandLineStartupFilePath);
            }
        }
        if (require.main?.path) {
            possibleSourcePaths.unshift(path.dirname(require.main.path));
        }
        return possibleSourcePaths;
    }

    private readApplicationInformation(): Record<string, unknown> | undefined {
        for (let possibleSourcePath of this.applicationSearchPaths) {
            // to make sure we check all directories including `/` we want to assign the parent
            // directory to the current path after checking if the parent directory is equal the current
            // directory. Because of that in the while condition, there is an assignement to the
            // current directory to check next dir in the dir strucutre.
            do {
                const packageJson = this.readPackageFromDir(possibleSourcePath);
                if (packageJson) {
                    return packageJson;
                }
            } while (
                possibleSourcePath !== path.dirname(possibleSourcePath) &&
                (possibleSourcePath = path.dirname(possibleSourcePath))
            );
        }
    }

    private readPackageFromDir(dirPath: string): Record<string, unknown> | undefined {
        const packagePath = path.join(dirPath, 'package.json');
        if (!fs.existsSync(packagePath)) {
            return undefined;
        }
        return JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    }
}
