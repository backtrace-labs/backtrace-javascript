import { $, browser, expect } from '@wdio/globals';
import { RXID_REGEX } from '../../__helpers/rxid.js';
import { DIRECT_SUBMIT_URL, SUBMIT_LAYER_URL } from '../../__helpers/urls.js';

export function addSubmitTests(getUrl: (submitUrl: string) => string, buttonSelector: string) {
    async function testSubmit(submitUrl: string) {
        await browser.url(getUrl(submitUrl));

        const button = $(buttonSelector);
        await button.click();

        const statusElement = $('#status');
        // the app starts at "waiting", so wait for a terminal status, not just "not running"
        await browser.waitUntil(async () => {
            const status = await statusElement.getText();
            return status !== 'waiting' && status !== 'running';
        });

        await expect(statusElement).toHaveText('Ok');
        await expect($('#rxid')).toHaveText(RXID_REGEX);
    }

    it('should submit an error to submit layer URL', async () => {
        await testSubmit(SUBMIT_LAYER_URL);
    });

    it('should submit an error to direct layer URL', async () => {
        await testSubmit(DIRECT_SUBMIT_URL);
    });
}
