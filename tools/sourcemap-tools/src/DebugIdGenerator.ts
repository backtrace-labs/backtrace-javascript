export const SOURCE_DEBUG_ID_VARIABLE = '_btDebugIds';
export const SOURCE_DEBUG_DATA_VARIABLE = '_btDebugData';
export const SOURCE_DEBUG_ID_COMMENT = 'debugId';
export const SOURCE_SYMBOLICATION_SOURCE_COMMENT = 'x-bt-symbolication-source';
export const SOURCEMAP_DEBUG_ID_KEY = 'debugId';
export const SOURCE_DEBUG_METADATA_PREFIX = '__BT_';
export const SOURCE_DEBUG_METADATA_SUFFIX = '_BT__';

/**
 * Matches leading and trailing semicolons, e.g. in `;;foo;bar;;`
 */
const MATCH_SEMICOLONS_REGEX = /^;+|;+$/;

export interface DebugMetadata {
    readonly debugId: string;
    readonly symbolicationSource?: string;
}

interface DebugMetadataMatch extends DebugMetadata {
    readonly raw: string;
}

export class DebugIdGenerator {
    public generateSourceSnippet(debugMetadata: DebugMetadata) {
        const json = this.debugMetadataToJson(debugMetadata);
        return `;!function(){try{var k="${SOURCE_DEBUG_DATA_VARIABLE}",u="undefined",v=${json},a=function(x){try{x[k]=x[k]||{};x[k][n]=v}catch{}},n=(new Error).stack;n&&(u!=typeof window?a(window):u);n&&(u!=typeof global?a(global):u);n&&(u!=typeof self?a(self):u);n&&(u!=typeof globalThis?a(globalThis):u)}catch{}}();`;
    }

    /**
     * @deprecated use only for testing
     */
    public generateOldSourceSnippet(debugId: string) {
        return `;!function(){try{var k="${SOURCE_DEBUG_ID_VARIABLE}",u="undefined",v="${debugId}",a=function(x){try{x[k]=x[k]||{};x[k][n]=v}catch{}},n=(new Error).stack;n&&(u!=typeof window?a(window):u);n&&(u!=typeof global?a(global):u);n&&(u!=typeof self?a(self):u);n&&(u!=typeof globalThis?a(globalThis):u)}catch{}}();`;
    }

    public generateSourceDebugIdComment(uuid: string) {
        return `//# ${SOURCE_DEBUG_ID_COMMENT}=${uuid}`;
    }

    public replaceDebugMetadata(source: string, newMetadata: DebugMetadata, oldDebugId?: string) {
        const foundOldMetadata = this.findDebugMetadata(source);
        if (!foundOldMetadata) {
            if (!oldDebugId) {
                return source;
            }

            // assume old source snippets
            const replaceAllDebugIds = (source: string) => source.replace(oldDebugId, newMetadata.debugId);
            const replaceDebugIdWithMetadata = (source: string) => {
                const regexp = new RegExp(`["']${oldDebugId}["']`);
                const index = source.search(regexp);
                if (index === -1) {
                    return replaceAllDebugIds(source);
                }

                const variableIndex = source.substring(0, index).lastIndexOf(SOURCE_DEBUG_ID_VARIABLE);
                if (variableIndex === -1 || Math.abs(variableIndex - index) > 100) {
                    return replaceAllDebugIds(source);
                }

                return (
                    source.substring(0, variableIndex) +
                    SOURCE_DEBUG_DATA_VARIABLE +
                    source
                        .substring(variableIndex + SOURCE_DEBUG_ID_VARIABLE.length)
                        .replace(regexp, this.debugMetadataToJson(newMetadata))
                );
            };

            // Try to replace more safely first
            const oldSourceSnippet = this.generateOldSourceSnippet(oldDebugId).replace(MATCH_SEMICOLONS_REGEX, '');
            if (source.indexOf(oldSourceSnippet) !== -1) {
                source = source.replace(oldSourceSnippet, this.generateSourceSnippet(newMetadata));
            } else {
                source = replaceDebugIdWithMetadata(source);
            }

            const oldCommentSnippet = this.generateOldSourceSnippet(oldDebugId);
            if (source.indexOf(oldCommentSnippet) !== -1) {
                source = source.replace(oldCommentSnippet, this.generateSourceDebugIdComment(newMetadata.debugId));
            } else {
                source = replaceAllDebugIds(source);
            }

            return source;
        }

        return source.replace(foundOldMetadata.raw, this.debugMetadataToJson(newMetadata));
    }

    public hasCodeSnippet(source: string, debugId: string) {
        const metadata = this.findDebugMetadata(source);
        if (metadata && metadata.debugId === debugId) {
            return true;
        }

        const sourceSnippet = this.generateOldSourceSnippet(debugId).replace(MATCH_SEMICOLONS_REGEX, '');
        return source.includes(sourceSnippet);
    }

    public hasCommentSnippet(source: string, debugId: string) {
        const commentSnippet = this.generateSourceDebugIdComment(debugId);
        return source.includes(commentSnippet);
    }

    public getSourceDebugMetadata(source: string): DebugMetadata | undefined {
        const metadata = this.findDebugMetadata(source);
        if (metadata) {
            return metadata;
        }

        const regex = new RegExp(`^//# ${SOURCE_DEBUG_ID_COMMENT}=(.+)$`, 'm');
        const match = source.match(regex);
        if (!match) {
            return undefined;
        }

        return {
            debugId: match[1],
        };
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

    private findDebugMetadata(str: string): DebugMetadataMatch | undefined {
        let prefixIndex = str.indexOf(SOURCE_DEBUG_METADATA_PREFIX);

        while (prefixIndex !== -1) {
            const suffixIndex = str.indexOf(SOURCE_DEBUG_METADATA_SUFFIX);
            if (suffixIndex === -1) {
                return undefined;
            }

            const prePrefix = str.substring(0, prefixIndex);
            const postSuffix = str.substring(suffixIndex);

            const openArrayIndex = prePrefix.lastIndexOf('[');
            const closeArrayIndex = postSuffix.indexOf(']');

            const json = str.substring(openArrayIndex, suffixIndex + closeArrayIndex + 1);
            try {
                const parsed = JSON.parse(json);
                if (
                    Array.isArray(parsed) &&
                    parsed[0] === SOURCE_DEBUG_METADATA_PREFIX &&
                    parsed[parsed.length - 1] === SOURCE_DEBUG_METADATA_SUFFIX
                ) {
                    const [, debugId, symbolicationSource] = parsed;
                    return {
                        raw: json,
                        debugId,
                        symbolicationSource,
                    };
                }
            } catch {
                // just continue
            }

            prefixIndex = str.indexOf(SOURCE_DEBUG_METADATA_PREFIX, suffixIndex + 1);
        }
    }

    private debugMetadataToJson(metadata: DebugMetadata) {
        return JSON.stringify([
            SOURCE_DEBUG_METADATA_PREFIX,
            metadata.debugId,
            metadata.symbolicationSource,
            SOURCE_DEBUG_METADATA_SUFFIX,
        ]);
    }
}
