import type { Options } from '@wdio/types';

export const config: Options.Testrunner & {
    capabilities: WebdriverIO.Capabilities[];
} = {
    runner: 'local',
    tsConfigPath: './tsconfig.json',

    user: process.env.SMOKETESTS_SAUCE_USERNAME,
    key: process.env.SMOKETESTS_SAUCE_ACCESS_KEY,

    region: 'eu',
    specs: ['./tests/wdio/**/*.spec.ts'],
    exclude: [],
    maxInstances: 10,
    capabilities: [
        {
            browserName: 'chrome',
            platformName: 'Windows 11',
        },
        {
            browserName: 'firefox',
            platformName: 'Windows 11',
        },
        {
            browserName: 'microsoftedge',
            platformName: 'Windows 11',
        },
        {
            browserName: 'safari',
            platformName: 'macOS 13',
        },
    ],

    logLevel: 'info',
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    services: [
        [
            'sauce',
            {
                sauceConnect: true,
                setJobName(config, capabilities) {
                    return `@backtrace/javascript smoketests for ${capabilities.browserName} on ${capabilities.platformName}`;
                },
            },
        ],
        [
            'static-server',
            {
                folders: [{ mount: '/', path: './packages' }],
            },
        ],
    ],
    framework: 'mocha',
    reporters: ['dot', 'spec'],
    mochaOpts: {
        ui: 'bdd',
        timeout: 120000,
    },
};
