/**
 * Sdk-specific options used to provide information in the report about the SDK
 */
export interface SdkOptions {
    readonly langName: string;
    readonly langVersion: string;
    readonly agent: string;
    readonly agentVersion: string;
}
