import { BacktraceAttributeProvider, BacktraceConfiguration, BacktraceCoreClientBuilder } from '@backtrace/sdk-core';
import { BacktraceClient } from '../BacktraceClient';
import { BacktraceNodeRequestHandler } from '../BacktraceNodeRequestHandler';
import {
    LinuxProcesStatusAttributeProvider,
    MachineAttributeProvider,
    MachineIdentitfierAttributeProvider,
    ProcessInformationAttributeProvider,
    ProcessStatusAttributeProvider,
} from '../providers';

export class BacktraceClientBuilder extends BacktraceCoreClientBuilder<BacktraceClient> {
    private readonly _attributeProviders: BacktraceAttributeProvider[] = [
        new ProcessStatusAttributeProvider(),
        new MachineAttributeProvider(),
        new ProcessInformationAttributeProvider(),
        new LinuxProcesStatusAttributeProvider(),
        new MachineIdentitfierAttributeProvider(),
    ];
    constructor(private readonly _options: BacktraceConfiguration) {
        super(new BacktraceNodeRequestHandler(_options));
    }

    public addAttributeProvider(provider: BacktraceAttributeProvider) {
        this._attributeProviders.push(provider);
    }

    public build(): BacktraceClient {
        return new BacktraceClient(this._options, this.handler, this._attributeProviders);
    }
}
