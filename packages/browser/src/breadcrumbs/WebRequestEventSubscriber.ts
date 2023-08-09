import {
    BreadcrumbLogLevel,
    BreadcrumbsEventSubscriber,
    BreadcrumbsManager,
    BreadcrumbType,
} from '@backtrace/sdk-core';

export class WebRequestEventSubscriber implements BreadcrumbsEventSubscriber {
    private _xmlHttpRequestOriginalOpenMethod?: typeof XMLHttpRequest.prototype.open;
    private _fetchOriginalMethod?: typeof window.fetch;

    public start(breadcrumbsManager: BreadcrumbsManager): void {
        if ((breadcrumbsManager.breadcrumbsType & BreadcrumbType.Http) !== BreadcrumbType.Http) {
            return;
        }
        const xmlHttpRequestOriginalOpenMethod = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (
            method: string,
            url: string | URL,
            async?: boolean,
            username?: string | null,
            password?: string | null,
        ) {
            breadcrumbsManager.addBreadcrumb(
                `Sending an HTTP to ${method} request to ${url}.`,
                BreadcrumbLogLevel.Debug,
                BreadcrumbType.Http,
                {
                    async,
                },
            );
            xmlHttpRequestOriginalOpenMethod.call(this, method, url, async || true, username, password);
        };
        this._xmlHttpRequestOriginalOpenMethod = xmlHttpRequestOriginalOpenMethod;

        const fetchOriginalMethod = window.fetch;

        window.fetch = async (...args) => {
            const [resource, config] = args;

            const response = await fetchOriginalMethod(resource, config);

            breadcrumbsManager.addBreadcrumb(
                `Sending an HTTP ${config?.method} to request to ${resource}. Response status: ${response.status}`,
                BreadcrumbLogLevel.Debug,
                BreadcrumbType.Http,
                {
                    url: resource.toString(),
                    method: config?.method ?? 'unknown',
                    headers: config?.mode,
                    referrer: config?.referrer,
                },
            );

            return response;
        };

        this._fetchOriginalMethod = fetchOriginalMethod;
    }

    public dispose(): void {
        if (this._fetchOriginalMethod) {
            window.fetch = this._fetchOriginalMethod;
        }

        if (this._xmlHttpRequestOriginalOpenMethod) {
            XMLHttpRequest.prototype.open = this._xmlHttpRequestOriginalOpenMethod;
        }
    }
}
