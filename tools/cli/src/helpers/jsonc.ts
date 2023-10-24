import { Err, Ok, Result } from '@backtrace/sourcemap-tools';
import { jsonc } from 'jsonc';

export function parseJSONC<T>(content: string): Result<T, string> {
    const [err, result] = jsonc.safe.parse(content);
    return !err ? Ok(result) : Err(`failed to parse content: ${err.message}`);
}
