import { BacktraceModule } from './BacktraceModule';

type BacktraceModuleCtor<T extends BacktraceModule = BacktraceModule> = new (...args: never[]) => T;

export interface ReadonlyBacktraceModules extends ReadonlyMap<BacktraceModuleCtor, BacktraceModule> {
    get<T extends BacktraceModule>(type: BacktraceModuleCtor<T>): T | undefined;
}

export interface BacktraceModules extends Map<BacktraceModuleCtor, BacktraceModule> {
    set<T extends BacktraceModule>(type: BacktraceModuleCtor<T>, instance: T): this;
    get<T extends BacktraceModule>(type: BacktraceModuleCtor<T>): T | undefined;
}
