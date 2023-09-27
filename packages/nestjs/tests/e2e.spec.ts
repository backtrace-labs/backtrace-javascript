import { BacktraceReportSubmissionResult } from '@backtrace-labs/sdk-core';
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { BacktraceClient, BacktraceInterceptor, BacktraceModule } from '../src';

describe('e2e', () => {
    it('should send an error when interceptor is added to controller', async () => {
        @Controller()
        @UseInterceptors(new BacktraceInterceptor())
        class TestController {
            @Get('error')
            public error() {
                throw new Error('foo');
            }
        }

        const postError = jest.fn().mockResolvedValue(BacktraceReportSubmissionResult.Ok({}));

        const module = await Test.createTestingModule({
            controllers: [TestController],
            imports: [
                BacktraceModule.forRoot(
                    BacktraceClient.builder({
                        url: 'https://test',
                    }).useRequestHandler({
                        postError,
                        post: jest.fn().mockResolvedValue(BacktraceReportSubmissionResult.Ok({})),
                    }),
                ),
            ],
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

        const module = await Test.createTestingModule({
            controllers: [TestController],
            imports: [
                BacktraceModule.forRoot(
                    BacktraceClient.builder({
                        url: 'https://test',
                    }).useRequestHandler({
                        postError,
                        post: jest.fn().mockResolvedValue(BacktraceReportSubmissionResult.Ok({})),
                    }),
                ),
            ],
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

        const module = await Test.createTestingModule({
            controllers: [TestController],
            providers: [
                {
                    provide: APP_INTERCEPTOR,
                    useValue: new BacktraceInterceptor(),
                },
            ],
            imports: [
                BacktraceModule.forRoot(
                    BacktraceClient.builder({
                        url: 'https://test',
                    }).useRequestHandler({
                        postError,
                        post: jest.fn().mockResolvedValue(BacktraceReportSubmissionResult.Ok({})),
                    }),
                ),
            ],
        }).compile();

        const app = module.createNestApplication({
            logger: false,
        });
        await app.init();

        await request(app.getHttpServer()).get('/error').expect(500);

        expect(postError).toBeCalled();
    });
});
