import {
    BacktraceReport,
    BacktraceStringAttachment,
    type BacktraceStackFrame,
    type BacktraceSubmissionStatus,
} from '@backtrace/sdk-core';
import { NativeModules, Platform } from 'react-native';
import type { BacktraceClient } from '../BacktraceClient';
import { DebuggerHelper } from '../common/DebuggerHelper';
import type { FileSystem } from '../storage/FileSystem';
import { AnrException } from './AnrException';
import { addOtherThreads, type AnrThread } from './AnrThreads';

export interface AnrExitInfoRecord {
    timestamp: number;
    message: string;
    attributes: Record<string, unknown>;
    stackTrace?: string;
    mainThreadFrames?: BacktraceStackFrame[];
    threads?: AnrThread[];
}

export class AnrReporter {
    private static readonly MarkerFileName = 'backtrace-anr-marker';
    private static readonly DatabaseRetriedStatuses: BacktraceSubmissionStatus[] = [
        'Network Error',
        'Server Error',
        'Invalid token',
        'Unknown',
        'Unsupported',
    ];

    private constructor(
        private readonly _fileSystem: FileSystem,
        private readonly _markerPath: string,
    ) {}

    public static create(fileSystem: FileSystem): AnrReporter | undefined {
        if (Platform.OS !== 'android') {
            return undefined;
        }

        if (!DebuggerHelper.isNativeBridgeEnabled()) {
            return undefined;
        }

        if (!NativeModules.BacktraceReactNative?.getAnrExitInfo) {
            return undefined;
        }

        const applicationDirectory = fileSystem.applicationDirectory();
        if (!applicationDirectory) {
            return undefined;
        }

        return new AnrReporter(fileSystem, `${applicationDirectory}/${AnrReporter.MarkerFileName}`);
    }

    public async report(client: BacktraceClient): Promise<void> {
        try {
            const records: AnrExitInfoRecord[] = await NativeModules.BacktraceReactNative.getAnrExitInfo(
                await this.readMarker(),
            );

            // records arrive oldest first, so stopping leaves the rest for the next launch
            for (const record of records) {
                if (!record.mainThreadFrames?.length) {
                    // no groupable stack, but still mark it seen or it is re-read on every launch
                    await this.writeMarker(record.timestamp);
                    continue;
                }

                const result = await client.send(this.buildReport(record));
                if (this.needsRetry(client, result.status)) {
                    return;
                }

                await this.writeMarker(record.timestamp);
            }
        } catch (err) {
            console.warn('Backtrace: cannot report ANRs from application exit info.', err);
        }
    }

    // the database stores every report before the send attempt and retries failures from there
    private needsRetry(client: BacktraceClient, status: BacktraceSubmissionStatus): boolean {
        if (status === 'Ok') {
            return false;
        }
        return !client.database || !AnrReporter.DatabaseRetriedStatuses.includes(status);
    }

    private buildReport(record: AnrExitInfoRecord): BacktraceReport {
        // an exception stack is copied into the error annotation, so the dump goes only to the attachment
        const report = new BacktraceReport(
            new AnrException(record.message, ''),
            {
                ...record.attributes,
                'error.type': 'Hang',
            },
            record.stackTrace ? [new BacktraceStringAttachment('anr-stacktrace.txt', record.stackTrace)] : [],
            { timestamp: record.timestamp },
        );

        report.addStackTrace('main', record.mainThreadFrames as BacktraceStackFrame[]);
        addOtherThreads(report, record.threads);
        return report;
    }

    private async readMarker(): Promise<number> {
        if (!(await this._fileSystem.exists(this._markerPath))) {
            return 0;
        }

        const timestamp = parseInt(await this._fileSystem.readFile(this._markerPath), 10);
        return Number.isFinite(timestamp) ? timestamp : 0;
    }

    private writeMarker(timestamp: number): Promise<void> {
        return this._fileSystem.writeFile(this._markerPath, timestamp.toString());
    }
}
