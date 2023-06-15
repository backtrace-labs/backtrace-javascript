import { BacktraceReport } from '../../lib';
import { AttributeType } from '../../lib/model/data/BacktraceData';
import { AttributeAndAnnotationBuilder } from '../../src/modules/data/AttributeAndAnnotationBuilder';
describe('Attribute converter tests', () => {
    const attributeAndAnnotationBuilder = new AttributeAndAnnotationBuilder();
    describe('Annotations tests', () => {
        it('Should include error information from the report annotations', () => {
            const error = new Error('foo');
            const report = new BacktraceReport(error);

            const { annotations } = attributeAndAnnotationBuilder.generate(report, {}, {});

            const receivedError = annotations['error'] as Error;
            expect(receivedError).toBeDefined();
            expect(receivedError.message).toEqual(error.message);
        });

        it('Should merge client and report annotations', () => {
            const report = new BacktraceReport(new Error('foo'));

            const clientAnnotations: Record<string, object> = {
                foo: {
                    a: 1,
                    b: 2,
                },
            };
            const { annotations } = attributeAndAnnotationBuilder.generate(report, {}, clientAnnotations);

            for (const clientAnnotationKey in clientAnnotations) {
                expect(annotations[clientAnnotationKey]).toEqual(clientAnnotations[clientAnnotationKey]);
            }

            for (const reportAnnotation in report.annotations) {
                expect(annotations[reportAnnotation]).toEqual(report.annotations[reportAnnotation]);
            }
        });

        it('Report annotation should override client annotation', () => {
            const annotationKey = 'foo';
            const reportAnnotation: Record<string, object> = {
                bar: {
                    a: 3,
                    b: 4,
                },
            };
            const report = new BacktraceReport(new Error('foo'), {
                [annotationKey]: reportAnnotation,
            });
            const clientAnnotations: Record<string, object> = {
                [annotationKey]: {
                    a: 1,
                    b: 2,
                },
            };
            const { annotations } = attributeAndAnnotationBuilder.generate(report, {}, clientAnnotations);

            expect(annotations[annotationKey]).toEqual(reportAnnotation);
        });
    });

    describe('Attributes tests', () => {
        it('Should combine report and client attributes', () => {
            const reportAttributes: Record<string, AttributeType> = { foo: '1', bar: true };
            const clientAttributes: Record<string, AttributeType> = { baz: 1 };
            const report = new BacktraceReport(new Error('foo'), reportAttributes);

            const { attributes } = attributeAndAnnotationBuilder.generate(report, clientAttributes, {});

            for (const reportAttributeKey in reportAttributes) {
                expect(attributes[reportAttributeKey]).toEqual(reportAttributes[reportAttributeKey]);
            }

            for (const clientAttributeKey in clientAttributes) {
                expect(attributes[clientAttributeKey]).toEqual(clientAttributes[clientAttributeKey]);
            }
        });

        it('Report attribute should override client attribute', () => {
            const attributeName = 'foo';
            const reportAttributes = { [attributeName]: '1' };
            const clientAttributes = { [attributeName]: 'client attribute' };
            const report = new BacktraceReport(new Error('foo'), reportAttributes);

            const { attributes } = attributeAndAnnotationBuilder.generate(report, clientAttributes, {});

            expect(attributes[attributeName]).toEqual(reportAttributes[attributeName]);
        });

        it('Should convert bigint to string', () => {
            const attributeName = 'bigint';
            const testedValue = BigInt('9999999999999999999999');
            const expectedValue = testedValue.toString();
            const reportAttributes = { [attributeName]: testedValue };
            const report = new BacktraceReport(new Error('foo'), reportAttributes);

            const { attributes } = attributeAndAnnotationBuilder.generate(report, {}, {});

            expect(attributes[attributeName]).toEqual(expectedValue);
        });

        it(`Should allow to set undefined or null or 0 or empty string`, () => {
            const reportAttributes: Record<string, AttributeType> = {
                undefinedTest: undefined,
                nullTest: null,
                zeroTest: 0,
                emptyStringTest: '',
            };
            const report = new BacktraceReport(new Error('foo'), reportAttributes);

            const { attributes } = attributeAndAnnotationBuilder.generate(report, {}, {});

            for (const attributeKey in reportAttributes) {
                expect(attributes[attributeKey]).toEqual(reportAttributes[attributeKey]);
            }
        });
    });
});
