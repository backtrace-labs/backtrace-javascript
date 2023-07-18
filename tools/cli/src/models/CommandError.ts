import { Command } from '../commands/Command';

export interface CommandError {
    readonly command: Command;
    readonly stack?: Command[];
    readonly error: string | Error;
}
