import { appendBeforeWhitespaces } from '../../src/helpers/stringHelpers';

describe('stringHelpers', () => {
    it('should append string to the end when there are no trailing whitespaces', () => {
        const str = 'abcdefghi';
        const appended = 'xyz';
        const expected = 'abcdefghixyz';

        const actual = appendBeforeWhitespaces(str, appended);
        expect(actual).toEqual(expected);
    });

    it('should append string with whitespace to the end when there are no trailing whitespaces', () => {
        const str = 'abcdefghi';
        const appended = ' xyz ';
        const expected = 'abcdefghi xyz ';

        const actual = appendBeforeWhitespaces(str, appended);
        expect(actual).toEqual(expected);
    });

    it('should append string before whitespaces when there are trailing whitespaces', () => {
        const str = 'abcdefghi   \n\t\t';
        const appended = 'xyz';
        const expected = 'abcdefghixyz   \n\t\t';

        const actual = appendBeforeWhitespaces(str, appended);
        expect(actual).toEqual(expected);
    });

    it('should append string with whitespace before whitespaces when there are trailing whitespaces', () => {
        const str = 'abcdefghi   \n\t\t';
        const appended = '\nxyz\n';
        const expected = 'abcdefghi\nxyz\n   \n\t\t';

        const actual = appendBeforeWhitespaces(str, appended);
        expect(actual).toEqual(expected);
    });
});
