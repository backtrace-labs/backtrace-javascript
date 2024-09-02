import { textFormatter } from '../../../common/textFormatter.js';
import { BacktraceBreadcrumbs } from '../BacktraceBreadcrumbs.js';
import { BreadcrumbLogLevel } from '../model/BreadcrumbLogLevel.js';
import { BreadcrumbType } from '../model/BreadcrumbType.js';
import { BreadcrumbsEventSubscriber } from './BreadcrumbsEventSubscriber.js';

type ConsoleMethod = (...args: unknown[]) => void;
export class ConsoleEventSubscriber implements BreadcrumbsEventSubscriber {
    /**
     * All overriden console events
     */
    private readonly _events: Record<string, ConsoleMethod> = {};
    private _formatter!: (...params: unknown[]) => string;
    public start(backtraceBreadcrumbs: BacktraceBreadcrumbs): void {
        if ((backtraceBreadcrumbs.breadcrumbsType & BreadcrumbType.Log) !== BreadcrumbType.Log) {
            return;
        }

        this._formatter = textFormatter();

        this.bindToConsoleMethod('log', BreadcrumbLogLevel.Info, backtraceBreadcrumbs);
        this.bindToConsoleMethod('warn', BreadcrumbLogLevel.Warning, backtraceBreadcrumbs);
        this.bindToConsoleMethod('error', BreadcrumbLogLevel.Error, backtraceBreadcrumbs);
        this.bindToConsoleMethod('debug', BreadcrumbLogLevel.Debug, backtraceBreadcrumbs);
        this.bindToConsoleMethod('trace', BreadcrumbLogLevel.Verbose, backtraceBreadcrumbs);
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
        backtraceBreadcrumbs: BacktraceBreadcrumbs,
    ) {
        const originalMethod = console[name] as ConsoleMethod;

        (console[name] as ConsoleMethod) = (...args: unknown[]) => {
            originalMethod(...args);
            const message = this._formatter(...args);
            backtraceBreadcrumbs.addBreadcrumb(message, level, BreadcrumbType.Log);
        };
        this._events[name] = originalMethod;
    }
}
