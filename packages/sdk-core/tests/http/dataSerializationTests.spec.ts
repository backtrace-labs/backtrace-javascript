import { BacktraceReport, DebugIdProvider } from '../../src';
import { jsonEscaper } from '../../src/common/jsonEscaper';
import { AttributeManager } from '../../src/modules/attribute/AttributeManager';
import { V8StackTraceConverter } from '../../src/modules/converter/V8StackTraceConverter';
import { BacktraceDataBuilder } from '../../src/modules/data/BacktraceDataBuilder';

describe('Data serialization tests', () => {
    const sdkOptions = {
        agent: 'test',
        agentVersion: '0.0.1',
        langName: 'test',
        langVersion: 'test',
    };
    const dataBuilder = new BacktraceDataBuilder(
        sdkOptions,
        new V8StackTraceConverter(),
        new AttributeManager([]),
        new DebugIdProvider(new V8StackTraceConverter()),
    );

    it('Should serialize basic BacktraceData object', () => {
        const data = dataBuilder.build(new BacktraceReport(new Error()));
        expect(() => JSON.stringify(data, jsonEscaper())).not.toThrow();
    });

    it('Should serialize correctly annotations with circular reference', () => {
        const annotation: Record<string, unknown> = {
            a: 123,
        };
        annotation['circular-reference'] = annotation;
        const data = dataBuilder.build(new BacktraceReport(new Error(), annotation));
        expect(() => JSON.stringify(data, jsonEscaper())).not.toThrow();
    });

    it('Should serialize correctly big ints', () => {
        const annotation: Record<string, unknown> = {
            bigint: BigInt(9007199254740991),
        };
        annotation['circular-reference'] = annotation;
        const data = dataBuilder.build(new BacktraceReport(new Error(), annotation));
        expect(() => JSON.stringify(data, jsonEscaper())).not.toThrow();
    });
});
