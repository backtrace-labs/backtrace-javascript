import { BacktraceReport } from '../../src';
import { ReportConverter } from '../../src/modules/converter/ReportConverter';
import { V8StackTraceConverter } from '../../src/modules/converter/V8StackTraceConverter';

describe('Data generation tests', () => {
    const sdkOptions = {
        agent: 'test',
        agentVersion: '0.0.1',
        langName: 'test',
        langVersion: 'test',
    };
    const reportConverter = new ReportConverter(sdkOptions, new V8StackTraceConverter());

    it('Should set sdk options in the Backtrace data', () => {
        const backtraceData = reportConverter.convert(new BacktraceReport(new Error()));
        expect(backtraceData.agent).toEqual(sdkOptions.agent);
        expect(backtraceData.agentVersion).toEqual(sdkOptions.agentVersion);
        expect(backtraceData.langVersion).toEqual(sdkOptions.langVersion);
        expect(backtraceData.lang).toEqual(sdkOptions.langName);
    });

    it('Should generate different uuid for each report ', () => {
        const backtraceData = reportConverter.convert(new BacktraceReport(new Error()));
        const comparedData = reportConverter.convert(new BacktraceReport(new Error()));

        expect(backtraceData.uuid).not.toEqual(comparedData.uuid);
    });

    it('Should generate correct timestamp', () => {
        const timeNowInSec = Math.floor(Date.now() / 1000);
        const backtraceData = reportConverter.convert(new BacktraceReport(new Error()));
        const timeAfterConversionInSec = Math.floor(Date.now() / 1000);

        expect(backtraceData.timestamp).toBeGreaterThanOrEqual(timeNowInSec);
        expect(backtraceData.timestamp).toBeLessThanOrEqual(timeAfterConversionInSec);
    });

    it('Should set classifiers based on the error report', () => {
        const errorReport = new BacktraceReport(new Error());
        const backtraceData = reportConverter.convert(errorReport);

        expect(backtraceData.classifiers).toBe(errorReport.classifiers);
    });

    it('Should set classifiers based on the message report', () => {
        const errorReport = new BacktraceReport('test');
        const backtraceData = reportConverter.convert(errorReport);

        expect(backtraceData.classifiers).toBe(errorReport.classifiers);
    });

    it('Should always have annotations', () => {
        const errorReport = new BacktraceReport(new Error());
        const backtraceData = reportConverter.convert(errorReport);

        expect(backtraceData.annotations).toBeDefined();
        expect(backtraceData.annotations).toMatchObject(errorReport.annotations);
    });

    it('Should always have attributes', () => {
        const errorReport = new BacktraceReport(new Error());
        const backtraceData = reportConverter.convert(errorReport);

        expect(backtraceData.attributes).toBeDefined();
        expect(backtraceData.attributes).toMatchObject(errorReport.attributes);
    });
});
