import { BacktraceAttributeProvider } from '@backtrace/sdk-core';
import { Display, app, screen } from 'electron';

export class ScreenAttributeProvider implements BacktraceAttributeProvider {
    public readonly type = 'dynamic';

    public get(): Record<string, unknown> {
        if (!app.isReady()) {
            return {};
        }

        const displays = screen.getAllDisplays();
        const primaryDisplay = screen.getPrimaryDisplay();

        return {
            displays: displays.map(this.getDisplayAttributes),
            'display.primary.id': primaryDisplay.id,
        };
    }

    private getDisplayAttributes(display: Display) {
        return {
            id: display.id,
            rotation: display.rotation,
            scaleFactor: display.scaleFactor,
            touchSupport: display.touchSupport,
            monochrome: display.monochrome,
            accelerometerSupport: display.accelerometerSupport,
            colorSpace: display.colorSpace,
            colorDepth: display.colorDepth,
            depthPerComponent: display.depthPerComponent,
            displayFrequency: display.displayFrequency,
            bounds: display.bounds,
            size: display.size,
            workArea: display.workArea,
            workAreaSize: display.workAreaSize,
            internal: display.internal,
        };
    }
}
