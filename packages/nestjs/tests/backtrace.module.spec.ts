import { Test } from '@nestjs/testing';
import { BacktraceClient, BacktraceModule } from '../src/index.js';

describe('BacktraceModule', () => {
    beforeEach(() => {
        BacktraceClient.instance?.dispose();
    });

    it('should export global BacktraceClient instance', async () => {
        const instance = BacktraceClient.initialize({
            url: 'https://test',
        });

        const module = await Test.createTestingModule({
            imports: [BacktraceModule],
        }).compile();

        const client = module.get(BacktraceClient);
        expect(client).toBe(instance);
    });

    it('should export passed BacktraceClient instance', async () => {
        const instance = BacktraceClient.builder({
            url: 'https://test',
        }).build();

        const module = await Test.createTestingModule({
            imports: [BacktraceModule.register(instance)],
        }).compile();

        const client = module.get(BacktraceClient);
        expect(client).toBe(instance);
    });

    it('should export BacktraceClient using options asynchronously', async () => {
        const instance = BacktraceClient.builder({
            url: 'https://test',
        }).build();

        const module = await Test.createTestingModule({
            imports: [
                BacktraceModule.registerAsync({
                    useFactory: () => instance,
                }),
            ],
        }).compile();

        const client = module.get(BacktraceClient);
        expect(client).toBe(instance);
    });

    it('should throw an error when instance is not initialized', async () => {
        await expect(
            Test.createTestingModule({
                imports: [BacktraceModule],
            }).compile(),
        ).rejects.toThrowError(/Backtrace instance is not available\./);
    });
});
