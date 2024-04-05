import { BacktraceReport, DebugMetadataProvider } from '../../src';
import { TimeHelper } from '../../src/common/TimeHelper';
import { BacktraceStackFrame } from '../../src/model/data/BacktraceStackTrace';
import { AttributeManager } from '../../src/modules/attribute/AttributeManager';
import { V8StackTraceConverter } from '../../src/modules/converter/V8StackTraceConverter';
import { BacktraceDataBuilder } from '../../src/modules/data/BacktraceDataBuilder';
import { DebugMetadata } from '../../src/sourcemaps/models/DebugMetadata';

describe('Data generation tests', () => {
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
        new DebugMetadataProvider(new V8StackTraceConverter()),
    );

    it('Should set sdk options in the Backtrace data', () => {
        const backtraceData = dataBuilder.build(new BacktraceReport(new Error()));
        expect(backtraceData.agent).toEqual(sdkOptions.agent);
        expect(backtraceData.agentVersion).toEqual(sdkOptions.agentVersion);
        expect(backtraceData.langVersion).toEqual(sdkOptions.langVersion);
        expect(backtraceData.lang).toEqual(sdkOptions.langName);
    });

    it('Should generate different uuid for each report ', () => {
        const backtraceData = dataBuilder.build(new BacktraceReport(new Error()));
        const comparedData = dataBuilder.build(new BacktraceReport(new Error()));

        expect(backtraceData.uuid).not.toEqual(comparedData.uuid);
    });

    it('Should generate correct timestamp', () => {
        const timestamp = Date.now();
        jest.spyOn(TimeHelper, 'now').mockImplementation(() => {
            return timestamp;
        });
        const backtraceData = dataBuilder.build(new BacktraceReport(new Error()));

        expect(backtraceData.timestamp).toEqual(TimeHelper.toTimestampInSec(timestamp));
    });

    it('Should set classifiers based on the error report', () => {
        const errorReport = new BacktraceReport(new Error());
        const backtraceData = dataBuilder.build(errorReport);

        expect(backtraceData.classifiers).toBe(errorReport.classifiers);
    });

    it('Should set classifiers based on the message report', () => {
        const errorReport = new BacktraceReport('test');
        const backtraceData = dataBuilder.build(errorReport);

        expect(backtraceData.classifiers).toBe(errorReport.classifiers);
    });

    it('Should always have annotations', () => {
        const errorReport = new BacktraceReport(new Error());
        const backtraceData = dataBuilder.build(errorReport);

        expect(backtraceData.annotations).toBeDefined();
        expect(backtraceData.annotations).toMatchObject(errorReport.annotations);
    });

    it('Should always have attributes', () => {
        const errorReport = new BacktraceReport(new Error());
        const backtraceData = dataBuilder.build(errorReport);

        expect(backtraceData.attributes).toBeDefined();
        expect(backtraceData.attributes).toMatchObject(errorReport.attributes);
    });

    it('Should append debug_identifier to each frame', () => {
        const stackTraceConverter = new V8StackTraceConverter();
        const debugIdProvider = new DebugMetadataProvider(stackTraceConverter);

        const frames: BacktraceStackFrame[] = [
            {
                funcName: 'x',
                library: 'x',
            },
            {
                funcName: 'y',
                library: 'y',
            },
        ];

        const expected: DebugMetadata = {
            debugId: 'DEBUG_ID',
        };

        const expectedFrames = frames.map((m) => ({ ...m, debug_identifier: expected.debugId }));

        jest.spyOn(stackTraceConverter, 'convert').mockReturnValue(frames);
        jest.spyOn(debugIdProvider, 'getDebugMetadata').mockReturnValue(expected);

        const dataBuilder = new BacktraceDataBuilder(
            sdkOptions,
            stackTraceConverter,
            new AttributeManager([]),
            debugIdProvider,
        );

        const errorReport = new BacktraceReport(new Error());
        const backtraceData = dataBuilder.build(errorReport);

        expect(backtraceData.threads[backtraceData.mainThread].stack).toEqual(expectedFrames);
    });

    it('Should append symbolication_source to each frame', () => {
        const stackTraceConverter = new V8StackTraceConverter();
        const debugIdProvider = new DebugMetadataProvider(stackTraceConverter);

        const frames: BacktraceStackFrame[] = [
            {
                funcName: 'x',
                library: 'x',
            },
            {
                funcName: 'y',
                library: 'y',
            },
        ];

        const expected: DebugMetadata = {
            debugId: 'DEBUG_ID',
            symbolicationSource: 'SYMBOLICATION_SOURCE',
        };

        const expectedFrames = frames.map((m) => ({
            ...m,
            debug_identifier: expected.debugId,
            symbolication_source: expected.symbolicationSource,
        }));

        jest.spyOn(stackTraceConverter, 'convert').mockReturnValue(frames);
        jest.spyOn(debugIdProvider, 'getDebugMetadata').mockReturnValue(expected);

        const dataBuilder = new BacktraceDataBuilder(
            sdkOptions,
            stackTraceConverter,
            new AttributeManager([]),
            debugIdProvider,
        );

        const errorReport = new BacktraceReport(new Error());
        const backtraceData = dataBuilder.build(errorReport);

        expect(backtraceData.threads[backtraceData.mainThread].stack).toEqual(expectedFrames);
    });

    it('Should generate threads from BacktraceReport.stackTrace', () => {
        const errorReport = new BacktraceReport(new Error());
        const secondName = 'second-stack-name';
        const secondStack = 'second-stack';
        const main = 'main';

        errorReport.addStackTrace(secondName, secondStack);
        const backtraceData = dataBuilder.build(errorReport);

        expect(backtraceData.threads[main]).toBeDefined();
        expect(backtraceData.threads[main].fault).toBeTruthy();
        expect(backtraceData.threads[main].stack.length).toBeDefined();
        expect(backtraceData.threads[secondName]).toBeDefined();
        expect(backtraceData.threads[secondName].fault).toBeFalsy();
        expect(backtraceData.threads[secondName].stack.length).toBeDefined();
    });

    it('should override attribute provider attributes with report attributes', () => {
        const providerAttributes = {
            foo: 'bar',
            xyz: 'abc',
        };

        const reportAttributes = {
            foo: 'baz',
        };

        const expected = {
            ...providerAttributes,
            ...reportAttributes,
        };

        const dataBuilder = new BacktraceDataBuilder(
            sdkOptions,
            new V8StackTraceConverter(),
            new AttributeManager([
                {
                    type: 'scoped',
                    get: () => providerAttributes,
                },
            ]),
            new DebugMetadataProvider(new V8StackTraceConverter()),
        );

        const data = dataBuilder.build(new BacktraceReport(new Error(), reportAttributes));
        expect(data.attributes).toMatchObject(expected);
    });

    it('should override attribute provider annotations with report annotations', () => {
        const providerAnnotations = {
            foo: { x: 'bar' },
            xyz: { x: 'abc' },
        };

        const reportAnnotations = {
            foo: { x: 'baz' },
        };

        const expected = {
            ...providerAnnotations,
            ...reportAnnotations,
        };

        const dataBuilder = new BacktraceDataBuilder(
            sdkOptions,
            new V8StackTraceConverter(),
            new AttributeManager([
                {
                    type: 'scoped',
                    get: () => providerAnnotations,
                },
            ]),
            new DebugMetadataProvider(new V8StackTraceConverter()),
        );

        const data = dataBuilder.build(new BacktraceReport(new Error(), reportAnnotations));
        expect(data.annotations).toMatchObject(expected);
    });
});
