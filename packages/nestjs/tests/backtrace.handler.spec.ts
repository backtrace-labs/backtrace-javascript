import { BacktraceClient } from '@backtrace/node';
import {
    ArgumentsHost,
    BadRequestException,
    Controller,
    Get,
    HttpException,
    InternalServerErrorException,
    NotFoundException,
    Type,
} from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { BacktraceExceptionHandler, BacktraceExceptionHandlerOptions } from '../src/backtrace.handler.js';

describe('BacktraceInterceptor', () => {
    function createMockClient() {
        const send = jest.fn();
        const client = { send } as unknown as BacktraceClient;
        return { client, send };
    }

    function createHandler(options?: BacktraceExceptionHandlerOptions) {
        const { client, send } = createMockClient();
        const interceptor = new BacktraceExceptionHandler(options, client);

        return { client, send, interceptor };
    }

    async function createAppWithHandler(handler: BacktraceExceptionHandler, controller: Type) {
        const module = await Test.createTestingModule({
            controllers: [controller],
        }).compile();

        const app = module.createNestApplication({
            logger: false,
        });

        class Filter extends BaseExceptionFilter {
            catch(exception: unknown, host: ArgumentsHost): void {
                try {
                    handler.handleException(exception, host);
                } catch (err) {
                    // Do nothing
                }
                super.catch(exception, host);
            }
        }

        const { httpAdapter } = app.get(HttpAdapterHost);
        app.useGlobalFilters(new Filter(httpAdapter));

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

        const { send, interceptor } = createHandler({});
        const { app } = await createAppWithHandler(interceptor, TestController);

        await app.init();
        await request(app.getHttpServer()).get('/error').expect(500);

        expect(send).toBeCalledWith(error, expect.anything());
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

        const { interceptor } = createHandler({});
        const { app } = await createAppWithHandler(interceptor, TestController);

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

        const { send, interceptor } = createHandler({});
        const { app } = await createAppWithHandler(interceptor, TestController);

        await app.init();
        await request(app.getHttpServer()).get('/ok').expect(200);

        expect(send).not.toBeCalled();
    });

    it('should throw if client is uninitialized', async () => {
        const error = new Error('foo');

        @Controller()
        class TestController {
            @Get('error')
            public error() {
                throw error;
            }
        }

        const interceptor = new BacktraceExceptionHandler({});
        const handleException = jest.spyOn(interceptor, 'handleException');

        const { app } = await createAppWithHandler(interceptor, TestController);

        await app.init();
        await request(app.getHttpServer()).get('/error').expect(500);

        const result = handleException.mock.results[0];
        expect(result.type).toEqual('throw');
        expect(result.value).toBeInstanceOf(Error);
        expect(result.value.message).toBe('Backtrace instance is unavailable. Initialize the client first.');
    });

    it('should not throw if client is uninitialized and skipIfClientUndefined is true', async () => {
        const error = new Error('foo');

        @Controller()
        class TestController {
            @Get('error')
            public error() {
                throw error;
            }
        }

        const interceptor = new BacktraceExceptionHandler({
            skipIfClientUndefined: true,
        });
        const handleException = jest.spyOn(interceptor, 'handleException');

        const { app } = await createAppWithHandler(interceptor, TestController);

        await app.init();
        await request(app.getHttpServer()).get('/error').expect(500);

        const result = handleException.mock.results[0];
        expect(result.type).not.toEqual('throw');
        expect(result.value).toBe(false);
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

            const { send, interceptor } = createHandler({
                includeExceptionTypes: [NotFoundException],
            });
            const { app } = await createAppWithHandler(interceptor, TestController);

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

            const { send, interceptor } = createHandler({
                includeExceptionTypes: [BadRequestException],
            });
            const { app } = await createAppWithHandler(interceptor, TestController);

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

            const { send, interceptor } = createHandler({
                includeExceptionTypes: [Error],
            });
            const { app } = await createAppWithHandler(interceptor, TestController);

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

            const { send, interceptor } = createHandler({
                includeExceptionTypes: () => true,
            });
            const { app } = await createAppWithHandler(interceptor, TestController);

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

            const { send, interceptor } = createHandler({
                includeExceptionTypes: () => false,
            });
            const { app } = await createAppWithHandler(interceptor, TestController);

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

            const { send, interceptor } = createHandler({
                excludeExceptionTypes: [BadRequestException],
            });
            const { app } = await createAppWithHandler(interceptor, TestController);

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

            const { send, interceptor } = createHandler({
                excludeExceptionTypes: [NotFoundException],
            });
            const { app } = await createAppWithHandler(interceptor, TestController);

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

            const { send, interceptor } = createHandler({
                excludeExceptionTypes: [Error],
            });
            const { app } = await createAppWithHandler(interceptor, TestController);

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

            const { send, interceptor } = createHandler({
                excludeExceptionTypes: () => true,
            });
            const { app } = await createAppWithHandler(interceptor, TestController);

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

            const { send, interceptor } = createHandler({
                excludeExceptionTypes: () => false,
            });
            const { app } = await createAppWithHandler(interceptor, TestController);

            await app.init();
            await request(app.getHttpServer()).get('/error').expect(400);

            expect(send).toBeCalled();
        });
    });

    describe('attributes', () => {
        it('should by default add request attributes for class and contextType', async () => {
            @Controller()
            class TestController {
                @Get('error')
                public error() {
                    throw new Error('foo');
                }
            }

            const { send, interceptor } = createHandler();
            const { app } = await createAppWithHandler(interceptor, TestController);

            await app.init();
            await request(app.getHttpServer()).get('/error').expect(500);

            const actual = send.mock.calls[0][1];
            expect(actual).toMatchObject({
                'request.contextType': 'http',
            });
        });

        it('should use attributes from buildAttributes if available', async () => {
            @Controller()
            class TestController {
                @Get('error')
                public error() {
                    throw new Error('foo');
                }
            }

            const attributes = {
                foo: 'bar',
                xyz: 'abc',
            };

            const { send, interceptor } = createHandler({
                buildAttributes: () => attributes,
            });

            const { app } = await createAppWithHandler(interceptor, TestController);

            await app.init();
            await request(app.getHttpServer()).get('/error').expect(500);

            const actual = send.mock.calls[0][1];
            expect(actual).toEqual(attributes);
        });

        it('should pass default attributes to buildAttributes', async () => {
            @Controller()
            class TestController {
                @Get('error')
                public error() {
                    throw new Error('foo');
                }
            }

            const buildAttributes = jest.fn().mockReturnValue({
                foo: 'bar',
                xyz: 'abc',
            });

            const { interceptor } = createHandler({
                buildAttributes,
            });

            const { app } = await createAppWithHandler(interceptor, TestController);

            await app.init();
            await request(app.getHttpServer()).get('/error').expect(500);

            expect(buildAttributes).toBeCalledWith(
                expect.anything(),
                expect.objectContaining({
                    'request.contextType': 'http',
                }),
            );
        });
    });

    describe('include and exclude default behavior', () => {
        it('should by default send Error exceptions', async () => {
            @Controller()
            class TestController {
                @Get('error')
                public error() {
                    throw new Error('foo');
                }
            }

            const { send, interceptor } = createHandler();
            const { app } = await createAppWithHandler(interceptor, TestController);

            await app.init();
            await request(app.getHttpServer()).get('/error').expect(500);

            expect(send).toBeCalled();
        });

        it('should by default send InternalServerErrorException exceptions', async () => {
            @Controller()
            class TestController {
                @Get('error')
                public error() {
                    throw new InternalServerErrorException('foo');
                }
            }

            const { send, interceptor } = createHandler();
            const { app } = await createAppWithHandler(interceptor, TestController);

            await app.init();
            await request(app.getHttpServer()).get('/error').expect(500);

            expect(send).toBeCalled();
        });

        it('should by default send HttpException exceptions with 500 status', async () => {
            @Controller()
            class TestController {
                @Get('error')
                public error() {
                    throw new HttpException('foo', 500);
                }
            }

            const { send, interceptor } = createHandler();
            const { app } = await createAppWithHandler(interceptor, TestController);

            await app.init();
            await request(app.getHttpServer()).get('/error').expect(500);

            expect(send).toBeCalled();
        });

        it('should by default not send HttpException exceptions with 400 status', async () => {
            @Controller()
            class TestController {
                @Get('error')
                public error() {
                    throw new HttpException('foo', 400);
                }
            }

            const { send, interceptor } = createHandler();
            const { app } = await createAppWithHandler(interceptor, TestController);

            await app.init();
            await request(app.getHttpServer()).get('/error').expect(400);

            expect(send).not.toBeCalled();
        });

        it('should by default not send BadRequestException exceptions', async () => {
            @Controller()
            class TestController {
                @Get('error')
                public error() {
                    throw new BadRequestException('foo');
                }
            }

            const { send, interceptor } = createHandler();
            const { app } = await createAppWithHandler(interceptor, TestController);

            await app.init();
            await request(app.getHttpServer()).get('/error').expect(400);

            expect(send).not.toBeCalled();
        });
    });
});
