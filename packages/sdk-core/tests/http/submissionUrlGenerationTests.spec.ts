import { SubmissionUrlInformation } from '../../src/model/http';
describe('Submission Url generation tests', () => {
    describe('Submit', () => {
        const sampleSubmitUrl = `https://submit.backtrace.io/name/000000000000a1eb7ae344f6e002de2e20c81fbdedf6991c2f3bb45b11111111/json`;
        it('Should use submit url from the configuration options', () => {
            expect(SubmissionUrlInformation.toJsonReportSubmissionUrl(sampleSubmitUrl)).toBe(sampleSubmitUrl);
        });

        it(`Shouldnt mix token with the submission url`, () => {
            expect(SubmissionUrlInformation.toJsonReportSubmissionUrl(sampleSubmitUrl, '123')).toBe(sampleSubmitUrl);
        });
    });

    describe('Direct URL', () => {
        const hostname = `https://instance.sp.backtrace.io`;
        const token = `000000000000a1eb7ae344f6e002de2e20c81fbdedf6991c2f3bb45b11111111`;
        const fullUrl = `${hostname}/post?format=json&token=${token}`;
        it('Should use the direct url if the token is not available', () => {
            expect(SubmissionUrlInformation.toJsonReportSubmissionUrl(fullUrl)).toBe(fullUrl);
        });

        it(`Shouldn't mix token with the submission url if the token is already there`, () => {
            expect(SubmissionUrlInformation.toJsonReportSubmissionUrl(fullUrl, token)).toBe(fullUrl);
        });

        it(`Should generate a full url if the token and instance are passed separated`, () => {
            expect(SubmissionUrlInformation.toJsonReportSubmissionUrl(hostname, token)).toBe(fullUrl);
        });

        it(`Should override the token in the submission url`, () => {
            const testedToken = '111111110000000000001111111100000000000020c81fbdedf6991c2f3bb45b';
            const expectedUrl = `${hostname}/post?format=json&token=${testedToken}`;

            expect(SubmissionUrlInformation.toJsonReportSubmissionUrl(fullUrl, testedToken)).toBe(expectedUrl);
        });
    });
});
