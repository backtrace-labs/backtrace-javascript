export async function toArray<T>(generator: AsyncGenerator<T>): Promise<T[]> {
    const result: T[] = [];
    for await (const element of generator) {
        result.push(element);
    }
    return result;
}
