import { BacktraceReportSubmissionResult } from '@backtrace/sdk-core';
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { BacktraceExceptionHandlerOptions } from '../src/backtrace.handler.js';
import { BacktraceClient, BacktraceInterceptor, BacktraceModule } from '../src/index.js';

describe('BacktraceInterceptor e2e', () => {
    beforeEach(() => {
        BacktraceClient.instance?.dispose();
    });

    it('should send an error when interceptor is added to controller via type', async () => {
        @Controller()
        @UseInterceptors(BacktraceInterceptor)
        class TestController {
            @Get('error')
            public error() {
                throw new Error('foo');
            }
        }

        const postError = jest.fn().mockResolvedValue(BacktraceReportSubmissionResult.Ok({}));

        BacktraceClient.initialize(
            {
                url: 'https://test',
            },
            (builder) =>
                builder.useRequestHandler({
                    postError,
                    post: jest.fn().mockResolvedValue(BacktraceReportSubmissionResult.Ok({})),
                }),
        );

        const module = await Test.createTestingModule({
            controllers: [TestController],
            imports: [BacktraceModule],
        }).compile();

        const app = module.createNestApplication({
            logger: false,
        });

        await app.init();
        await request(app.getHttpServer()).get('/error').expect(500);

        expect(postError).toBeCalled();
    });

    it('should use options from module when interceptor is added to controller via type', async () => {
        @Controller()
        @UseInterceptors(BacktraceInterceptor)
        class TestController {
            @Get('error')
            public error() {
                throw new Error('foo');
            }
        }

        const postError = jest.fn().mockResolvedValue(BacktraceReportSubmissionResult.Ok({}));

        BacktraceClient.initialize(
            {
                url: 'https://test',
            },
            (builder) =>
                builder.useRequestHandler({
                    postError,
                    post: jest.fn().mockResolvedValue(BacktraceReportSubmissionResult.Ok({})),
                }),
        );

        const buildAttributes = jest.fn().mockReturnValue({});

        const options: BacktraceExceptionHandlerOptions = {
            buildAttributes,
        };

        const module = await Test.createTestingModule({
            controllers: [TestController],
            imports: [BacktraceModule.register({ options })],
        }).compile();

        const app = module.createNestApplication({
            logger: false,
        });

        await app.init();
        await request(app.getHttpServer()).get('/error').expect(500);

        expect(buildAttributes).toBeCalled();
    });

    it('should send an error when interceptor is added to controller via value', async () => {
        @Controller()
        @UseInterceptors(new BacktraceInterceptor())
        class TestController {
            @Get('error')
            public error() {
                throw new Error('foo');
            }
        }

        const postError = jest.fn().mockResolvedValue(BacktraceReportSubmissionResult.Ok({}));

        BacktraceClient.initialize(
            {
                url: 'https://test',
            },
            (builder) =>
                builder.useRequestHandler({
                    postError,
                    post: jest.fn().mockResolvedValue(BacktraceReportSubmissionResult.Ok({})),
                }),
        );

        const module = await Test.createTestingModule({
            controllers: [TestController],
            imports: [BacktraceModule],
        }).compile();

        const app = module.createNestApplication({
            logger: false,
        });

        await app.init();
        await request(app.getHttpServer()).get('/error').expect(500);

        expect(postError).toBeCalled();
    });

    it('should send an error when interceptor is added globally via useGlobalInterceptors', async () => {
        @Controller()
        class TestController {
            @Get('error')
            public error() {
                throw new Error('foo');
            }
        }

        const postError = jest.fn().mockResolvedValue(BacktraceReportSubmissionResult.Ok({}));

        BacktraceClient.initialize(
            {
                url: 'https://test',
            },
            (builder) =>
                builder.useRequestHandler({
                    postError,
                    post: jest.fn().mockResolvedValue(BacktraceReportSubmissionResult.Ok({})),
                }),
        );

        const module = await Test.createTestingModule({
            controllers: [TestController],
            imports: [BacktraceModule],
        }).compile();

        const app = module.createNestApplication({
            logger: false,
        });
        app.useGlobalInterceptors(new BacktraceInterceptor());
        await app.init();

        await request(app.getHttpServer()).get('/error').expect(500);

        expect(postError).toBeCalled();
    });

    it('should send an error when interceptor is added globally via APP_INTERCEPTOR', async () => {
        @Controller()
        class TestController {
            @Get('error')
            public error() {
                throw new Error('foo');
            }
        }

        const postError = jest.fn().mockResolvedValue(BacktraceReportSubmissionResult.Ok({}));

        BacktraceClient.initialize(
            {
                url: 'https://test',
            },
            (builder) =>
                builder.useRequestHandler({
                    postError,
                    post: jest.fn().mockResolvedValue(BacktraceReportSubmissionResult.Ok({})),
                }),
        );

        const module = await Test.createTestingModule({
            controllers: [TestController],
            providers: [
                {
                    provide: APP_INTERCEPTOR,
                    useValue: new BacktraceInterceptor(),
                },
            ],
            imports: [BacktraceModule],
        }).compile();

        const app = module.createNestApplication({
            logger: false,
        });
        await app.init();

        await request(app.getHttpServer()).get('/error').expect(500);

        expect(postError).toBeCalled();
    });
});
