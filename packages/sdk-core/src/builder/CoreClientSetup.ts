import { BacktraceConfiguration } from '../model/configuration/BacktraceConfiguration';
import { BacktraceRequestHandler } from '../model/http';
import { BacktraceAttributeProvider } from '../modules/attribute/BacktraceAttributeProvider';
import { BreadcrumbsSetup } from '../modules/breadcrumbs';
import { BacktraceStackTraceConverter } from '../modules/converter';
import { BacktraceSessionProvider } from '../modules/metrics/BacktraceSessionProvider';
import { FileSystem } from '../modules/storage';
import { DebugIdMapProvider } from '../sourcemaps';
import { SdkOptions } from './SdkOptions';

export type PartialCoreClientSetup<
    K extends keyof CoreClientSetup,
    O extends BacktraceConfiguration = BacktraceConfiguration,
> = Omit<CoreClientSetup<O>, K> & Partial<Pick<CoreClientSetup<O>, K>>;

export interface CoreClientSetup<O extends BacktraceConfiguration = BacktraceConfiguration> {
    readonly options: O;
    readonly sdkOptions: SdkOptions;
    readonly requestHandler: BacktraceRequestHandler;
    readonly attributeProviders?: BacktraceAttributeProvider[];
    readonly stackTraceConverter?: BacktraceStackTraceConverter;
    readonly sessionProvider?: BacktraceSessionProvider;
    readonly debugIdMapProvider?: DebugIdMapProvider;
    readonly breadcrumbsSetup?: BreadcrumbsSetup;
    readonly fileSystem?: FileSystem;
}
