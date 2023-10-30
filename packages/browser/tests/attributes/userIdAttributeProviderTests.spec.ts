import { UserIdentifierAttributeProvider } from '../../src/attributes/UserIdentifierAttributeProvider';
describe('User id attribute provider test', () => {
    it(`Should always set user id attribute`, () => {
        const userIdentifier = new UserIdentifierAttributeProvider();

        expect(userIdentifier.get()['guid']).toBeDefined();
    });

    it(`Should store value in the local storage if the guid is not provider`, () => {
        const userIdentifier = new UserIdentifierAttributeProvider();

        expect(window.localStorage.getItem(userIdentifier.USER_IDENTIFIER)).toBeDefined();
    });

    it(`Should always generate the same value`, () => {
        const userIdentifier1 = new UserIdentifierAttributeProvider();
        const userIdentifier2 = new UserIdentifierAttributeProvider();

        expect(userIdentifier1.get()['guid']).toEqual(userIdentifier2.get()['guid']);
    });
});
