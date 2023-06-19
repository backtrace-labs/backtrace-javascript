import { BacktraceAttributeProvider, BacktraceConfiguration, BacktraceCoreClientBuilder } from '@backtrace/sdk-core';
import {
    ApplicationInformationAttributeProvider,
    LinuxProcessStatusAttributeProvider,
    MachineAttributeProvider,
    MachineIdentitfierAttributeProvider,
    ProcessInformationAttributeProvider,
    ProcessStatusAttributeProvider,
} from '../attributes';
import { BacktraceClient } from '../BacktraceClient';
import { BacktraceNodeRequestHandler } from '../BacktraceNodeRequestHandler';

export class BacktraceClientBuilder extends BacktraceCoreClientBuilder<BacktraceClient> {
    constructor(private readonly _options: BacktraceConfiguration) {
        super(new BacktraceNodeRequestHandler(_options), [
            new ApplicationInformationAttributeProvider(_options),
            new ProcessStatusAttributeProvider(),
            new MachineAttributeProvider(),
            new ProcessInformationAttributeProvider(),
            new LinuxProcessStatusAttributeProvider(),
            new MachineIdentitfierAttributeProvider(),
        ]);
    }

    public addAttributeProvider(provider: BacktraceAttributeProvider) {
        this.attributeProviders.push(provider);
    }

    public build(): BacktraceClient {
        return new BacktraceClient(this._options, this.handler, this.attributeProviders);
    }
}
