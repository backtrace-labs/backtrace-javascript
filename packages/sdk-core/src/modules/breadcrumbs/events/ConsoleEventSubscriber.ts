import { format } from 'util';
import { BreadcrumbsManager } from '../BreadcrumbsManager';
import { BreadcrumbLogLevel } from '../model/BreadcrumbLogLevel';
import { BreadcrumbType } from '../model/BreadcrumbType';
import { BreadcrumbsEventSubscriber } from './BreadcrurmbsEventSubscriber';

type ConsoleMethod = (...args: unknown[]) => void;
export class ConsoleEventSubscriber implements BreadcrumbsEventSubscriber {
    /**
     * All overriden console events
     */
    private readonly _events: Record<string, ConsoleMethod> = {};

    public start(breadcrumbsManager: BreadcrumbsManager): void {
        if ((breadcrumbsManager.breadcrumbsType & BreadcrumbType.Log) !== BreadcrumbType.Log) {
            return;
        }

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
        breadcrumbsManager: BreadcrumbsManager,
    ) {
        const originalMethod = console[name] as ConsoleMethod;
        const defaultImplementation = originalMethod.bind(console);

        (console[name] as ConsoleMethod) = (...args: unknown[]) => {
            defaultImplementation.apply(console, args);
            const message = format(...args);
            breadcrumbsManager.addBreadcrumb(message, level, BreadcrumbType.Log);
        };
        this._events[name] = originalMethod;
    }
}
