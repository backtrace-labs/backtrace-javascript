export class AndroidUnhandledException extends Error {
    constructor(public readonly name: string, public readonly message: string, public readonly stack: string) {
        super(message);
    }
}
