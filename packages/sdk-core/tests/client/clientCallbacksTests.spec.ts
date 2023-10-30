import { BacktraceData, BacktraceReportSubmissionResult } from '../../src';
import { BacktraceTestClient } from '../mocks/BacktraceTestClient';

describe('Client callbacks tests', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('Submission data modification tests', () => {
        it('Should invoke the before send event', async () => {
            let triggered = false;
            const client = BacktraceTestClient.buildFakeClient({
                beforeSend: (data) => {
                    triggered = true;
                    return data;
                },
            });

            await client.send(new Error());
            expect(triggered).toBeTruthy();
        });

        it('Should allow to modify the report attribute', async () => {
            const attributeName = 'test';
            const expectedAttributeVaue = 'invoked';
            const client = BacktraceTestClient.buildFakeClient({
                beforeSend: (data) => {
                    data.attributes[attributeName] = expectedAttributeVaue;
                    return data;
                },
            });
            jest.spyOn(client.requestHandler, 'postError').mockImplementationOnce((_: string, json: string) => {
                const data = JSON.parse(json) as BacktraceData;
                expect(data.attributes[attributeName]).toEqual(expectedAttributeVaue);
                return Promise.resolve(BacktraceReportSubmissionResult.Ok({}));
            });

            client.addAttribute({ [attributeName]: 'not-invoked' });

            await client.send(new Error());
        });

        it('Should skip sending events if the user decide not to send it', async () => {
            const client = BacktraceTestClient.buildFakeClient({
                beforeSend: () => {
                    return undefined;
                },
            });

            await client.send(new Error());
            expect(client.requestHandler.postError).not.toHaveBeenCalled();
        });
    });

    describe('Report filtering tests', () => {
        it('Should send a report if the filter is not set', async () => {
            const client = BacktraceTestClient.buildFakeClient();

            await client.send(new Error());
            expect(client.requestHandler.postError).toHaveBeenCalled();
        });

        it('Should send a report if the filter returns false ', async () => {
            const client = BacktraceTestClient.buildFakeClient({
                skipReport: () => {
                    return false;
                },
            });

            await client.send(new Error());
            expect(client.requestHandler.postError).toHaveBeenCalled();
        });

        it('Should not send a report if the filter returns true ', async () => {
            const client = BacktraceTestClient.buildFakeClient({
                skipReport: () => {
                    return true;
                },
            });

            await client.send(new Error());
            expect(client.requestHandler.postError).not.toHaveBeenCalled();
        });
    });
});
