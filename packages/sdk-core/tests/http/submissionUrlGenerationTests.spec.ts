import { SubmissionUrlInformation } from '../../src/model/http';
describe('Submission Url generation tests', () => {
    const submissionTypes: Array<'plcrash' | 'minidump'> = ['minidump', 'plcrash'];
    describe('Submit', () => {
        function createSubmissionUrl(format = 'json') {
            return `https://submit.backtrace.io/name/000000000000a1eb7ae344f6e002de2e20c81fbdedf6991c2f3bb45b11111111/${format}`;
        }
        const sampleSubmitUrl = createSubmissionUrl();
        it('Should use submit url from the configuration options', () => {
            expect(SubmissionUrlInformation.toJsonReportSubmissionUrl(sampleSubmitUrl)).toBe(sampleSubmitUrl);
        });

        it(`Shouldnt mix token with the submission url`, () => {
            expect(SubmissionUrlInformation.toJsonReportSubmissionUrl(sampleSubmitUrl, '123')).toBe(sampleSubmitUrl);
        });

        for (const submissionType of submissionTypes) {
            describe(`${submissionType} submission url`, () => {
                it(`Should convert submission URL to the ${submissionType} submission URL`, () => {
                    const expectedUrl = createSubmissionUrl(submissionType);
                    const submissionUrl = createSubmissionUrl();

                    expect(SubmissionUrlInformation.changeSubmissionFormat(submissionUrl, submissionType)).toBe(
                        expectedUrl,
                    );
                });

                it(`Should convert submission URL to the minidump ${submissionType} URL and ignore query parameters`, () => {
                    const queryParameters = '?foo=bar&baz=123';
                    const expectedUrl = createSubmissionUrl(submissionType) + queryParameters;
                    const submissionUrl = createSubmissionUrl() + queryParameters;

                    expect(SubmissionUrlInformation.changeSubmissionFormat(submissionUrl, submissionType)).toBe(
                        expectedUrl,
                    );
                });
            });
        }
    });

    describe('Direct URL', () => {
        function createDirectUrl(format = 'json') {
            return `${hostname}/post?format=${format}&token=${token}`;
        }

        const hostname = `https://instance.sp.backtrace.io`;
        const token = `000000000000a1eb7ae344f6e002de2e20c81fbdedf6991c2f3bb45b11111111`;
        const fullUrl = createDirectUrl();
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

        for (const submissionType of submissionTypes) {
            describe(`${submissionType} submission url`, () => {
                it(`Should convert submission URL to the ${submissionType} submission URL`, () => {
                    const expectedUrl = createDirectUrl(submissionType);
                    const submissionUrl = createDirectUrl();

                    expect(SubmissionUrlInformation.changeSubmissionFormat(submissionUrl, submissionType)).toBe(
                        expectedUrl,
                    );
                });

                it(`Should convert submission URL to the minidump ${submissionType} URL and ignore query parameters`, () => {
                    const queryParameters = '&foo=bar&baz=123';
                    const expectedUrl = createDirectUrl(submissionType) + queryParameters;
                    const submissionUrl = createDirectUrl() + queryParameters;

                    expect(SubmissionUrlInformation.changeSubmissionFormat(submissionUrl, submissionType)).toBe(
                        expectedUrl,
                    );
                });
            });
        }
    });
});
