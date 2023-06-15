import { BacktraceTestClient } from '../mocks/BacktraceTestClient';

describe('Attributes tests', () => {
    describe('Client attribute add', () => {
        it('Should add an attribute to the client cache', () => {
            const client = BacktraceTestClient.buildFakeClient();
            const key = 'foo';
            const value = 'bar';

            client.addAttribute({ [key]: value });

            expect(client.attributes[key]).toEqual(value);
        });

        it('Should add an annotation to the client cache', () => {
            const client = BacktraceTestClient.buildFakeClient();
            const key = 'foo';
            const value = { bar: 1, baz: false };

            client.addAttribute({ [key]: value });

            expect(client.attributes[key]).toBeUndefined();
            expect(client.annotations[key]).toMatchObject(value);
        });

        it('Should add an annotation and attribute to the client cache', () => {
            const client = BacktraceTestClient.buildFakeClient();
            const annotationKey = 'annotation';
            const annotationValue = { bar: 1, baz: false };
            const attributeKey = 'attribute';
            const attributeValue = 'test';

            client.addAttribute({
                [annotationKey]: annotationValue,
                [attributeKey]: attributeValue,
            });

            expect(client.attributes[attributeKey]).toEqual(attributeValue);
            expect(client.annotations[annotationKey]).toMatchObject(annotationValue);
        });
    });

    describe('Client attribute flow', () => {
        it(`Should add attributes to scoped attributes on startup`, async () => {
            const providerAttributeKey = 'foo';
            const providerAttributeValue = 'bar';
            const scopedAttributeGetFunction = jest
                .fn()
                .mockReturnValue({ [providerAttributeKey]: providerAttributeValue });
            const fakeClient = BacktraceTestClient.buildFakeClient([
                {
                    type: 'scoped',
                    get: scopedAttributeGetFunction,
                },
            ]);

            expect(scopedAttributeGetFunction).toBeCalled();
            expect(fakeClient.attributes[providerAttributeKey]).toBe(providerAttributeValue);
            await fakeClient.send('foo');
            expect(scopedAttributeGetFunction).toHaveBeenCalledTimes(1);
        });

        it(`Should generate attribute on report`, async () => {
            const providerAttributeKey = 'foo';
            const providerAttributeValue = 'bar';
            const scopedAttributeGetFunction = jest
                .fn()
                .mockReturnValue({ [providerAttributeKey]: providerAttributeValue });
            const fakeClient = BacktraceTestClient.buildFakeClient([
                {
                    type: 'dynamic',
                    get: scopedAttributeGetFunction,
                },
            ]);

            expect(scopedAttributeGetFunction).not.toBeCalled();
            expect(fakeClient.attributes[providerAttributeKey]).toBeUndefined();
            await fakeClient.send('foo');
            expect(scopedAttributeGetFunction).toHaveBeenCalledTimes(1);
        });
    });
});
