import {
    BreadcrumbLogLevel,
    BreadcrumbType,
    type BacktraceBreadcrumbs,
    type BreadcrumbsEventSubscriber,
} from '@backtrace/sdk-core';
import { AppState, Platform, type NativeEventSubscription } from 'react-native';

export class AppStateBreadcrumbSubscriber implements BreadcrumbsEventSubscriber {
    private _nativeEventSubscriptions: NativeEventSubscription[] = [];
    public start(backtraceBreadcrumbs: BacktraceBreadcrumbs): void {
        if ((backtraceBreadcrumbs.breadcrumbsType & BreadcrumbType.System) === BreadcrumbType.System) {
            this._nativeEventSubscriptions.push(
                AppState.addEventListener('memoryWarning', (state) => {
                    backtraceBreadcrumbs.addBreadcrumb(
                        `Detected memory pressure change. Current state: ${state}`,
                        BreadcrumbLogLevel.Warning,
                        BreadcrumbType.System,
                        { state },
                    );
                }),
            );
        }

        if ((backtraceBreadcrumbs.breadcrumbsType & BreadcrumbType.User) === BreadcrumbType.User) {
            this._nativeEventSubscriptions.push(
                AppState.addEventListener('change', (state) => {
                    backtraceBreadcrumbs.addBreadcrumb(
                        `Application state change to ${state}`,
                        BreadcrumbLogLevel.Info,
                        BreadcrumbType.User,
                    );
                }),
            );

            if (Platform.OS === 'android') {
                this._nativeEventSubscriptions.push(
                    AppState.addEventListener('blur', () => {
                        backtraceBreadcrumbs.addBreadcrumb(
                            `Application on blur`,
                            BreadcrumbLogLevel.Info,
                            BreadcrumbType.User,
                        );
                    }),
                );
                this._nativeEventSubscriptions.push(
                    AppState.addEventListener('focus', () => {
                        backtraceBreadcrumbs.addBreadcrumb(
                            `Application focus`,
                            BreadcrumbLogLevel.Info,
                            BreadcrumbType.User,
                        );
                    }),
                );
            }
        }
    }
    public dispose(): void {
        for (const eventSubscription of this._nativeEventSubscriptions) {
            eventSubscription.remove();
        }
    }
}
