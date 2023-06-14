import { BacktraceStackTrace } from './BacktraceStackTrace';

export type AttributeType = string | number | boolean | undefined | null;

export interface BacktraceData {
    uuid: string;
    timestamp: number;
    lang: string;
    langVersion: string;
    agent: string;
    agentVersion: string;
    mainThread: string;
    classifiers: string[];
    attributes: Record<string, AttributeType>;
    annotations: Record<string, unknown>;
    threads: Record<string, BacktraceStackTrace>;
}
