import { BacktraceTestClient } from '../mocks/BacktraceTestClient';

describe('Attributes tests', () => {
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
