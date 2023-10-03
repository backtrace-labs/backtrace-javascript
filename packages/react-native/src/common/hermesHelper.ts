import { type Hermes } from '../types/Hermes';

export function hermes(): Hermes | undefined {
    return (global as unknown as { HermesInternal: Hermes | undefined })?.HermesInternal;
}
