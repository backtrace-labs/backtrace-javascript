export class ContentAppender {
    public appendToJSON(json: string, keyValues: object) {
        for (const [key, value] of Object.entries(keyValues)) {
            // Replace closing bracket with additional key-values
            // Keep the matched whitespaces at the end
            json = json.replace(/}(\s*)$/, `,"${key}":${JSON.stringify(value)}}$1`);
        }

        return json;
    }
}
