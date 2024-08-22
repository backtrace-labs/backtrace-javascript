import { SubmissionUrlInformation } from '../../src/model/http/index.js';

describe('Token tests', () => {
    const testedToken = '000000000000a1eb7ae344f6e002de2e20c81fbdedf6991c2f3bb45b11111111';
    describe('Submit', () => {
        const sampleSubmitUrl = `https://submit.backtrace.io/test/${testedToken}/json`;

        it('Should correctly find the universe name', () => {
            expect(SubmissionUrlInformation.findToken(sampleSubmitUrl)).toBe(testedToken);
        });
    });

    describe('Direct', () => {
        it(`Should return null if the url doesn't contain the submission token`, () => {
            expect(SubmissionUrlInformation.findToken(`https://foo.sp.backtrace.io`)).toBeNull();
        });

        it(`Should return token from the direct url`, () => {
            expect(
                SubmissionUrlInformation.findToken(`https://foo.sp.backtrace.io/post?format=json&token=${testedToken}`),
            ).toBe(testedToken);
        });
    });
});
