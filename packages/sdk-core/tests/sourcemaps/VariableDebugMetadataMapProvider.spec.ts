import {
    SOURCE_DEBUG_ID_VARIABLE,
    SOURCE_DEBUG_METADATA_VARIABLE,
    VariableDebugMetadataMapProvider,
} from '../../src/sourcemaps/VariableDebugMetadataMapProvider';

describe('VariableDebugMetadataMapProvider', () => {
    describe('getDebugMetadataMap', () => {
        it(`should return debug metadata from ${SOURCE_DEBUG_METADATA_VARIABLE} key`, () => {
            const expected = { foo: 'bar' };

            const container = {
                [SOURCE_DEBUG_METADATA_VARIABLE]: expected,
            };

            const provider = new VariableDebugMetadataMapProvider(container);
            const actual = provider.getDebugMetadataMap();

            expect(actual).toEqual(expected);
        });

        it(`should return debug metadata from ${SOURCE_DEBUG_ID_VARIABLE} key if ${SOURCE_DEBUG_METADATA_VARIABLE} is not available`, () => {
            const expected = { foo: 'bar' };

            const container = {
                [SOURCE_DEBUG_ID_VARIABLE]: expected,
            };

            const provider = new VariableDebugMetadataMapProvider(container);
            const actual = provider.getDebugMetadataMap();

            expect(actual).toEqual(expected);
        });

        it(`should return debug metadata from both ${SOURCE_DEBUG_METADATA_VARIABLE} and ${SOURCE_DEBUG_ID_VARIABLE} keys`, () => {
            const debugIdMap = {
                foo: 'xyz',
                xyz: 'abc',
            };

            const debugMetadataMap = {
                foo: 'bar',
                abc: '123',
            };

            const expected = {
                ...debugIdMap,
                ...debugMetadataMap,
            };

            const container = {
                [SOURCE_DEBUG_ID_VARIABLE]: debugIdMap,
                [SOURCE_DEBUG_METADATA_VARIABLE]: debugMetadataMap,
            };

            const provider = new VariableDebugMetadataMapProvider(container);
            const actual = provider.getDebugMetadataMap();

            expect(actual).toEqual(expected);
        });
    });

    describe('getDebugIdMap', () => {
        it(`should return debug metadata from ${SOURCE_DEBUG_ID_VARIABLE} key`, () => {
            const expected = { foo: 'bar' };

            const container = {
                [SOURCE_DEBUG_ID_VARIABLE]: expected,
            };

            const provider = new VariableDebugMetadataMapProvider(container);
            const actual = provider.getDebugIdMap();

            expect(actual).toEqual(expected);
        });
    });
});
