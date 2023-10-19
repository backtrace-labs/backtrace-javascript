import { BacktraceAttributeProvider } from '@backtrace-labs/sdk-core';
import { app } from 'electron';

interface GPUInfo {
    auxAttributes?: {
        amdSwitchable?: boolean;
        canSupportThreadedTextureMailbox?: boolean;
        glExtensions?: string;
        glRenderer?: string;
        glResetNotificationStrategy?: number;
        glVendor?: string;
        glVersion?: string;
        inProcessGpu?: boolean;
        initializationTime?: number;
        jpegDecodeAcceleratorSupported?: boolean;
        macOSSpecificTextureTarget?: number;
        maxMsaaSamples?: string;
        oopRasterizationSupported?: boolean;
        optimus?: boolean;
        passthroughCmdDecoder?: boolean;
        pixelShaderVersion?: string;
        sandboxed?: boolean;
        softwareRendering?: boolean;
        subpixelFontRendering?: boolean;
        vertexShaderVersion?: string;
        videoDecodeAcceleratorFlags?: number;
        videoDecodeAcceleratorSupportedProfile?: {
            encrypted_only?: boolean;
            maxResolutionHeight?: number;
            maxResolutionWidth?: number;
            minResolutionHeight?: number;
            minResolutionWidth?: number;
            profile?: number;
        };
    };
    gpuDevice?: Array<{
        active?: boolean;
        cudaComputeCapabilityMajor?: number;
        deviceId?: number;
        driverVendor?: string;
        driverVersion?: string;
        vendorId?: number;
    }>[];
    machineModelName?: string;
    machineModelVersion?: string;
}

export class GpuAttributeProvider implements BacktraceAttributeProvider {
    private _attributes?: Record<string, unknown>;

    constructor() {
        if (!app.getGPUInfo) {
            return;
        }

        app.on('gpu-info-update', () =>
            app
                .getGPUInfo('complete')
                .then((info) => {
                    this._attributes = this.buildGpuAttributes(info as GPUInfo);
                })
                .catch(() => {
                    // Do nothing
                }),
        );
    }

    public get type(): 'scoped' | 'dynamic' {
        return 'dynamic';
    }

    public get(): Record<string, unknown> {
        return this._attributes ?? {};
    }

    private buildGpuAttributes(info: GPUInfo) {
        return {
            'graphic.name': info.auxAttributes?.glRenderer,
            'graphic.vendor': info.auxAttributes?.glVendor,
            'graphic.driver.version': info.auxAttributes?.glVersion,
            'graphic.shader': info.auxAttributes?.vertexShaderVersion,
            'graphic.shader.vertex': info.auxAttributes?.vertexShaderVersion,
            'graphic.shader.pixel': info.auxAttributes?.pixelShaderVersion,
            'electron.graphic.aux': info.auxAttributes,
        };
    }
}
