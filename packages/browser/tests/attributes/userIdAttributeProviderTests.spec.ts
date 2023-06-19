import { BacktraceConfiguration } from '@backtrace/sdk-core';
import { UserIdentifierAttributeProvider } from '../../src/attributes/UserIdentifierAttributeProvider';
describe('User id attribute provider test', () => {
    it(`Should always set user id attribute`, () => {
        const userIdentifier = new UserIdentifierAttributeProvider({} as BacktraceConfiguration);

        expect(userIdentifier.get()['guid']).toBeDefined();
    });

    it(`Should always use guid from the user attributes`, () => {
        const test = 'test';
        const userIdentifier = new UserIdentifierAttributeProvider({
            url: 'https://submit.backtrace.io/foo/bar/baz',
            userAttributes: { guid: test },
        } as BacktraceConfiguration);

        expect(userIdentifier.get()['guid']).toEqual(test);
    });

    it(`Should store value in the local storage if the guid is not provider`, () => {
        const userIdentifier = new UserIdentifierAttributeProvider({} as BacktraceConfiguration);

        expect(window.localStorage.getItem(userIdentifier.USER_IDENTIFIER)).toBeDefined();
    });

    it(`Should always generate the same value`, () => {
        const userIdentifier1 = new UserIdentifierAttributeProvider({} as BacktraceConfiguration);
        const userIdentifier2 = new UserIdentifierAttributeProvider({} as BacktraceConfiguration);

        expect(userIdentifier1.get()['guid']).toEqual(userIdentifier2.get()['guid']);
    });
});
