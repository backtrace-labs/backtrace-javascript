import fs from 'fs';
import path from 'path';
import { ResultPromise } from './models/AsyncResult';
import { Ok } from './models/Result';

interface SearchOptions {
    readonly recursive?: boolean;
    readonly match?: RegExp;
}

export class FileFinder {
    public async find(dir: string, options?: SearchOptions): ResultPromise<string[], string> {
        const result: string[] = [];
        const files = await fs.promises.readdir(dir);

        for (const file of files) {
            const fullPath = path.resolve(dir, file);
            const stat = await fs.promises.stat(fullPath);
            if (stat.isDirectory()) {
                if (options?.recursive) {
                    const innerFindResult = await this.find(fullPath, options);
                    if (innerFindResult.isErr()) {
                        return innerFindResult;
                    }
                    files.push(...innerFindResult.data);
                }

                continue;
            }

            if (!options?.match || fullPath.match(options.match)) {
                result.push(fullPath);
            }
        }

        return Ok(result);
    }
}
