import { Command } from './commands/Command';

const mainCommand: Command = new Command({
    name: '',
}).option({
    name: 'help',
    type: Boolean,
    alias: 'h',
    global: true,
    description: 'Displays this help message.',
});

(async () => {
    const result = await mainCommand.run(process.argv);
    if (result.isOk()) {
        process.exit(result.data);
    } else {
        console.error(`Error: ${result.data.error}`);
        result.data.command.displayHelp(result.data.stack);
        process.exit(1);
    }
})();
