import { BacktraceConfiguration } from '../model/configuration/BacktraceConfiguration';
import { BacktraceRequestHandler } from '../model/http';
import { BacktraceAttributeProvider } from '../modules/attribute/BacktraceAttributeProvider';
import { BreadcrumbsSetup } from '../modules/breadcrumbs';
import { BacktraceStackTraceConverter } from '../modules/converter';
import { BacktraceDatabaseStorageProvider } from '../modules/database';
import { BacktraceSessionProvider } from '../modules/metrics/BacktraceSessionProvider';
import { DebugIdMapProvider } from '../sourcemaps';
import { SdkOptions } from './SdkOptions';

export interface CoreClientSetup {
    readonly options: BacktraceConfiguration;
    readonly sdkOptions: SdkOptions;
    readonly requestHandler: BacktraceRequestHandler;
    readonly attributeProviders: BacktraceAttributeProvider[];
    readonly stackTraceConverter?: BacktraceStackTraceConverter;
    readonly sessionProvider?: BacktraceSessionProvider;
    readonly debugIdMapProvider?: DebugIdMapProvider;
    readonly breadcrumbsSetup?: BreadcrumbsSetup;
    readonly databaseStorageProvider?: BacktraceDatabaseStorageProvider;
}
