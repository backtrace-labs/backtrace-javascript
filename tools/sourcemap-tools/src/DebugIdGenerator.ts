export const SOURCE_DEBUG_ID_VARIABLE = '_btDebugIds';
export const SOURCE_DEBUG_ID_COMMENT = 'debugId';
export const SOURCEMAP_DEBUG_ID_KEY = 'debugId';

/**
 * Matches leading and trailing semicolons, e.g. in `;;foo;bar;;`
 */
const MATCH_SEMICOLONS_REGEX = /^;+|;+$/;

export class DebugIdGenerator {
    public generateSourceSnippet(uuid: string) {
        return `;!function(){try{var k="${SOURCE_DEBUG_ID_VARIABLE}",u="undefined",v="${uuid}",a=function(x){try{x[k]=x[k]||{};x[k][n]=v}catch{}},n=(new Error).stack;n&&(u!=typeof window?a(window):u);n&&(u!=typeof global?a(global):u);n&&(u!=typeof self?a(self):u);n&&(u!=typeof globalThis?a(globalThis):u)}catch{}}();`;
    }

    public generateSourceComment(uuid: string) {
        return `//# ${SOURCE_DEBUG_ID_COMMENT}=${uuid}`;
    }

    public replaceDebugId(source: string, oldDebugId: string, newDebugId: string) {
        const replaceAll = () => source.replace(oldDebugId, newDebugId);

        // Try to replace more safely first
        const oldSourceSnippet = this.generateSourceSnippet(oldDebugId).replace(MATCH_SEMICOLONS_REGEX, '');
        if (source.indexOf(oldSourceSnippet) !== -1) {
            source = source.replace(oldSourceSnippet, this.generateSourceSnippet(newDebugId));
        } else {
            return replaceAll();
        }

        const oldCommentSnippet = this.generateSourceComment(oldDebugId);
        if (source.indexOf(oldCommentSnippet) !== -1) {
            source = source.replace(oldCommentSnippet, this.generateSourceComment(newDebugId));
        } else {
            return replaceAll();
        }

        return source;
    }

    public hasCodeSnippet(source: string, debugId: string) {
        const sourceSnippet = this.generateSourceSnippet(debugId).replace(MATCH_SEMICOLONS_REGEX, '');
        return source.includes(sourceSnippet);
    }

    public hasCommentSnippet(source: string, debugId: string) {
        const commentSnippet = this.generateSourceComment(debugId);
        return source.includes(commentSnippet);
    }

    public getSourceDebugIdFromComment(source: string): string | undefined {
        const regex = new RegExp(`^//# ${SOURCE_DEBUG_ID_COMMENT}=(.+)$`, 'm');
        const match = source.match(regex);
        if (!match) {
            return undefined;
        }

        return match[1];
    }

    public addSourceMapDebugId<T extends object>(sourceMap: T, uuid: string): T & { [SOURCEMAP_DEBUG_ID_KEY]: string } {
        return {
            ...sourceMap,
            [SOURCEMAP_DEBUG_ID_KEY]: uuid,
        };
    }

    public getSourceMapDebugId(sourcemap: object): string | undefined {
        const debugId = (sourcemap as Record<string, unknown>)[SOURCEMAP_DEBUG_ID_KEY];
        if (typeof debugId !== 'string') {
            return undefined;
        }

        return debugId;
    }
}
