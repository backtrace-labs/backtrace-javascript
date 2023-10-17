import { log } from './output';

export type TrasnactionFn = [
    description: string,
    fn: (context: unknown) => Promise<unknown> | unknown,
    undo?: (context: unknown) => Promise<unknown> | unknown,
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const noop: TrasnactionFn = [
    'noop',
    () => {
        // Do nothing
    },
];

export function transaction(...fns: TrasnactionFn[]) {
    return async (context?: unknown) => {
        const undos: ((context: unknown) => Promise<unknown> | unknown)[] = [];

        for (const [description, fn, undo] of fns) {
            try {
                context = await fn(context);
                if (undo) {
                    undos.push(undo);
                }
            } catch (err) {
                log(`ERROR! Failed to run "${description}". Rollbacking...`);
                try {
                    for (const undoFn of undos.reverse()) {
                        await undoFn(context);
                    }
                } catch (undoErr) {
                    log('Failed to rollback changes!');
                    log(`Rollback error: ${undoErr instanceof Error ? undoErr.stack : undoErr}`);
                    throw err;
                }

                throw err;
            }
        }
    };
}
