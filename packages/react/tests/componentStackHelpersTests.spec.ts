import { isReact16ComponentStack, parseReact16ComponentStack } from '../src/helpers/componentStackHelpers';

describe('isReact16ComponentStack', () => {
    it('should return false if an empty stack is passed in', () => {
        const stack = '';
        expect(isReact16ComponentStack(stack)).toBeFalsy();
    });

    it('should return false for a component stack with no frames/components', () => {
        const stack = '   /n/n/n';
        expect(isReact16ComponentStack(stack)).toBeFalsy();
    });

    it('should return false for a component stack greater than React v16 (a JS error stack - Chrome)', () => {
        const stack = `
            at App (http://localhost:3000/static/js/bundle.js:38:80)
            at ErrorBoundary (http://localhost:3000/static/js/bundle.js:41102:15)
        `;
        expect(isReact16ComponentStack(stack)).toBeFalsy();
    });

    it('should return false for a component stack greater than React v16 (a JS error stack - Firefox)', () => {
        const stack = `
            App@http://localhost:3000/static/js/bundle.js:38:80
            ErrorBoundary@http://localhost:3000/static/js/bundle.js:41102:15
        `;
        expect(isReact16ComponentStack(stack)).toBeFalsy();
    });

    it('should return false for a component stack greater than React v16 (a JS error stack - Safari)', () => {
        const stack = `
            App@http://localhost:3000/static/js/bundle.js:38:80
            ErrorBoundary@http://localhost:3000/static/js/bundle.js:41102:20
        `;
        expect(isReact16ComponentStack(stack)).toBeFalsy();
    });

    it('should return true for a React v16 component stack', () => {
        const stack = `in App
            in ErrorBoundary
            in StrictMode`;
        expect(isReact16ComponentStack(stack)).toBeTruthy();
    });

    it('should return true for a React v16 component stack with whitespaces for the first line', () => {
        const stack = `
            in App
            in ErrorBoundary
            in StrictMode`;
        expect(isReact16ComponentStack(stack)).toBeTruthy();
    });
});

describe('parseReactv16ComponentStack', () => {
    it('should return an empty array for an empty stack string', () => {
        const stack = '';
        expect(parseReact16ComponentStack(stack).length).toBe(0);
    });

    it('should return an empty array for a stack with no frames', () => {
        const stack = '    \n\n\n  \t ';
        expect(parseReact16ComponentStack(stack).length).toBe(0);
    });

    it('should return unknown frames for a component stack greater than React v16 (a JS error stack - Chrome)', () => {
        const stack = `
            at App (http://localhost:3000/static/js/bundle.js:38:80)
            at ErrorBoundary (http://localhost:3000/static/js/bundle.js:41102:15)
        `;
        const expected = [
            {
                funcName: 'unknown',
                library: 'unknown',
            },
            {
                funcName: 'unknown',
                library: 'unknown',
            },
        ];
        expect(parseReact16ComponentStack(stack)).toEqual(expect.arrayContaining(expected));
    });

    it('should return unknown frames for a component stack greater than React v16 (a JS error stack - Firefox)', () => {
        const stack = `
            App@http://localhost:3000/static/js/bundle.js:38:80
            ErrorBoundary@http://localhost:3000/static/js/bundle.js:41102:15
        `;
        const expected = [
            {
                funcName: 'unknown',
                library: 'unknown',
            },
            {
                funcName: 'unknown',
                library: 'unknown',
            },
        ];
        expect(parseReact16ComponentStack(stack)).toEqual(expect.arrayContaining(expected));
    });

    it('should return unknown frames for a component stack greater than React v16 (a JS error stack - Safari)', () => {
        const stack = `
            App@http://localhost:3000/static/js/bundle.js:38:80
            ErrorBoundary@http://localhost:3000/static/js/bundle.js:41102:20
        `;
        const expected = [
            {
                funcName: 'unknown',
                library: 'unknown',
            },
            {
                funcName: 'unknown',
                library: 'unknown',
            },
        ];
        expect(parseReact16ComponentStack(stack)).toEqual(expect.arrayContaining(expected));
    });

    it('should return valid frames for a React v16 component stack', () => {
        const stack = `in App
            in ErrorBoundary
            in StrictMode`;
        const expected = [
            {
                funcName: 'App',
                library: 'unknown',
            },
            {
                funcName: 'ErrorBoundary',
                library: 'unknown',
            },
            {
                funcName: 'StrictMode',
                library: 'unknown',
            },
        ];
        expect(parseReact16ComponentStack(stack)).toEqual(expect.arrayContaining(expected));
    });

    it('should return valid frames for a React v16 component stack with whitespaces at the beginning', () => {
        const stack = `
            
            in App
            in ErrorBoundary
            in StrictMode`;
        const expected = [
            {
                funcName: 'App',
                library: 'unknown',
            },
            {
                funcName: 'ErrorBoundary',
                library: 'unknown',
            },
            {
                funcName: 'StrictMode',
                library: 'unknown',
            },
        ];
        expect(parseReact16ComponentStack(stack)).toEqual(expect.arrayContaining(expected));
    });
});
