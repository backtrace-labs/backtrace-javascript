import { BacktraceReport, DebugIdProvider } from '../../src';
import { TimeHelper } from '../../src/common/TimeHelper';
import { BacktraceStackFrame } from '../../src/model/data/BacktraceStackTrace';
import { V8StackTraceConverter } from '../../src/modules/converter/V8StackTraceConverter';
import { BacktraceDataBuilder } from '../../src/modules/data/BacktraceDataBuilder';

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
        new DebugIdProvider(new V8StackTraceConverter()),
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
        const debugIdProvider = new DebugIdProvider(stackTraceConverter);

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

        const expected = 'DEBUG_ID';
        const expectedFrames = frames.map((m) => ({ ...m, debug_identifier: expected }));

        jest.spyOn(stackTraceConverter, 'convert').mockReturnValue(frames);
        jest.spyOn(debugIdProvider, 'getDebugId').mockReturnValue(expected);

        const dataBuilder = new BacktraceDataBuilder(sdkOptions, stackTraceConverter, debugIdProvider);

        const errorReport = new BacktraceReport(new Error());
        const backtraceData = dataBuilder.build(errorReport);

        expect(backtraceData.threads[backtraceData.mainThread].stack).toEqual(expectedFrames);
    });
});
