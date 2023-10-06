import { textFormatter } from '../../../common/textFormatter';
import { BacktraceBreadcrumbs } from '../BacktraceBreadcrumbs';
import { BreadcrumbLogLevel } from '../model/BreadcrumbLogLevel';
import { BreadcrumbType } from '../model/BreadcrumbType';
import { BreadcrumbsEventSubscriber } from './BreadcrumbsEventSubscriber';

type ConsoleMethod = (...args: unknown[]) => void;
export class ConsoleEventSubscriber implements BreadcrumbsEventSubscriber {
    /**
     * All overriden console events
     */
    private readonly _events: Record<string, ConsoleMethod> = {};
    private _formatter!: (...params: unknown[]) => string;
    public start(breadcrumbsManager: BacktraceBreadcrumbs): void {
        if ((breadcrumbsManager.breadcrumbsType & BreadcrumbType.Log) !== BreadcrumbType.Log) {
            return;
        }

        this._formatter = textFormatter();

        this.bindToConsoleMethod('log', BreadcrumbLogLevel.Info, breadcrumbsManager);
        this.bindToConsoleMethod('warn', BreadcrumbLogLevel.Warning, breadcrumbsManager);
        this.bindToConsoleMethod('error', BreadcrumbLogLevel.Error, breadcrumbsManager);
        this.bindToConsoleMethod('debug', BreadcrumbLogLevel.Debug, breadcrumbsManager);
        this.bindToConsoleMethod('trace', BreadcrumbLogLevel.Verbose, breadcrumbsManager);
    }

    public dispose(): void {
        for (const key in this._events) {
            const consoleMethod = this._events[key];
            (console[key as keyof Console] as ConsoleMethod) = consoleMethod;
        }
    }

    private bindToConsoleMethod(
        name: keyof Console,
        level: BreadcrumbLogLevel,
        breadcrumbsManager: BacktraceBreadcrumbs,
    ) {
        const originalMethod = console[name] as ConsoleMethod;

        (console[name] as ConsoleMethod) = (...args: unknown[]) => {
            originalMethod(...args);
            const message = this._formatter(...args);
            breadcrumbsManager.addBreadcrumb(message, level, BreadcrumbType.Log);
        };
        this._events[name] = originalMethod;
    }
}
