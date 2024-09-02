import { BacktraceAttributeProvider } from '../../src/index.js';
import { AttributeManager } from '../../src/modules/attribute/AttributeManager.js';

describe('AttributeManager', () => {
    function provider(type: BacktraceAttributeProvider['type'], get: BacktraceAttributeProvider['get']) {
        return { type, get };
    }

    describe('providers', () => {
        it('should resolve static provider when it is added via constructor', () => {
            const fn = jest.fn().mockReturnValue({});

            new AttributeManager([provider('scoped', fn)]);
            expect(fn).toBeCalled();
        });

        it('should resolve static provider when it is added via addProvider', () => {
            const fn = jest.fn().mockReturnValue({});

            const attributeManager = new AttributeManager([]);
            attributeManager.addProvider(provider('scoped', fn));
            expect(fn).toBeCalled();
        });

        it('should resolve static provider only once', () => {
            const fn = jest.fn().mockReturnValue({});

            const attributeManager = new AttributeManager([provider('scoped', fn)]);

            attributeManager.get();
            attributeManager.get();

            expect(fn).toBeCalledTimes(1);
        });

        it('should resolve dynamic provider added via constructor when get is called', () => {
            const fn = jest.fn().mockReturnValue({});

            const attributeManager = new AttributeManager([provider('dynamic', fn)]);
            expect(fn).not.toBeCalled();

            attributeManager.get();

            expect(fn).toBeCalled();
        });

        it('should resolve dynamic provider added via addProvider when get is called', () => {
            const fn = jest.fn().mockReturnValue({});

            const attributeManager = new AttributeManager([]);
            attributeManager.addProvider(provider('dynamic', fn));
            expect(fn).not.toBeCalled();

            attributeManager.get();

            expect(fn).toBeCalled();
        });

        it('should resolve dynamic provider every time when get is called', () => {
            const fn = jest.fn().mockReturnValue({});

            const attributeManager = new AttributeManager([]);
            attributeManager.addProvider(provider('dynamic', fn));

            attributeManager.get();
            attributeManager.get();
            attributeManager.get();

            expect(fn).toBeCalledTimes(3);
        });
    });

    describe('add', () => {
        it('should resolve added attributes in order', () => {
            const attributes1 = {
                foo: 'bar',
                abc: 'xyz',
            };

            const attributes2 = {
                foo: 'baz',
                test: 'test',
            };

            const attributes3 = {
                foo: 'foo',
                test2: 'test2',
            };

            const expected = {
                ...attributes1,
                ...attributes2,
                ...attributes3,
            };

            const attributeManager = new AttributeManager([]);
            attributeManager.add(attributes1);
            attributeManager.add(attributes2);
            attributeManager.add(attributes3);

            const { attributes } = attributeManager.get();
            expect(attributes).toEqual(expected);
        });

        it('should resolve added annotations in order', () => {
            const annotations1 = {
                foo: { x: 'bar' },
                abc: { x: 'xyz' },
            };

            const annotations2 = {
                foo: { x: 'baz' },
                test: { x: 'test' },
            };

            const annotations3 = {
                foo: { x: 'foo' },
                test2: { x: 'test2' },
            };

            const expected = {
                ...annotations1,
                ...annotations2,
                ...annotations3,
            };

            const attributeManager = new AttributeManager([]);
            attributeManager.add(annotations1);
            attributeManager.add(annotations2);
            attributeManager.add(annotations3);

            const { annotations } = attributeManager.get();
            expect(annotations).toEqual(expected);
        });

        it('should override provider attributes with added attributes', () => {
            const providerAttributes = {
                foo: 'bar',
                abc: 'xyz',
            };

            const addedAttributes = {
                foo: 'baz',
                test: 'test',
            };

            const expected = {
                ...providerAttributes,
                ...addedAttributes,
            };

            const attributeManager = new AttributeManager([provider('scoped', () => providerAttributes)]);
            attributeManager.add(addedAttributes);

            const { attributes } = attributeManager.get();
            expect(attributes).toEqual(expected);
        });

        it('should override provider annotations with added annotations', () => {
            const providerAnnotations = {
                foo: { x: 'bar' },
                abc: { x: 'xyz' },
            };

            const addedAnnotations = {
                foo: { x: 'baz' },
                test: { x: 'test' },
            };

            const expected = {
                ...providerAnnotations,
                ...addedAnnotations,
            };

            const attributeManager = new AttributeManager([provider('scoped', () => providerAnnotations)]);
            attributeManager.add(addedAnnotations);

            const { annotations } = attributeManager.get();
            expect(annotations).toEqual(expected);
        });
    });

    describe('attribute priority', () => {
        it('should resolve attributes in order of providers', () => {
            const attributes1 = {
                foo: 'bar',
                abc: 'xyz',
            };

            const attributes2 = {
                foo: 'baz',
                test: 'test',
            };

            const attributes3 = {
                foo: 'foo',
                test2: 'test2',
            };

            const expected = {
                ...attributes1,
                ...attributes2,
                ...attributes3,
            };

            const attributeManager = new AttributeManager([
                provider('scoped', () => attributes1),
                provider('scoped', () => attributes2),
                provider('scoped', () => attributes3),
            ]);

            const { attributes } = attributeManager.get();

            expect(attributes).toEqual(expected);
        });

        it('should override scoped provider with next dynamic provider', () => {
            const staticAttributes = {
                foo: 'bar',
                abc: 'xyz',
            };

            const dynamicAttributes = {
                foo: 'baz',
                test: 'test',
            };

            const expected = {
                ...staticAttributes,
                ...dynamicAttributes,
            };

            const attributeManager = new AttributeManager([
                provider('scoped', () => staticAttributes),
                provider('dynamic', () => dynamicAttributes),
            ]);

            const { attributes } = attributeManager.get();

            expect(attributes).toEqual(expected);
        });

        it('should override dynamic provider with next scoped provider', () => {
            const dynamicAttributes = {
                foo: 'bar',
                abc: 'xyz',
            };

            const staticAttributes = {
                foo: 'baz',
                test: 'test',
            };

            const expected = {
                ...dynamicAttributes,
                ...staticAttributes,
            };

            const attributeManager = new AttributeManager([
                provider('dynamic', () => dynamicAttributes),
                provider('scoped', () => staticAttributes),
            ]);

            const { attributes } = attributeManager.get();

            expect(attributes).toEqual(expected);
        });
    });

    describe('annotation priority', () => {
        it('should resolve annotations in order of providers', () => {
            const annotations1 = {
                foo: { x: 'bar' },
                abc: { x: 'xyz' },
            };

            const annotations2 = {
                foo: { x: 'baz' },
                test: { x: 'test' },
            };

            const annotations3 = {
                foo: { x: 'foo' },
                test2: { x: 'test2' },
            };

            const expected = {
                ...annotations1,
                ...annotations2,
                ...annotations3,
            };

            const attributeManager = new AttributeManager([
                provider('scoped', () => annotations1),
                provider('scoped', () => annotations2),
                provider('scoped', () => annotations3),
            ]);

            const { annotations } = attributeManager.get();

            expect(annotations).toEqual(expected);
        });

        it('should override scoped provider with next dynamic provider', () => {
            const staticAnnotations = {
                foo: { x: 'bar' },
                abc: { x: 'xyz' },
            };

            const dynamicAnnotations = {
                foo: { x: 'baz' },
                test: { x: 'test' },
            };

            const expected = {
                ...staticAnnotations,
                ...dynamicAnnotations,
            };

            const attributeManager = new AttributeManager([
                provider('scoped', () => staticAnnotations),
                provider('dynamic', () => dynamicAnnotations),
            ]);

            const { annotations } = attributeManager.get();

            expect(annotations).toEqual(expected);
        });

        it('should override dynamic provider with next scoped provider', () => {
            const dynamicAnnotations = {
                foo: { x: 'bar' },
                abc: { x: 'xyz' },
            };

            const staticAnnotations = {
                foo: { x: 'baz' },
                test: { x: 'test' },
            };

            const expected = {
                ...dynamicAnnotations,
                ...staticAnnotations,
            };

            const attributeManager = new AttributeManager([
                provider('dynamic', () => dynamicAnnotations),
                provider('scoped', () => staticAnnotations),
            ]);

            const { annotations } = attributeManager.get();

            expect(annotations).toEqual(expected);
        });
    });
});
