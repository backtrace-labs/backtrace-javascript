import {
    BreadcrumbLogLevel,
    BreadcrumbType,
    type BacktraceBreadcrumbs,
    type BreadcrumbsEventSubscriber,
} from '@backtrace/sdk-core';
import { Dimensions, type NativeEventSubscription } from 'react-native';

export class DimensionChangeBreadcrumbSubscriber implements BreadcrumbsEventSubscriber {
    private _nativeEventSubscriptions: NativeEventSubscription[] = [];
    public start(backtraceBreadcrumbs: BacktraceBreadcrumbs): void {
        if ((backtraceBreadcrumbs.breadcrumbsType & BreadcrumbType.User) !== BreadcrumbType.User) {
            return;
        }

        this._nativeEventSubscriptions.push(
            Dimensions.addEventListener('change', (appState) => {
                const { window, screen } = appState;
                backtraceBreadcrumbs.addBreadcrumb(
                    `Dimension changed. Window (${Math.floor(window.height)} x ${Math.floor(window.width)}),
                         Screen (${Math.floor(screen.height)} x ${Math.floor(screen.width)})`,
                    BreadcrumbLogLevel.Verbose,
                    BreadcrumbType.User,
                    {
                        ['window.fontScale']: window.fontScale,
                        ['window.scale']: window.scale,
                        ['window.width']: window.width,
                        ['window.height']: window.height,
                        ['screen.fontScale']: screen.fontScale,
                        ['screen.scale']: screen.scale,
                        ['screen.width']: screen.width,
                        ['screen.height']: screen.height,
                    },
                );
            }),
        );
    }
    public dispose(): void {
        for (const eventSubscription of this._nativeEventSubscriptions) {
            eventSubscription.remove();
        }
    }
}
