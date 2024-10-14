export function parseOptions<O extends readonly string[]>(options: O, argv?: string[]) {
    argv ??= process.argv.slice(2);
    const positional = argv.filter((v) => !options.some((o) => v.startsWith(o)));

    const optionValues = options.reduce(
        (val, k) => {
            const opt = argv.find((v) => v.startsWith(`${k}=`));
            if (opt) {
                val[k as keyof typeof val] = opt.replace(`${k}=`, '');
            } else {
                val[k as keyof typeof val] = argv.includes(k);
            }

            return val;
        },
        {} as Record<(typeof options)[number], boolean | string>,
    );

    return [positional, optionValues] as const;
}
