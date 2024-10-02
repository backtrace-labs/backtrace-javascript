import { BacktraceReportSubmissionResult } from '@backtrace/sdk-core';
import { CanActivate, Controller, Get, UseFilters, UseGuards } from '@nestjs/common';
import { APP_FILTER, HttpAdapterHost } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { BacktraceExceptionFilter } from '../src/backtrace.filter.js';
import { BacktraceExceptionHandlerOptions } from '../src/backtrace.handler.js';
import { BacktraceClient, BacktraceModule } from '../src/index.js';

describe('BacktraceExceptionFilter e2e', () => {
    beforeEach(() => {
        BacktraceClient.instance?.dispose();
    });

    it('should send an error thrown from a guard when filter is added to controller via type', async () => {
        class ThrowingGuard implements CanActivate {
            canActivate(): never {
                throw new Error('foo');
            }
        }

        @Controller()
        class TestController {
            @Get('error')
            @UseGuards(ThrowingGuard)
            @UseFilters(BacktraceExceptionFilter)
            public error() {
                return 'should not reach here';
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

    it('should use options from module when filter is added to controller via type', async () => {
        class ThrowingGuard implements CanActivate {
            canActivate(): never {
                throw new Error('foo');
            }
        }

        @Controller()
        class TestController {
            @Get('error')
            @UseGuards(ThrowingGuard)
            @UseFilters(BacktraceExceptionFilter)
            public error() {
                return 'should not reach here';
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
            imports: [
                BacktraceModule.register({
                    options,
                }),
            ],
        }).compile();

        const app = module.createNestApplication({
            logger: false,
        });
        await app.init();

        await request(app.getHttpServer()).get('/error').expect(500);

        expect(buildAttributes).toBeCalled();
    });

    it('should send an error thrown from a guard when filter is added globally via useGlobalFilters', async () => {
        class ThrowingGuard implements CanActivate {
            canActivate(): never {
                throw new Error('foo');
            }
        }

        @Controller()
        class TestController {
            @Get('error')
            @UseGuards(ThrowingGuard)
            public error() {
                return 'should not reach here';
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

        const { httpAdapter } = app.get(HttpAdapterHost);
        app.useGlobalFilters(new BacktraceExceptionFilter({}, httpAdapter));

        await app.init();

        await request(app.getHttpServer()).get('/error').expect(500);

        expect(postError).toBeCalled();
    });

    it('should send an error thrown from a guard when filter is added globally via APP_FILTER', async () => {
        class ThrowingGuard implements CanActivate {
            canActivate(): never {
                throw new Error('foo');
            }
        }

        @Controller()
        class TestController {
            @Get('error')
            @UseGuards(ThrowingGuard)
            public error() {
                return 'should not reach here';
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
                    provide: APP_FILTER,
                    useExisting: BacktraceExceptionFilter,
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
