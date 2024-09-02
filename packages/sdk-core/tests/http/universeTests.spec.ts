import { SubmissionUrlInformation } from '../../src/model/http/index.js';
describe('Universe tests', () => {
    const testedUniverseName = 'foo-bar-baz';
    describe('Submit', () => {
        const sampleSubmitUrl = `https://submit.backtrace.io/${testedUniverseName}/000000000000a1eb7ae344f6e002de2e20c81fbdedf6991c2f3bb45b11111111/json`;

        it('Should correctly find the universe name', () => {
            expect(SubmissionUrlInformation.findUniverse(sampleSubmitUrl)).toBe(testedUniverseName);
        });
    });

    describe('Direct', () => {
        const testedBacktraceDomainPrefixes = ['', '.sp', '.in'];
        for (const backtracePrefix of testedBacktraceDomainPrefixes) {
            it(`Should correctly find the universe name with prefix ${backtracePrefix}`, () => {
                const sampleDirectUrl = `https://${testedUniverseName}${backtracePrefix}.backtrace.io`;
                expect(SubmissionUrlInformation.findUniverse(sampleDirectUrl)).toBe(testedUniverseName);
            });
        }

        it('Should correctly find the universe in the direct url with the token', () => {
            const sampleDirectUrl = `https://${testedUniverseName}.sp.backtrace.io/post?format=json&token=000000000000a1eb7ae344f6e002de2e20c81fbdedf6991c2f3bb45b11111111`;
            expect(SubmissionUrlInformation.findUniverse(sampleDirectUrl)).toBe(testedUniverseName);
        });
    });
});
