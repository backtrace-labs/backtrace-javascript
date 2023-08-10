import { GlobalOptions } from '../..';
import { AddSourcesOptions } from '../../sourcemaps/add-sources';
import { ProcessOptions } from '../../sourcemaps/process';
import { UploadOptions } from '../../sourcemaps/upload';

export type CommonCliOptions = Omit<
    {
        [K in keyof UploadOptions & keyof AddSourcesOptions & keyof ProcessOptions]:
            | UploadOptions[K]
            | AddSourcesOptions[K]
            | ProcessOptions[K];
    },
    keyof GlobalOptions
>;

export interface CommandCliOptions {
    readonly upload: UploadOptions;
    readonly 'add-sources': AddSourcesOptions;
    readonly process: ProcessOptions;
}

export type CliOptions = Partial<CommonCliOptions & CommandCliOptions>;
