export const IpcEvents = {
    streamEvent(name: string, event: string) {
        return `${name}_${event}`;
    },
} as const;
