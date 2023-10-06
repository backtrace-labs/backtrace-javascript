import { type FileSystem as CoreFileSystem } from '@backtrace-labs/sdk-core';
import { type ReactNativeBreadcrumbFile } from './ReactNativeBreadcrumbFile';
export interface FileSystem extends CoreFileSystem {
    applicationDirectory(): string;
    breadcrumbProvider: ReactNativeBreadcrumbFile;
}
