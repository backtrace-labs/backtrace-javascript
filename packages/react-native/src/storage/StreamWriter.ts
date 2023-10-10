export interface StreamWriter {
    /**
     * Creates a new stream writer. Returns a key to stream writer.
     * @param source path to the file
     */
    create(source: string): string;
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
