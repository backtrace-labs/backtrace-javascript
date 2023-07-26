export class NodeOptionReader {
    /**
     * Read option based on the option name. If the option doesn't start with `--`
     * additional prefix will be added.
     * @param optionName option name
     * @returns option value
     */
    public static read(
        optionName: string,
        argv: string[] = process.execArgv,
        nodeOptions: string | undefined = process.env['NODE_OPTIONS'],
    ): string | boolean | undefined {
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

        const commandOption = argv.find((n) => n.startsWith(optionName));

        function readOptionValue(optionName: string, commandOption: string): string | boolean | undefined {
            let result = commandOption.substring(optionName.length);
            if (!result) {
                return true;
            }
            if (result.startsWith('=')) {
                result = result.substring(1);
            }

            return result;
        }

        if (commandOption) {
            return readOptionValue(optionName, commandOption);
        }

        if (!nodeOptions) {
            return undefined;
        }

        const nodeOption = nodeOptions.split(' ').find((n) => n.startsWith(optionName));

        if (!nodeOption) {
            return undefined;
        }
        return readOptionValue(optionName, nodeOption);
    }
}
