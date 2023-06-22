import crypto from 'crypto';
import { DebugIdGenerator, SOURCEMAP_DEBUG_ID_KEY, SOURCE_DEBUG_ID_COMMENT, SOURCE_DEBUG_ID_VARIABLE } from '../src';

describe('DebugIdGenerator', () => {
    describe('source snippet', () => {
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
            delete global[SOURCE_DEBUG_ID_VARIABLE as never];

            // Sanity checks
            expect(typeof window).toEqual('undefined');
            expect(typeof self).toEqual('undefined');
        });

        it('should return snippet containing passed UUID in quotes', () => {
            const expected = crypto.randomUUID();

            const debugIdGenerator = new DebugIdGenerator();
            const snippet = debugIdGenerator.generateSourceSnippet(expected);

            expect(snippet).toContain(`"${expected}"`);
        });

        it('should return snippet that is evaulable without exceptions', () => {
            const debugIdGenerator = new DebugIdGenerator();
            const snippet = debugIdGenerator.generateSourceSnippet(crypto.randomUUID());

            expect(() => eval(snippet)).not.toThrow();
        });

        it('should assign debug ID container to "window" global variable when it is available', () => {
            const debugIdGenerator = new DebugIdGenerator();
            const snippet = debugIdGenerator.generateSourceSnippet(crypto.randomUUID());

            const window = {};
            // Node.JS defines global, we need to make it undefined so the snippet won't pick it up
            undefineGlobal(() => eval(snippet));

            expect(Object.keys(window)).toContain(SOURCE_DEBUG_ID_VARIABLE);
        });

        it('should assign debug ID container to "global" global variable when it is available', () => {
            const debugIdGenerator = new DebugIdGenerator();
            const snippet = debugIdGenerator.generateSourceSnippet(crypto.randomUUID());

            eval(snippet);

            expect(Object.keys(global)).toContain(SOURCE_DEBUG_ID_VARIABLE);
        });

        it('should assign debug ID container to "self" global variable when it is available', () => {
            const debugIdGenerator = new DebugIdGenerator();
            const snippet = debugIdGenerator.generateSourceSnippet(crypto.randomUUID());

            const self = {};
            // Node.JS defines global, we need to make it undefined so the snippet won't pick it up
            undefineGlobal(() => eval(snippet));

            expect(Object.keys(self)).toContain(SOURCE_DEBUG_ID_VARIABLE);
        });

        it('should not fail when "window", "self", "global" are undefined', () => {
            const debugIdGenerator = new DebugIdGenerator();
            const snippet = debugIdGenerator.generateSourceSnippet(crypto.randomUUID());

            const self = undefined;
            const window = undefined;

            // "Use" the variables so Typescript won't complain about them being unused
            self;
            window;

            // Node.JS defines global, we need to make it undefined so the snippet won't pick it up
            expect(() => undefineGlobal(() => eval(snippet))).not.toThrow();
        });

        it('should assign error stack as key to debug ID container', () => {
            const debugIdGenerator = new DebugIdGenerator();
            const snippet = debugIdGenerator.generateSourceSnippet(crypto.randomUUID());

            eval(snippet);

            const container = global[SOURCE_DEBUG_ID_VARIABLE as never];
            const keys = Object.keys(container);
            for (const key of keys) {
                expect(key).toMatch(/Error:/);
                expect(key).toMatch(/\/DebugIdGenerator.spec.ts/);
            }
        });

        it('should assign provided debug ID as value to debug ID container', () => {
            const expected = crypto.randomUUID();

            const debugIdGenerator = new DebugIdGenerator();
            const snippet = debugIdGenerator.generateSourceSnippet(expected);

            eval(snippet);

            const container = global[SOURCE_DEBUG_ID_VARIABLE as never];
            expect(Object.values(container)).toContain(expected);
        });
    });

    describe('source comment', () => {
        it('should return a comment matching regex', () => {
            const regex = new RegExp(`^//# ${SOURCE_DEBUG_ID_COMMENT}=[a-fA-F0-9-]{36}$`);

            const debugIdGenerator = new DebugIdGenerator();
            const comment = debugIdGenerator.generateSourceComment(crypto.randomUUID());

            expect(comment).toMatch(regex);
        });

        it('should return a comment with provided debug ID', () => {
            const expected = crypto.randomUUID();

            const debugIdGenerator = new DebugIdGenerator();
            const comment = debugIdGenerator.generateSourceComment(expected);

            expect(comment).toContain(expected);
        });

        it('should return a comment that is evaluable without exceptions', () => {
            const debugIdGenerator = new DebugIdGenerator();
            const comment = debugIdGenerator.generateSourceComment(crypto.randomUUID());

            expect(() => eval(comment)).not.toThrow();
        });
    });

    describe('source map', () => {
        it('should add key to object', () => {
            const debugIdGenerator = new DebugIdGenerator();
            const actual = debugIdGenerator.addSourceMapKey({}, crypto.randomUUID());

            expect(Object.keys(actual)).toContain(SOURCEMAP_DEBUG_ID_KEY);
        });

        it('should add provided debug ID to object', () => {
            const expected = crypto.randomUUID();

            const debugIdGenerator = new DebugIdGenerator();
            const actual = debugIdGenerator.addSourceMapKey({}, expected);

            expect(actual[SOURCEMAP_DEBUG_ID_KEY as never]).toEqual(expected);
        });

        it('should return a different object', () => {
            const expected = {};

            const debugIdGenerator = new DebugIdGenerator();
            const actual = debugIdGenerator.addSourceMapKey(expected, crypto.randomUUID());

            expect(actual).not.toBe(expected);
        });

        it('should not modify the original object', () => {
            const expected = {};
            const actual = {};

            const debugIdGenerator = new DebugIdGenerator();
            debugIdGenerator.addSourceMapKey(actual, crypto.randomUUID());

            expect(actual).toEqual(expected);
        });
    });
});
