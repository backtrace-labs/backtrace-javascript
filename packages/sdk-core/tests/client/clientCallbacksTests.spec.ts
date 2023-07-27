import { BacktraceReportSubmissionResult } from '../../src';
import { BacktraceData } from '../../src/model/data/BacktraceData';
import { BacktraceTestClient } from '../mocks/BacktraceTestClient';

describe('Client callbacks tests', () => {
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
            jest.spyOn(client.requestHandler, 'postError').mockImplementationOnce((_: string, data: BacktraceData) => {
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
});
