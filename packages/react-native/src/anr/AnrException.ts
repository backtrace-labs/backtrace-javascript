export class AnrException extends Error {
    public readonly name = 'Hang';

    constructor(
        public readonly message: string,
        public readonly stack: string,
    ) {
        super(message);
    }
}
