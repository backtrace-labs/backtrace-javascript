import { Extractor, ExtractorConfig } from '@microsoft/api-extractor';

/**
 * Runs `@microsoft/api-extractor` with provided config file.
 * @param {string} configPath - path to api-extractor.json.
 * @returns
 */
export function apiExtractor(configPath = './api-extractor.json') {
    return {
        name: 'apiExtractor',
        async closeBundle() {
            const extractorConfig = ExtractorConfig.loadFileAndPrepare(configPath);
            const extractorResult = Extractor.invoke(extractorConfig);

            if (!extractorResult.succeeded) {
                this.warn(
                    `API Extractor completed with ${extractorResult.errorCount} errors` +
                        ` and ${extractorResult.warningCount} warnings`,
                );
            }
        },
    };
}
