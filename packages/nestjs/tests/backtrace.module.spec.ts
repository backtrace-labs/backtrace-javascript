import { Test } from '@nestjs/testing';
import { BacktraceClient, BacktraceModule } from '../src';

describe('BacktraceModule', () => {
    it('should export BacktraceClient using options', async () => {
        const module = await Test.createTestingModule({
            imports: [
                BacktraceModule.forRoot({
                    url: 'https://test',
                }),
            ],
        }).compile();

        const client = module.get(BacktraceClient);
        expect(client).toBeInstanceOf(BacktraceClient);
    });

    it('should export BacktraceClient using options asynchronously', async () => {
        const module = await Test.createTestingModule({
            imports: [
                BacktraceModule.forRootAsync({
                    useFactory: () => ({
                        url: 'https://test',
                    }),
                }),
            ],
        }).compile();

        const client = module.get(BacktraceClient);
        expect(client).toBeInstanceOf(BacktraceClient);
    });

    it('should export BacktraceClient using builder', async () => {
        const module = await Test.createTestingModule({
            imports: [
                BacktraceModule.forRoot(
                    BacktraceClient.builder({
                        url: 'https://test',
                    }),
                ),
            ],
        }).compile();

        const client = module.get(BacktraceClient);
        expect(client).toBeInstanceOf(BacktraceClient);
    });

    it('should export BacktraceClient using builder asynchronously', async () => {
        const module = await Test.createTestingModule({
            imports: [
                BacktraceModule.forRootAsync({
                    useFactory: () =>
                        BacktraceClient.builder({
                            url: 'https://test',
                        }),
                }),
            ],
        }).compile();

        const client = module.get(BacktraceClient);
        expect(client).toBeInstanceOf(BacktraceClient);
    });

    it('should register BacktraceClient global instance', async () => {
        const module = await Test.createTestingModule({
            imports: [
                BacktraceModule.forRootAsync({
                    useFactory: () =>
                        BacktraceClient.builder({
                            url: 'https://test',
                        }),
                }),
            ],
        }).compile();

        const client = module.get(BacktraceClient);
        expect(BacktraceClient.instance).toBe(client);
    });
});
