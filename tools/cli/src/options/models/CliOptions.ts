import { GlobalOptions } from '../..';
import { AddSourcesOptions } from '../../sourcemaps/add-sources';
import { ProcessOptions } from '../../sourcemaps/process';
import { RunOptions } from '../../sourcemaps/run';
import { UploadOptions } from '../../sourcemaps/upload';

export type CommonCliOptions = Partial<
    Omit<
        {
            [K in keyof UploadOptions & keyof AddSourcesOptions & keyof ProcessOptions]:
                | UploadOptions[K]
                | AddSourcesOptions[K]
                | ProcessOptions[K];
        },
        keyof GlobalOptions
    >
>;

export interface CommandCliOptions {
    readonly run: Partial<RunOptions>;
    readonly upload: Partial<UploadOptions>;
    readonly 'add-sources': Partial<AddSourcesOptions>;
    readonly process: Partial<ProcessOptions>;
}

export type CliOptions = Partial<CommonCliOptions & CommandCliOptions>;