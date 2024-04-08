import crypto from 'crypto';
import {
    DebugIdGenerator,
    DebugMetadata,
    SOURCEMAP_DEBUG_ID_KEY,
    SOURCE_DEBUG_DATA_VARIABLE,
    SOURCE_DEBUG_ID_COMMENT,
    SOURCE_DEBUG_METADATA_PREFIX,
    SOURCE_DEBUG_METADATA_SUFFIX,
} from '../src';

describe('DebugIdGenerator', () => {
    function genDebugMetadata(): DebugMetadata {
        return {
            debugId: crypto.randomUUID(),
            symbolicationSource: crypto.randomUUID(),
        };
    }

    describe('source snippet generation', () => {
        /**
         * Makes the `global` variable `undefined` in the callback.
         * @param callback
         */
        function undefineGlobal(callback: () => void) {
            const globalBackup = global;
            // eslint-disable-next-line no-global-assign
            global = undefined as never;

            try {
                callback();
            } finally {
                // eslint-disable-next-line no-global-assign
                global = globalBackup;
            }
        }

        beforeEach(() => {
            // Clean the debug container from the global variable
            delete global[SOURCE_DEBUG_DATA_VARIABLE as never];

            // Sanity checks
            expect(typeof window).toEqual('undefined');
            expect(typeof self).toEqual('undefined');
        });

        it('should return snippet containing passed debug metadata', () => {
            const debugMetadata = genDebugMetadata();
            const expected = JSON.stringify([
                SOURCE_DEBUG_METADATA_PREFIX,
                debugMetadata.debugId,
                debugMetadata.symbolicationSource,
                SOURCE_DEBUG_METADATA_SUFFIX,
            ]);

            const debugIdGenerator = new DebugIdGenerator();
            const snippet = debugIdGenerator.generateSourceSnippet(debugMetadata);

            expect(snippet).toContain(expected);
        });

        it('should return snippet that is evaluable without exceptions', () => {
            const debugIdGenerator = new DebugIdGenerator();
            const snippet = debugIdGenerator.generateSourceSnippet(genDebugMetadata());

            expect(() => eval(snippet)).not.toThrow();
        });

        it('should assign debug metadata container to "window" global variable when it is available', () => {
            const debugIdGenerator = new DebugIdGenerator();
            const snippet = debugIdGenerator.generateSourceSnippet(genDebugMetadata());

            const window = {};
            // Node.JS defines global, we need to make it undefined so the snippet won't pick it up
            undefineGlobal(() => eval(snippet));

            expect(Object.keys(window)).toContain(SOURCE_DEBUG_DATA_VARIABLE);
        });

        it('should assign debug metadata container to "global" global variable when it is available', () => {
            const debugIdGenerator = new DebugIdGenerator();
            const snippet = debugIdGenerator.generateSourceSnippet(genDebugMetadata());

            eval(snippet);

            expect(Object.keys(global)).toContain(SOURCE_DEBUG_DATA_VARIABLE);
        });

        it('should assign debug metadata container to "self" global variable when it is available', () => {
            const debugIdGenerator = new DebugIdGenerator();
            const snippet = debugIdGenerator.generateSourceSnippet(genDebugMetadata());

            const self = {};
            // Node.JS defines global, we need to make it undefined so the snippet won't pick it up
            undefineGlobal(() => eval(snippet));

            expect(Object.keys(self)).toContain(SOURCE_DEBUG_DATA_VARIABLE);
        });

        it('should not fail when "window", "self", "global" are undefined', () => {
            const debugIdGenerator = new DebugIdGenerator();
            const snippet = debugIdGenerator.generateSourceSnippet(genDebugMetadata());

            const self = undefined;
            const window = undefined;

            // "Use" the variables so Typescript won't complain about them being unused
            self;
            window;

            // Node.JS defines global, we need to make it undefined so the snippet won't pick it up
            expect(() => undefineGlobal(() => eval(snippet))).not.toThrow();
        });

        it('should assign error stack as key to debug metadata container', () => {
            const debugIdGenerator = new DebugIdGenerator();
            const snippet = debugIdGenerator.generateSourceSnippet(genDebugMetadata());

            eval(snippet);

            const container = global[SOURCE_DEBUG_DATA_VARIABLE as never];
            const keys = Object.keys(container);
            for (const key of keys) {
                expect(key).toMatch(/Error:/);
                expect(key).toMatch(/DebugIdGenerator.spec.ts/);
            }
        });

        it('should assign provided debug ID as value to debug metadata container', () => {
            const expected = genDebugMetadata();

            const debugIdGenerator = new DebugIdGenerator();
            const snippet = debugIdGenerator.generateSourceSnippet(expected);

            eval(snippet);

            const container = global[SOURCE_DEBUG_DATA_VARIABLE as never];
            expect(Object.values(container)).toContainEqual([
                SOURCE_DEBUG_METADATA_PREFIX,
                expected.debugId,
                expected.symbolicationSource,
                SOURCE_DEBUG_METADATA_SUFFIX,
            ]);
        });
    });

    describe('source comment generation', () => {
        it('should return a comment matching regex', () => {
            const regex = new RegExp(`^//# ${SOURCE_DEBUG_ID_COMMENT}=[a-fA-F0-9-]{36}$`);

            const debugIdGenerator = new DebugIdGenerator();
            const comment = debugIdGenerator.generateSourceDebugIdComment(crypto.randomUUID());

            expect(comment).toMatch(regex);
        });

        it('should return a comment with provided debug ID', () => {
            const expected = crypto.randomUUID();

            const debugIdGenerator = new DebugIdGenerator();
            const comment = debugIdGenerator.generateSourceDebugIdComment(expected);

            expect(comment).toContain(expected);
        });

        it('should return a comment that is evaluable without exceptions', () => {
            const debugIdGenerator = new DebugIdGenerator();
            const comment = debugIdGenerator.generateSourceDebugIdComment(crypto.randomUUID());

            expect(() => eval(comment)).not.toThrow();
        });
    });

    describe('source comment get', () => {
        it('should return debugId from source with valid comment', () => {
            const expected = genDebugMetadata();
            const source = [
                'foo',
                'bar',
                `//# ${SOURCE_DEBUG_ID_COMMENT}=${expected.debugId}`,
                `//# sourceMappingURL=baz.js`,
            ].join('\n');

            const debugIdGenerator = new DebugIdGenerator();
            const actual = debugIdGenerator.getSourceDebugMetadata(source);

            expect(actual?.debugId).toEqual(expected.debugId);
        });

        it('should return undefined from source without valid comment', () => {
            const source = ['foo', 'bar', `//# otherStuff=${crypto.randomUUID()}`, `//# sourceMappingURL=baz.js`].join(
                '\n',
            );

            const debugIdGenerator = new DebugIdGenerator();
            const actual = debugIdGenerator.getSourceDebugMetadata(source);

            expect(actual).toBeUndefined();
        });
    });

    describe('source snippet get', () => {
        it('should return debugId from source with valid snippet', () => {
            const expected = genDebugMetadata();
            const debugIdGenerator = new DebugIdGenerator();
            const source = [debugIdGenerator.generateSourceSnippet(expected), 'foo', 'bar'].join('\n');

            const actual = debugIdGenerator.getSourceDebugMetadata(source);

            expect(actual?.debugId).toEqual(expected.debugId);
            expect(actual?.symbolicationSource).toEqual(expected.symbolicationSource);
        });

        it('should return undefined from source without valid snippet', () => {
            const source = ['foo', 'bar'].join('\n');

            const debugIdGenerator = new DebugIdGenerator();
            const actual = debugIdGenerator.getSourceDebugMetadata(source);

            expect(actual).toBeUndefined();
        });
    });

    describe('source map add', () => {
        it('should add key to object', () => {
            const debugIdGenerator = new DebugIdGenerator();
            const actual = debugIdGenerator.addSourceMapDebugId({}, crypto.randomUUID());

            expect(Object.keys(actual)).toContain(SOURCEMAP_DEBUG_ID_KEY);
        });

        it('should add provided debug ID to object', () => {
            const expected = crypto.randomUUID();

            const debugIdGenerator = new DebugIdGenerator();
            const actual = debugIdGenerator.addSourceMapDebugId({}, expected);

            expect(actual[SOURCEMAP_DEBUG_ID_KEY as never]).toEqual(expected);
        });

        it('should return a different object', () => {
            const expected = {};

            const debugIdGenerator = new DebugIdGenerator();
            const actual = debugIdGenerator.addSourceMapDebugId(expected, crypto.randomUUID());

            expect(actual).not.toBe(expected);
        });

        it('should not modify the original object', () => {
            const expected = {};
            const actual = {};

            const debugIdGenerator = new DebugIdGenerator();
            debugIdGenerator.addSourceMapDebugId(actual, crypto.randomUUID());

            expect(actual).toEqual(expected);
        });
    });

    describe('source map get', () => {
        it('should return debugId from sourcemap with key', () => {
            const expected = crypto.randomUUID();
            const sourcemap = {
                [SOURCEMAP_DEBUG_ID_KEY]: expected,
            };

            const debugIdGenerator = new DebugIdGenerator();
            const actual = debugIdGenerator.getSourceMapDebugId(sourcemap);

            expect(actual).toEqual(expected);
        });

        it('should return undefined from sourcemap without key', () => {
            const sourcemap = {
                'some-other-key': crypto.randomUUID(),
            };

            const debugIdGenerator = new DebugIdGenerator();
            const actual = debugIdGenerator.getSourceMapDebugId(sourcemap);

            expect(actual).toBeUndefined();
        });
    });

    describe('replaceDebugMetadata', () => {
        it('should replace old debugId with new debugId', () => {
            const oldDebugId = crypto.randomUUID();
            const newDebugId = crypto.randomUUID();

            const debugIdGenerator = new DebugIdGenerator();
            const oldSource = [
                debugIdGenerator.generateSourceSnippet({ debugId: oldDebugId, symbolicationSource: 'original' }),
                'foo',
                'bar',
            ].join('\n');

            const newSource = debugIdGenerator.replaceDebugMetadata(oldSource, {
                debugId: newDebugId,
                symbolicationSource: 'original',
            });

            expect(newSource).not.toContain(oldDebugId);
            expect(newSource).toContain(newDebugId);
        });

        it('should replace old symbolication source with new symbolication source', () => {
            const debugId = crypto.randomUUID();
            const oldSymbolicationSource = 'original';
            const newSymbolicationSource = crypto.randomUUID();

            const debugIdGenerator = new DebugIdGenerator();
            const oldSource = [
                debugIdGenerator.generateSourceSnippet({ debugId, symbolicationSource: oldSymbolicationSource }),
                'foo',
                'bar',
            ].join('\n');

            const newSource = debugIdGenerator.replaceDebugMetadata(oldSource, {
                debugId,
                symbolicationSource: newSymbolicationSource,
            });

            expect(newSource).not.toContain(oldSymbolicationSource);
            expect(newSource).toContain(newSymbolicationSource);
        });

        it('should replace old snippet with new snippet', () => {
            const debugId = crypto.randomUUID();
            const symbolicationSource = crypto.randomUUID();

            const debugIdGenerator = new DebugIdGenerator();
            const oldSource = [debugIdGenerator.generateOldSourceSnippet(debugId), 'foo', 'bar'].join('\n');

            const newSource = debugIdGenerator.replaceDebugMetadata(
                oldSource,
                {
                    debugId,
                    symbolicationSource,
                },
                debugId,
            );

            const expected = JSON.stringify([
                SOURCE_DEBUG_METADATA_PREFIX,
                debugId,
                symbolicationSource,
                SOURCE_DEBUG_METADATA_SUFFIX,
            ]);

            expect(newSource).toContain(expected);
        });

        it('should replace old debugId with new debugId with non 1-1 snippet', () => {
            const oldDebugId = crypto.randomUUID();
            const newDebugId = crypto.randomUUID();

            const debugIdGenerator = new DebugIdGenerator();
            const oldSource = [
                debugIdGenerator
                    .generateSourceSnippet({ debugId: oldDebugId, symbolicationSource: 'original' })
                    .replace('new Error', 'new Error()'),
                'foo',
                'bar',
            ].join('\n');

            const newSource = debugIdGenerator.replaceDebugMetadata(oldSource, {
                debugId: newDebugId,
                symbolicationSource: 'original',
            });

            expect(newSource).not.toContain(oldDebugId);
            expect(newSource).toContain(newDebugId);
        });

        it('should replace old symbolication source with new symbolication source with non 1-1 snippet', () => {
            const debugId = crypto.randomUUID();
            const oldSymbolicationSource = 'original';
            const newSymbolicationSource = crypto.randomUUID();

            const debugIdGenerator = new DebugIdGenerator();
            const oldSource = [
                debugIdGenerator
                    .generateSourceSnippet({ debugId, symbolicationSource: oldSymbolicationSource })
                    .replace('new Error', 'new Error()'),
                'foo',
                'bar',
            ].join('\n');

            const newSource = debugIdGenerator.replaceDebugMetadata(oldSource, {
                debugId,
                symbolicationSource: newSymbolicationSource,
            });

            expect(newSource).not.toContain(oldSymbolicationSource);
            expect(newSource).toContain(newSymbolicationSource);
        });

        it('should replace old snippet with new snippet with non 1-1 snippet', () => {
            const debugId = crypto.randomUUID();
            const symbolicationSource = crypto.randomUUID();

            const debugIdGenerator = new DebugIdGenerator();
            const oldSource = [
                debugIdGenerator.generateOldSourceSnippet(debugId).replace('new Error', 'new Error()'),
                'foo',
                'bar',
            ].join('\n');

            const newSource = debugIdGenerator.replaceDebugMetadata(
                oldSource,
                {
                    debugId,
                    symbolicationSource,
                },
                debugId,
            );

            const expected = JSON.stringify([
                SOURCE_DEBUG_METADATA_PREFIX,
                debugId,
                symbolicationSource,
                SOURCE_DEBUG_METADATA_SUFFIX,
            ]);

            expect(newSource).toContain(expected);
        });
    });
});
