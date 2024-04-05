import { BacktraceConfiguration } from '../model/configuration/BacktraceConfiguration';
import { BacktraceRequestHandler } from '../model/http';
import { BacktraceReportSubmission } from '../model/http/BacktraceReportSubmission';
import { BacktraceModule } from '../modules/BacktraceModule';
import { BacktraceAttributeProvider } from '../modules/attribute/BacktraceAttributeProvider';
import { BreadcrumbsSetup } from '../modules/breadcrumbs';
import { BacktraceStackTraceConverter } from '../modules/converter';
import { BacktraceSessionProvider } from '../modules/metrics/BacktraceSessionProvider';
import { MetricsQueue } from '../modules/metrics/MetricsQueue';
import { SummedEvent } from '../modules/metrics/model/SummedEvent';
import { UniqueEvent } from '../modules/metrics/model/UniqueEvent';
import { FileSystem } from '../modules/storage';
import { DebugIdMapProvider, DebugMetadataMapProvider } from '../sourcemaps';
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
    /**
     * @deprecated use `debugMetadataMapProvider` instead.
     */
    readonly debugIdMapProvider?: DebugIdMapProvider;
    readonly debugMetadataMapProvider?: DebugMetadataMapProvider;
    readonly breadcrumbsSetup?: BreadcrumbsSetup;
    readonly reportSubmission?: BacktraceReportSubmission;
    readonly fileSystem?: FileSystem;
    readonly modules?: BacktraceModule[];
    readonly summedMetricsQueue?: MetricsQueue<SummedEvent>;
    readonly uniqueMetricsQueue?: MetricsQueue<UniqueEvent>;
}
