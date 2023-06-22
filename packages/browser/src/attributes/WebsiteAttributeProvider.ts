import { BacktraceAttributeProvider } from '@backtrace/sdk-core';
import { TimeHelper } from '@backtrace/sdk-core/lib/common/TimeHelper';

const PAGE_START_TIME = TimeHelper.now();

export class WebsiteAttributeProvider implements BacktraceAttributeProvider {
    public get type(): 'scoped' | 'dynamic' {
        return 'scoped';
    }
    public get(): Record<string, unknown> {
        return {
            application: document.title || 'unknown', // application is required. Using unknown string if it is not found.
            'process.age': Math.floor((new Date().getTime() - PAGE_START_TIME) / 1000),
            hostname: window.location && window.location.hostname,
            referer: window.location && window.location.href,
            'location.port': document.location.port,
            'location.protocol': document.location.protocol,
            'location.origin': window.location.origin,
            'location.href': window.location.href || document.URL,
            language: navigator.language,
            'browser.platform': navigator.platform,
            'cookies.enable': navigator.cookieEnabled,
            'document.domain': document.domain,
            'document.baseURI': document.baseURI,
            'document.title': document.title,
            'document.referrer': document.referrer,
            'localstorage.enable': !!window.localStorage,
        };
    }
}
