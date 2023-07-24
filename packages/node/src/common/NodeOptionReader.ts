export class NodeOptionReader {
    /**
     * Read option based on the option name. If the option doesn't start with `--`
     * additional prefix will be added.
     * @param optionName option name
     * @returns option value
     */
    public static read(
        optionName: string,
        argv: string[] = process.argv,
        nodeOptions: string | undefined = process.env['NODE_OPTIONS'],
    ): string | undefined {
        /**
         * exec argv overrides NODE_OPTIONS.
         * for example:
         * yarn start = NODEW_ENV=production node --unhandled-rejections=none ./lib/index.js
         * NODE_OPTIONS='--unhandled-rejections=throw' yarn start
         *
         * Even if NODE_OPTIONS have unhandled rejections set to throw, the value passed in argv
         * will be used.
         */
        if (!optionName.startsWith('--')) {
            optionName = '--' + optionName;
        }

        const fullCommandOption = optionName + '=';

        const commandOption = argv.find((n) => n.startsWith(fullCommandOption));
        if (commandOption) {
            return commandOption.substring(fullCommandOption.length);
        }

        if (!nodeOptions) {
            return undefined;
        }

        const nodeOption = nodeOptions.split(' ').find((n) => n.startsWith(fullCommandOption));

        return nodeOption?.substring(fullCommandOption.length);
    }
}
