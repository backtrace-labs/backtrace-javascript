export const SOURCE_DEBUG_ID_VARIABLE = '_btDebugIds';
export const SOURCE_DEBUG_ID_COMMENT = 'debugId';
export const SOURCEMAP_DEBUG_ID_KEY = 'debugId';

export class DebugIdGenerator {
    public generateSourceSnippet(uuid: string) {
        return `!function(){try{var e="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},n=(new Error).stack;n&&(e.${SOURCE_DEBUG_ID_VARIABLE}=e.${SOURCE_DEBUG_ID_VARIABLE}||{},e.${SOURCE_DEBUG_ID_VARIABLE}[n]="${uuid}")}catch(e){}}()`;
    }

    public generateSourceComment(uuid: string) {
        return `//# ${SOURCE_DEBUG_ID_COMMENT}=${uuid}`;
    }

    public addSourceMapKey(sourceMap: object, uuid: string) {
        (sourceMap as Record<string, string>)[SOURCEMAP_DEBUG_ID_KEY] = uuid;
        return sourceMap;
    }
}
