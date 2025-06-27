import { BacktraceConfiguration } from '../model/configuration/BacktraceConfiguration.js';
import { BacktraceReportSubmission } from '../model/http/BacktraceReportSubmission.js';
import { BacktraceRequestHandler } from '../model/http/index.js';
import { BacktraceModule } from '../modules/BacktraceModule.js';
import { BacktraceAttributeProvider } from '../modules/attribute/BacktraceAttributeProvider.js';
import { BreadcrumbsSetup } from '../modules/breadcrumbs/index.js';
import { BacktraceStackTraceConverter } from '../modules/converter/index.js';
import { BacktraceDatabaseRecordSenders } from '../modules/database/BacktraceDatabaseRecordSender.js';
import { BacktraceDatabaseRecordSerializers } from '../modules/database/BacktraceDatabaseRecordSerializer.js';
import { ReportBacktraceDatabaseRecordFactory } from '../modules/database/ReportBacktraceDatabaseRecordFactory.js';
import { BacktraceSessionProvider } from '../modules/metrics/BacktraceSessionProvider.js';
import { MetricsQueue } from '../modules/metrics/MetricsQueue.js';
import { SummedEvent } from '../modules/metrics/model/SummedEvent.js';
import { UniqueEvent } from '../modules/metrics/model/UniqueEvent.js';
import { BacktraceStorageModule } from '../modules/storage/BacktraceStorage.js';
import { DebugIdMapProvider } from '../sourcemaps/index.js';
import { SdkOptions } from './SdkOptions.js';

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
    readonly reportSubmission?: BacktraceReportSubmission;
    readonly modules?: BacktraceModule[];
    readonly summedMetricsQueue?: MetricsQueue<SummedEvent>;
    readonly uniqueMetricsQueue?: MetricsQueue<UniqueEvent>;
    readonly database?: {
        readonly storage?: BacktraceStorageModule;
        readonly recordSerializers?: BacktraceDatabaseRecordSerializers;
        readonly recordSenders?: (submission: BacktraceReportSubmission) => BacktraceDatabaseRecordSenders;
        readonly reportRecordFactory?: ReportBacktraceDatabaseRecordFactory;
    };
}
