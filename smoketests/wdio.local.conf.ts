import { config as sauceConfig } from './wdio.conf.js';

const browser = process.env.SMOKETESTS_BROWSER ?? 'chrome';

const capabilities: Record<string, WebdriverIO.Capabilities> = {
    chrome: {
        browserName: 'chrome',
        'goog:chromeOptions': {
            args: ['--headless=new', '--disable-gpu', '--window-size=1280,800'],
        },
    },
    firefox: {
        browserName: 'firefox',
        'moz:firefoxOptions': {
            args: ['-headless'],
            ...(process.env.SMOKETESTS_FIREFOX_BINARY ? { binary: process.env.SMOKETESTS_FIREFOX_BINARY } : {}),
        },
    },
    safari: {
        browserName: 'safari',
    },
};

const capability = capabilities[browser];
if (!capability) {
    throw new Error(`unsupported SMOKETESTS_BROWSER "${browser}", expected chrome, firefox or safari`);
}

export const config: typeof sauceConfig = {
    ...sauceConfig,
    user: undefined,
    key: undefined,
    services: (sauceConfig.services ?? []).filter((service) => !(Array.isArray(service) && service[0] === 'sauce')),
    capabilities: [capability],
    // safaridriver serves one session at a time
    ...(browser === 'safari' ? { maxInstances: 1 } : {}),
};
