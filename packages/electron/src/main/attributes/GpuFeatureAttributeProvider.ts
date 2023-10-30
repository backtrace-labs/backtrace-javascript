import { BacktraceAttributeProvider } from '@backtrace/sdk-core';
import { app, GPUFeatureStatus } from 'electron';

export class GpuFeatureAttributeProvider implements BacktraceAttributeProvider {
    private _attributes?: Record<string, string>;

    constructor() {
        if (!app.getGPUFeatureStatus) {
            return;
        }

        app.on('gpu-info-update', () => (this._attributes = this.buildAttributes(app.getGPUFeatureStatus())));
    }

    public get type(): 'scoped' | 'dynamic' {
        return 'dynamic';
    }

    public get(): Record<string, unknown> {
        return this._attributes ?? {};
    }

    private buildAttributes(status: GPUFeatureStatus) {
        const result: Record<string, string> = {};
        for (const key in status) {
            result[`electron.graphic.${key}`] = status[key as keyof GPUFeatureStatus];
        }
        return result;
    }
}
