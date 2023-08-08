import { BacktraceData } from '@backtrace/sdk-core/src/model/data/BacktraceData';
import crypto from 'crypto';
import { DeduplicationStrategy } from '../..';

export class DeduplicationModel {
    private readonly CUSTOM_FINGERPRINT_ATTRIBUTE = '_mod_fingerprint';
    constructor(private readonly _deduplicationStrategy: DeduplicationStrategy) {}

    public getSha(data: BacktraceData): string {
        const customFingerprint = data.attributes[this.CUSTOM_FINGERPRINT_ATTRIBUTE] as string;
        if (customFingerprint) {
            return customFingerprint;
        }

        if (this._deduplicationStrategy === DeduplicationStrategy.None) {
            return '';
        }

        const deduplicationPayload =
            ((this._deduplicationStrategy & DeduplicationStrategy.Classifier) == DeduplicationStrategy.Classifier
                ? data.classifiers.join(',')
                : '') +
            ((this._deduplicationStrategy & DeduplicationStrategy.Callstack) == DeduplicationStrategy.Callstack
                ? JSON.stringify(data.threads[data.mainThread])
                : '') +
            ((this._deduplicationStrategy & DeduplicationStrategy.Message) === DeduplicationStrategy.Message
                ? data.attributes['error.message']
                : '');

        return crypto.createHash('sha256').update(deduplicationPayload).digest('hex');
    }
}
