import fs from 'fs';
import path from 'path';

interface SearchOptions {
    readonly recursive?: boolean;
    readonly match?: RegExp;
}

export class FileFinder {
    public async find(dir: string, options?: SearchOptions): Promise<string[]> {
        const result: string[] = [];
        const files = await fs.promises.readdir(dir);

        for (const file of files) {
            const fullPath = path.resolve(dir, file);
            const stat = await fs.promises.stat(fullPath);
            if (stat.isDirectory()) {
                if (options?.recursive) {
                    files.push(...(await this.find(fullPath, options)));
                }

                continue;
            }

            if (!options?.match || fullPath.match(options.match)) {
                result.push(fullPath);
            }
        }

        return result;
    }
}
