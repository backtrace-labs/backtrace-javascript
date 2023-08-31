export class CauseExampleError extends Error {
    constructor(message: string, public cause?: Error | object) {
        super(message);
    }
}
