import { $, browser, expect } from '@wdio/globals';
import { RXID_REGEX } from '../../__helpers/rxid.js';
import { DIRECT_SUBMIT_URL, SUBMIT_LAYER_URL } from '../../__helpers/urls.js';

function getUrl(submitUrl: string) {
    return `http://localhost:4567/react-ts-esm/lib/index.html?url=${encodeURIComponent(submitUrl)}`;
}

describe('react-ts-esm', () => {
    it('should submit an error to submit layer URL', async () => {
        await browser.url(getUrl(SUBMIT_LAYER_URL));

        const statusElement = $('#status');
        await browser.waitUntil(async () => (await statusElement.getText()) !== 'loading');

        await expect(statusElement).toHaveText('Ok');
        await expect($('#rxid')).toHaveText(RXID_REGEX);
    });

    it('should submit an error to direct submit URL', async () => {
        await browser.url(getUrl(DIRECT_SUBMIT_URL));

        const statusElement = $('#status');
        await browser.waitUntil(async () => (await statusElement.getText()) !== 'loading');

        await expect(statusElement).toHaveText('Ok');
        await expect($('#rxid')).toHaveText(RXID_REGEX);
    });

    it('should fail submitting to an invalid URL', async () => {
        await browser.url(getUrl('http://localhost:12345'));

        const statusElement = $('#status');
        await browser.waitUntil(async () => (await statusElement.getText()) !== 'loading');

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
