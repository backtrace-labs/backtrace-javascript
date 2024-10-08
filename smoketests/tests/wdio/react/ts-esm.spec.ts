import { $, browser, expect } from '@wdio/globals';
import { addSubmitTests } from './tests.js';

function getUrl(submitUrl: string) {
    return `http://localhost:4567/react-ts-esm/lib/index.html?url=${encodeURIComponent(submitUrl)}`;
}

describe('react-ts-esm', () => {
    describe('send message', () => {
        addSubmitTests(getUrl, '#test-message');
    });

    describe('send exception', () => {
        addSubmitTests(getUrl, '#test-exception');
    });

    describe('unhandled exception', () => {
        addSubmitTests(getUrl, '#test-unhandled-exception');
    });

    describe('unhandled rejection', () => {
        addSubmitTests(getUrl, '#test-unhandled-rejection');
    });

    it('should fail submitting to an invalid URL', async () => {
        await browser.url(getUrl('http://localhost:12345'));

        const button = $('#test-message');
        await button.click();

        const statusElement = $('#status');
        await browser.waitUntil(async () => (await statusElement.getText()) !== 'running');

        const errorElement = $('#error');
        switch (browser.capabilities.browserName?.toLowerCase()) {
            case 'firefox':
                await expect(errorElement).toHaveText('NetworkError when attempting to fetch resource.');
                break;
            case 'safari':
                await expect(errorElement).toHaveText('Load failed');
                break;
            default:
                await expect(errorElement).toHaveText('Failed to fetch');
                break;
        }
    });
});
