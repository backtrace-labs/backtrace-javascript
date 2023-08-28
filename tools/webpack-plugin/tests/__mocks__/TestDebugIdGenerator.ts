import { DebugIdGenerator, SOURCEMAP_DEBUG_ID_KEY } from '@backtrace-labs/sourcemap-tools';

export class TestDebugIdGenerator implements DebugIdGenerator {
    public generateSourceSnippet(): string {
        return `console.log("Source snippet");`;
    }

    public generateSourceComment(): string {
        return `//# Source comment`;
    }

    public addSourceMapKey<T extends object>(sourceMap: T): T & { [SOURCEMAP_DEBUG_ID_KEY]: string } {
        return {
            ...sourceMap,
            [SOURCEMAP_DEBUG_ID_KEY]: 'Source map key',
        };
    }

    public static testForSourceSnippet(content: string) {
        expect(content).toContain(new TestDebugIdGenerator().generateSourceSnippet());
    }

    public static testForSourceComment(content: string) {
        expect(content).toContain(new TestDebugIdGenerator().generateSourceComment());
    }

    public static testForSourceMapKey(sourceMap: object | string) {
        if (typeof sourceMap === 'string') {
            sourceMap = JSON.parse(sourceMap);
        }

        const expected = new TestDebugIdGenerator().addSourceMapKey({});
        expect(sourceMap).toMatchObject(expected);
    }
}
