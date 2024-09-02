import { maskTextFn } from '../../src/privacy/maskTextFn.js';

describe('maskTextFn', () => {
    describe('mask all text enabled', () => {
        it('should mask text without element', () => {
            const mask = maskTextFn({
                maskAllText: true,
            });

            const actual = mask('abc', null);
            expect(actual).toEqual('***');
        });

        it('should mask all text', () => {
            const element = document.createElement('div');

            const mask = maskTextFn({
                maskAllText: true,
            });

            const actual = mask('abc', element);
            expect(actual).toEqual('***');
        });

        it('should call maskTextFn if matched by mask and use its return value', () => {
            const customMask = jest.fn().mockReturnValue('masked');
            const element = document.createElement('div');

            const mask = maskTextFn({
                maskAllText: true,
                maskTextFn: customMask,
            });

            const actual = mask('abc', element);
            expect(customMask).toHaveBeenCalled();
            expect(actual).toEqual('masked');
        });

        it('should not call maskTextFn if matched by unmask', () => {
            const customMask = jest.fn().mockReturnValue('masked');
            const element = document.createElement('div');

            const mask = maskTextFn({
                maskAllText: true,
                unmaskTextSelector: '*',
                maskTextFn: customMask,
            });

            const actual = mask('abc', element);
            expect(customMask).not.toHaveBeenCalled();
            expect(actual).toEqual('abc');
        });

        it('should mask text that is matched by maskTextSelector', () => {
            const element = document.createElement('div');

            const mask = maskTextFn({
                maskAllText: true,
                maskTextSelector: 'div',
            });

            const actual = mask('abc', element);
            expect(actual).toEqual('***');
        });

        it('should mask text that is not matched by maskTextSelector', () => {
            const element = document.createElement('div');

            const mask = maskTextFn({
                maskAllText: true,
                maskTextSelector: 'p',
            });

            const actual = mask('abc', element);
            expect(actual).toEqual('***');
        });

        it('should mask text that is matched by maskTextClass', () => {
            const element = document.createElement('div');
            element.classList.add('mask');

            const mask = maskTextFn({
                maskAllText: true,
                maskTextClass: 'mask',
            });

            const actual = mask('abc', element);
            expect(actual).toEqual('***');
        });

        it('should mask text that is not matched by maskTextClass', () => {
            const element = document.createElement('div');
            element.classList.add('other');

            const mask = maskTextFn({
                maskAllText: true,
                maskTextClass: 'mask',
            });

            const actual = mask('abc', element);
            expect(actual).toEqual('***');
        });

        it('should not mask text that is matched by unmaskTextSelector', () => {
            const element = document.createElement('div');
            element.classList.add('other');

            const mask = maskTextFn({
                maskAllText: true,
                unmaskTextSelector: 'div',
            });

            const actual = mask('abc', element);
            expect(actual).toEqual('abc');
        });

        it('should mask text that is not matched by unmaskTextSelector', () => {
            const element = document.createElement('div');
            element.classList.add('other');

            const mask = maskTextFn({
                maskAllText: true,
                unmaskTextSelector: 'p',
            });

            const actual = mask('abc', element);
            expect(actual).toEqual('***');
        });

        it('should not mask text that is matched by unmaskTextClass', () => {
            const element = document.createElement('div');
            element.classList.add('unmask');

            const mask = maskTextFn({
                maskAllText: true,
                unmaskTextClass: 'unmask',
            });

            const actual = mask('abc', element);
            expect(actual).toEqual('abc');
        });

        it('should mask text that is not matched by unmaskTextSelector', () => {
            const element = document.createElement('div');
            element.classList.add('other');

            const mask = maskTextFn({
                maskAllText: true,
                unmaskTextClass: 'unmask',
            });

            const actual = mask('abc', element);
            expect(actual).toEqual('***');
        });

        it('should mask text that is matched by maskTextSelector and unmaskTextSelector', () => {
            const element = document.createElement('div');

            const mask = maskTextFn({
                maskAllText: true,
                maskTextSelector: 'div',
                unmaskTextSelector: 'div',
            });

            const actual = mask('abc', element);
            expect(actual).toEqual('***');
        });

        it('should mask text that is matched by maskTextClass and unmaskTextClass', () => {
            const element = document.createElement('div');
            element.classList.add('mask');
            element.classList.add('unmask');

            const mask = maskTextFn({
                maskAllText: true,
                maskTextClass: 'mask',
                unmaskTextClass: 'unmask',
            });

            const actual = mask('abc', element);
            expect(actual).toEqual('***');
        });
    });

    describe('mask all text disabled', () => {
        it('should not mask text without element', () => {
            const mask = maskTextFn({
                maskAllText: false,
            });

            const actual = mask('abc', null);
            expect(actual).toEqual('abc');
        });

        it('should not mask all text', () => {
            const element = document.createElement('div');

            const mask = maskTextFn({
                maskAllText: false,
            });

            const actual = mask('abc', element);
            expect(actual).toEqual('abc');
        });

        it('should not call maskTextFn if not matched by mask', () => {
            const customMask = jest.fn().mockReturnValue('masked');
            const element = document.createElement('div');

            const mask = maskTextFn({
                maskAllText: false,
                maskTextFn: customMask,
            });

            const actual = mask('abc', element);
            expect(customMask).not.toHaveBeenCalled();
            expect(actual).toEqual('abc');
        });

        it('should call maskTextFn and use its masked value if matched by mask', () => {
            const customMask = jest.fn().mockReturnValue('masked');
            const element = document.createElement('div');

            const mask = maskTextFn({
                maskAllText: true,
                maskTextSelector: '*',
                maskTextFn: customMask,
            });

            const actual = mask('abc', element);
            expect(customMask).toHaveBeenCalled();
            expect(actual).toEqual('masked');
        });

        it('should mask text that is matched by maskTextSelector', () => {
            const element = document.createElement('div');

            const mask = maskTextFn({
                maskAllText: false,
                maskTextSelector: 'div',
            });

            const actual = mask('abc', element);
            expect(actual).toEqual('***');
        });

        it('should not mask text that is not matched by maskTextSelector', () => {
            const element = document.createElement('div');

            const mask = maskTextFn({
                maskAllText: false,
                maskTextSelector: 'p',
            });

            const actual = mask('abc', element);
            expect(actual).toEqual('abc');
        });

        it('should mask text that is matched by maskTextClass', () => {
            const element = document.createElement('div');
            element.classList.add('mask');

            const mask = maskTextFn({
                maskAllText: false,
                maskTextClass: 'mask',
            });

            const actual = mask('abc', element);
            expect(actual).toEqual('***');
        });

        it('should not mask text that is not matched by maskTextClass', () => {
            const element = document.createElement('div');
            element.classList.add('other');

            const mask = maskTextFn({
                maskAllText: false,
                maskTextClass: 'mask',
            });

            const actual = mask('abc', element);
            expect(actual).toEqual('abc');
        });

        it('should not mask text that is matched by unmaskTextSelector', () => {
            const element = document.createElement('div');
            element.classList.add('other');

            const mask = maskTextFn({
                maskAllText: false,
                unmaskTextSelector: 'div',
            });

            const actual = mask('abc', element);
            expect(actual).toEqual('abc');
        });

        it('should not mask text that is not matched by unmaskTextSelector', () => {
            const element = document.createElement('div');
            element.classList.add('other');

            const mask = maskTextFn({
                maskAllText: false,
                unmaskTextSelector: 'p',
            });

            const actual = mask('abc', element);
            expect(actual).toEqual('abc');
        });

        it('should not mask text that is matched by unmaskTextClass', () => {
            const element = document.createElement('div');
            element.classList.add('unmask');

            const mask = maskTextFn({
                maskAllText: false,
                unmaskTextClass: 'unmask',
            });

            const actual = mask('abc', element);
            expect(actual).toEqual('abc');
        });

        it('should not mask text that is not matched by unmaskTextSelector', () => {
            const element = document.createElement('div');
            element.classList.add('other');

            const mask = maskTextFn({
                maskAllText: false,
                unmaskTextClass: 'unmask',
            });

            const actual = mask('abc', element);
            expect(actual).toEqual('abc');
        });

        it('should not mask text that is matched by maskTextSelector and unmaskTextSelector', () => {
            const element = document.createElement('div');

            const mask = maskTextFn({
                maskAllText: false,
                maskTextSelector: 'div',
                unmaskTextSelector: 'div',
            });

            const actual = mask('abc', element);
            expect(actual).toEqual('abc');
        });

        it('should not mask text that is matched by maskTextClass and unmaskTextClass', () => {
            const element = document.createElement('div');
            element.classList.add('mask');
            element.classList.add('unmask');

            const mask = maskTextFn({
                maskAllText: false,
                maskTextClass: 'mask',
                unmaskTextClass: 'unmask',
            });

            const actual = mask('abc', element);
            expect(actual).toEqual('abc');
        });
    });
});
