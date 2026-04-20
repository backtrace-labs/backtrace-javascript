import { BacktraceTestClient } from '../mocks/BacktraceTestClient.js';
import { testHttpClient } from '../mocks/testHttpClient.js';

describe('Attributes tests', () => {
    beforeEach(() => {
        jest.mocked(testHttpClient.postError).mockClear();
    });

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
            const fakeClient = BacktraceTestClient.buildFakeClient({}, [
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
            const fakeClient = BacktraceTestClient.buildFakeClient({}, [
                {
                    type: 'dynamic',
                    get: scopedAttributeGetFunction,
                },
            ]);

            expect(scopedAttributeGetFunction).not.toBeCalled();
            // This causes a call to scopedAttributeGetFunction
            expect(fakeClient.attributes[providerAttributeKey]).toEqual(providerAttributeValue);
            await fakeClient.send('foo');
            expect(scopedAttributeGetFunction).toHaveBeenCalledTimes(2);
        });
    });

    describe('Non-serializable attributes', () => {
        it('Should convert Date attribute to ISO string', async () => {
            const client = BacktraceTestClient.buildFakeClient();
            const date = new Date();

            await client.send(new Error('test'), { date });

            const [[, json]] = (client.requestHandler.postError as jest.Mock).mock.calls;
            const body = JSON.parse(json);
            expect(body.attributes.date).toEqual(date.toISOString());
        });

        it('Should convert URL attribute to string', async () => {
            const client = BacktraceTestClient.buildFakeClient();
            const url = new URL('https://example.com/path?q=1');

            await client.send(new Error('test'), { url });

            const [[, json]] = (client.requestHandler.postError as jest.Mock).mock.calls;
            const body = JSON.parse(json);
            expect(body.attributes.url).toEqual(url.toString());
        });

        it('Should handle URL instance as annotation', async () => {
            const client = BacktraceTestClient.buildFakeClient();

            await client.send(new Error('test'), {
                destroyedClassInstance: { ...new URL('https://example.com') },
            });

            const [[, json]] = (client.requestHandler.postError as jest.Mock).mock.calls;
            expect(() => JSON.parse(json)).not.toThrow();
        });

        it('Should handle Object.create with URL prototype', async () => {
            const client = BacktraceTestClient.buildFakeClient();

            await client.send(new Error('test'), {
                createdObjectViaPrototype: Object.create(URL.prototype),
            });

            const [[, json]] = (client.requestHandler.postError as jest.Mock).mock.calls;
            expect(() => JSON.parse(json)).not.toThrow();
        });

        it('Should return submission error for object with broken toJSON', async () => {
            const client = BacktraceTestClient.buildFakeClient();

            const result = await client.send(new Error('test'), {
                brokenToJSON: {
                    toJSON() {
                        throw new Error('broken toJSON');
                    },
                },
            });

            expect(result.status).toEqual('Unknown');
        });

        it('Should handle spread class instance with private fields', async () => {
            class Strict {
                #data = 'secret';
                toJSON() {
                    return this.#data;
                }
            }
            const client = BacktraceTestClient.buildFakeClient();

            await client.send(new Error('test'), {
                strict: { ...new Strict() },
            });

            const [[, json]] = (client.requestHandler.postError as jest.Mock).mock.calls;
            expect(() => JSON.parse(json)).not.toThrow();
        });

        it('Should handle revoked proxy nested in object', async () => {
            const { proxy, revoke } = Proxy.revocable({ toJSON: () => 'ok' }, {});
            revoke();
            const client = BacktraceTestClient.buildFakeClient();

            const result = await client.send(new Error('test'), {
                revokedProxy: { data: proxy },
            });

            expect(result.status).toEqual('Unknown');
        });
    });
});
