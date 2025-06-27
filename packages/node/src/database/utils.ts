export function assertDatabasePath(path: string) {
    if (!path) {
        throw new Error(
            'Missing mandatory path to the database. Please define the database.path option in the configuration.',
        );
    }
    return path;
}
