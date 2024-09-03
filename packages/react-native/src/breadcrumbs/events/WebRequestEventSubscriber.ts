import {
    BreadcrumbLogLevel,
    BreadcrumbType,
    type BacktraceBreadcrumbs,
    type BreadcrumbsEventSubscriber,
} from '@backtrace/sdk-core';

export class WebRequestEventSubscriber implements BreadcrumbsEventSubscriber {
    private _xmlHttpRequestOriginalOpenMethod?: typeof XMLHttpRequest.prototype.open;
    private _fetchOriginalMethod?: typeof window.fetch;

    public start(backtraceBreadcrumbs: BacktraceBreadcrumbs): void {
        if ((backtraceBreadcrumbs.breadcrumbsType & BreadcrumbType.Http) !== BreadcrumbType.Http) {
            return;
        }
        const xmlHttpRequestOriginalOpenMethod = XMLHttpRequest.prototype.open;

        XMLHttpRequest.prototype.open = function (
            method: string,
            url: string,
            async?: boolean,
            username?: string | null,
            password?: string | null,
        ) {
            const readyStateChangeCallback = this.onreadystatechange;
            this.onreadystatechange = (event: Event) => {
                if (this.readyState === XMLHttpRequest.DONE) {
                    backtraceBreadcrumbs.addBreadcrumb(
                        `Sent an HTTP ${method} request to ${url}. Response status code: ${this.status}`,
                        BreadcrumbLogLevel.Debug,
                        BreadcrumbType.Http,
                        {
                            method,
                            url: url.toString(),
                            statusCode: this.status,
                        },
                    );
                }

                readyStateChangeCallback?.apply(this, [event]);
            };

            xmlHttpRequestOriginalOpenMethod.call(this, method, url, async || true, username, password);
        };

        this._xmlHttpRequestOriginalOpenMethod = xmlHttpRequestOriginalOpenMethod;

        const fetchOriginalMethod = window.fetch;

        window.fetch = async function (resource, config) {
            const method = config?.method ?? 'GET';
            const attributes = {
                url: resource.toString(),
                method: method,
                referrer: config?.referrer,
            };

            try {
                const result = await fetchOriginalMethod(resource, config);
                backtraceBreadcrumbs.addBreadcrumb(
                    `Sent an HTTP ${method} request to ${resource}. Response status code: ${result.status}`,
                    BreadcrumbLogLevel.Debug,
                    BreadcrumbType.Http,
                    {
                        ...attributes,
                        statusCode: result.status,
                    },
                );

                return result;
            } catch (e) {
                backtraceBreadcrumbs.addBreadcrumb(
                    `HTTP ${method} failure on request to ${resource}. Reason: ${
                        e instanceof Error ? e.message : (e?.toString() ?? 'unknown')
                    }`,
                    BreadcrumbLogLevel.Warning,
                    BreadcrumbType.Http,
                    attributes,
                );
                throw e;
            }
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
