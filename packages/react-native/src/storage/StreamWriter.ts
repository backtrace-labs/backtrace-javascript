import { WritableStream } from 'web-streams-polyfill';

export interface StreamWriter {
    /**
     * Creates a new stream writer. Returns a key to stream writer.
     * @param source path to the file
     */
    create(source: string): string | undefined;
    /**
     * Appends a string to a file using a stream writer pointed by the key
     * @param key stream writer key
     * @param content content to append
     */
    append(key: string, content: string): Promise<boolean>;

    /**
     * Closes the stream writer
     * @param key stream writer key
     */
    close(key: string): boolean;
}

export class FileWritableStream extends WritableStream {
    constructor(
        public readonly path: string,
        streamWriter: StreamWriter,
    ) {
        super(new NativeUnderlyingSink(path, streamWriter));
    }
}

export class NativeUnderlyingSink implements UnderlyingSink<string> {
    private _streamId?: string;

    constructor(
        public readonly path: string,
        private readonly _streamWriter: StreamWriter,
    ) {}

    public async start() {
        this._streamId = this._streamWriter.create(this.path);
        if (!this._streamId) {
            throw new Error(`Failed to open file ${this.path}.`);
        }
    }

    public close() {
        if (!this._streamId) {
            return;
        }

        if (!this._streamWriter.close(this._streamId)) {
            throw new Error(`Failed to close file ${this.path}.`);
        }
    }

    public async write(chunk: string) {
        if (!this._streamId) {
            throw new Error('File is not open.');
        }

        if (!(await this._streamWriter.append(this._streamId, chunk))) {
            throw new Error(`Failed to write data to file ${this.path}.`);
        }
    }

    public abort() {
        if (!this._streamId) {
            return;
        }

        this._streamWriter.close(this._streamId);
    }
}
