import crypto from 'crypto';
import { V8StackTraceConverter } from '../../src/modules/converter/V8StackTraceConverter';
import { DebugMetadataProvider } from '../../src/sourcemaps/DebugMetadataProvider';
import { DebugIdMapProvider, DebugMetadataMapProvider } from '../../src/sourcemaps/interfaces/DebugMetadataMapProvider';

const STACK = new Error().stack as string;

describe('DebugMetadataProvider', () => {
    it('should load debug IDs from map', () => {
        const expected = crypto.randomUUID();

        const mapProvider: DebugIdMapProvider = {
            getDebugIdMap: () => ({
                [STACK]: expected,
            }),
        };

        const provider = new DebugMetadataProvider(new V8StackTraceConverter(), mapProvider);
        const actual = provider.getDebugMetadata(__filename);

        expect(actual?.debugId).toEqual(expected);
    });

    it('should load debug metadata from map', () => {
        const expectedDebugId = crypto.randomUUID();
        const expectedSymbolicationSource = crypto.randomUUID();

        const mapProvider: DebugMetadataMapProvider = {
            getDebugMetadataMap: () => ({
                [STACK]: ['prefix', expectedDebugId, expectedSymbolicationSource, 'suffix'],
            }),
        };

        const provider = new DebugMetadataProvider(new V8StackTraceConverter(), mapProvider);
        const actual = provider.getDebugMetadata(__filename);

        expect(actual).toEqual({
            debugId: expectedDebugId,
            symbolicationSource: expectedSymbolicationSource,
        });
    });

    it('should return undefined for unknown filename', () => {
        const mapProvider: DebugMetadataMapProvider = {
            getDebugMetadataMap: () => ({
                [STACK]: ['prefix', 'debugId', 'symbolication_source', 'suffix'],
            }),
        };

        const provider = new DebugMetadataProvider(new V8StackTraceConverter(), mapProvider);
        const actual = provider.getDebugMetadata('other.js');

        expect(actual).toBeUndefined();
    });
});
