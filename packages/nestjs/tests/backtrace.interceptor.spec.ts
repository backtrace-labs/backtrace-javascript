import { BacktraceClient } from '@backtrace-labs/node';
import { BadRequestException, Controller, Get, NotFoundException, Req, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { BacktraceInterceptor, BacktraceInterceptorOptions } from '../src/backtrace.interceptor';

describe('BacktraceInterceptor', () => {
    function createMockClient() {
        const send = jest.fn();
        const client = { send } as unknown as BacktraceClient;
        return { client, send };
    }

    function createInterceptor(options: BacktraceInterceptorOptions) {
        const { client, send } = createMockClient();
        const interceptor = new BacktraceInterceptor(options, client);

        return { client, send, interceptor };
    }

    async function createAppWithInterceptor(interceptor: BacktraceInterceptor, controller: Type) {
        const module = await Test.createTestingModule({
            controllers: [controller],
        }).compile();

        const app = module.createNestApplication({
            logger: false,
        });

        app.useGlobalInterceptors(interceptor);

        return { module, app };
    }

    it('should send report to Backtrace', async () => {
        const error = new Error('foo');

        @Controller()
        class TestController {
            @Get('error')
            public error() {
                throw error;
            }
        }

        const { send, interceptor } = createInterceptor({});
        const { app } = await createAppWithInterceptor(interceptor, TestController);

        await app.init();
        await request(app.getHttpServer()).get('/error').expect(500);

        expect(send).toBeCalledWith(error, expect.anything());
    });

    it('should add http request as attribute to error', async () => {
        let expectedRequest: unknown;

        @Controller()
        class TestController {
            @Get('error')
            public error(@Req() request: unknown) {
                expectedRequest = request;
                throw new Error('foo');
            }
        }

        const { send, interceptor } = createInterceptor({});
        const { app } = await createAppWithInterceptor(interceptor, TestController);

        await app.init();
        await request(app.getHttpServer()).get('/error').expect(500);

        expect(send).toBeCalledWith(expect.anything(), { request: expectedRequest });
    });

    it('should not change the error', async () => {
        const error = new Error('foo');

        @Controller()
        class TestController {
            @Get('error')
            public error() {
                throw error;
            }
        }

        const { interceptor } = createInterceptor({});
        const { app } = await createAppWithInterceptor(interceptor, TestController);

        const filterPromise = new Promise<void>((resolve, reject) => {
            app.useGlobalFilters({
                catch(exception, host) {
                    try {
                        expect(exception).toBe(error);
                        resolve();
                    } catch (err) {
                        reject(err);
                    } finally {
                        host.switchToHttp().getResponse().sendStatus(500);
                    }
                },
            });
        });

        await app.init();
        await request(app.getHttpServer()).get('/error').expect(500);
        await filterPromise;
    });

    it('should not report to Backtrace when error is not thrown', async () => {
        @Controller()
        class TestController {
            @Get('ok')
            public ok() {
                return 'ok';
            }
        }

        const { send, interceptor } = createInterceptor({});
        const { app } = await createAppWithInterceptor(interceptor, TestController);

        await app.init();
        await request(app.getHttpServer()).get('/ok').expect(200);

        expect(send).not.toBeCalled();
    });

    describe('include', () => {
        it('should not send when error type is not on include list', async () => {
            const error = new BadRequestException('abc');

            @Controller()
            class TestController {
                @Get('error')
                public error() {
                    throw error;
                }
            }

            const { send, interceptor } = createInterceptor({
                includeExceptionTypes: [NotFoundException],
            });
            const { app } = await createAppWithInterceptor(interceptor, TestController);

            await app.init();
            await request(app.getHttpServer()).get('/error').expect(400);

            expect(send).not.toBeCalled();
        });

        it('should send when error type is on include list as a type', async () => {
            const error = new BadRequestException('abc');

            @Controller()
            class TestController {
                @Get('error')
                public error() {
                    throw error;
                }
            }

            const { send, interceptor } = createInterceptor({
                includeExceptionTypes: [BadRequestException],
            });
            const { app } = await createAppWithInterceptor(interceptor, TestController);

            await app.init();
            await request(app.getHttpServer()).get('/error').expect(400);

            expect(send).toBeCalled();
        });

        it('should send when error type is on include list as a subtype', async () => {
            const error = new BadRequestException('abc');

            @Controller()
            class TestController {
                @Get('error')
                public error() {
                    throw error;
                }
            }

            const { send, interceptor } = createInterceptor({
                includeExceptionTypes: [Error],
            });
            const { app } = await createAppWithInterceptor(interceptor, TestController);

            await app.init();
            await request(app.getHttpServer()).get('/error').expect(400);

            expect(send).toBeCalled();
        });

        it('should send when include resolves to true', async () => {
            const error = new BadRequestException('abc');

            @Controller()
            class TestController {
                @Get('error')
                public error() {
                    throw error;
                }
            }

            const { send, interceptor } = createInterceptor({
                includeExceptionTypes: () => true,
            });
            const { app } = await createAppWithInterceptor(interceptor, TestController);

            await app.init();
            await request(app.getHttpServer()).get('/error').expect(400);

            expect(send).toBeCalled();
        });

        it('should not send when include resolves to false', async () => {
            const error = new BadRequestException('abc');

            @Controller()
            class TestController {
                @Get('error')
                public error() {
                    throw error;
                }
            }

            const { send, interceptor } = createInterceptor({
                includeExceptionTypes: () => false,
            });
            const { app } = await createAppWithInterceptor(interceptor, TestController);

            await app.init();
            await request(app.getHttpServer()).get('/error').expect(400);

            expect(send).not.toBeCalled();
        });
    });

    describe('exclude', () => {
        it('should not send when error type is on exclude list', async () => {
            const error = new BadRequestException('abc');

            @Controller()
            class TestController {
                @Get('error')
                public error() {
                    throw error;
                }
            }

            const { send, interceptor } = createInterceptor({
                excludeExceptionTypes: [BadRequestException],
            });
            const { app } = await createAppWithInterceptor(interceptor, TestController);

            await app.init();
            await request(app.getHttpServer()).get('/error').expect(400);

            expect(send).not.toBeCalled();
        });

        it('should send when error type is not on exclude list as a type', async () => {
            const error = new BadRequestException('abc');

            @Controller()
            class TestController {
                @Get('error')
                public error() {
                    throw error;
                }
            }

            const { send, interceptor } = createInterceptor({
                excludeExceptionTypes: [NotFoundException],
            });
            const { app } = await createAppWithInterceptor(interceptor, TestController);

            await app.init();
            await request(app.getHttpServer()).get('/error').expect(400);

            expect(send).toBeCalled();
        });

        it('should not send when error type is on exclude list as a subtype', async () => {
            const error = new BadRequestException('abc');

            @Controller()
            class TestController {
                @Get('error')
                public error() {
                    throw error;
                }
            }

            const { send, interceptor } = createInterceptor({
                excludeExceptionTypes: [Error],
            });
            const { app } = await createAppWithInterceptor(interceptor, TestController);

            await app.init();
            await request(app.getHttpServer()).get('/error').expect(400);

            expect(send).not.toBeCalled();
        });

        it('should not send when exclude resolves to true', async () => {
            const error = new BadRequestException('abc');

            @Controller()
            class TestController {
                @Get('error')
                public error() {
                    throw error;
                }
            }

            const { send, interceptor } = createInterceptor({
                excludeExceptionTypes: () => true,
            });
            const { app } = await createAppWithInterceptor(interceptor, TestController);

            await app.init();
            await request(app.getHttpServer()).get('/error').expect(400);

            expect(send).not.toBeCalled();
        });

        it('should send when exclude resolves to false', async () => {
            const error = new BadRequestException('abc');

            @Controller()
            class TestController {
                @Get('error')
                public error() {
                    throw error;
                }
            }

            const { send, interceptor } = createInterceptor({
                excludeExceptionTypes: () => false,
            });
            const { app } = await createAppWithInterceptor(interceptor, TestController);

            await app.init();
            await request(app.getHttpServer()).get('/error').expect(400);

            expect(send).toBeCalled();
        });
    });
});
