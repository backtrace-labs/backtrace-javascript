import { BreadcrumbsStorage } from '../../src/index.js';
import { AttributeManager } from '../../src/modules/attribute/AttributeManager.js';
import { BreadcrumbsManager } from '../../src/modules/breadcrumbs/BreadcrumbsManager.js';
import { BacktraceTestClient } from '../mocks/BacktraceTestClient.js';

describe('Failure containment', () => {
    let warnSpy: jest.SpyInstance;

    beforeEach(() => {
        warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        warnSpy.mockRestore();
        jest.clearAllMocks();
    });

    describe('attribute providers', () => {
        it('Should skip a throwing scoped provider and keep the others', () => {
            const manager = new AttributeManager([
                {
                    type: 'scoped',
                    get: () => {
                        throw new Error('secret-token-in-message');
                    },
                },
                { type: 'scoped', get: () => ({ kept: 'yes' }) },
            ]);

            expect(manager.get().attributes).toEqual({ kept: 'yes' });
            expect(warnSpy).toHaveBeenCalledTimes(1);
            expect(warnSpy.mock.calls[0][0]).toContain('skipped an attribute provider');
            expect(warnSpy.mock.calls[0][0]).not.toContain('secret-token-in-message');
        });

        it('Should skip a throwing dynamic provider on every resolution and warn once', () => {
            const manager = new AttributeManager([
                {
                    type: 'dynamic',
                    get: () => {
                        throw new Error('boom');
                    },
                },
                { type: 'dynamic', get: () => ({ kept: 'yes' }) },
            ]);

            expect(manager.get().attributes).toEqual({ kept: 'yes' });
            expect(manager.get().attributes).toEqual({ kept: 'yes' });
            expect(warnSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('breadcrumbs', () => {
        function throwingStorage(): BreadcrumbsStorage {
            return {
                lastBreadcrumbId: 0,
                add: () => {
                    throw new Error('disk full');
                },
                getAttachments: () => [],
            } as unknown as BreadcrumbsStorage;
        }

        it('Should return false instead of throwing when the storage throws', () => {
            const manager = new BreadcrumbsManager(undefined, { storage: throwingStorage });
            manager.initialize();

            expect(manager.info('first')).toBe(false);
            expect(manager.info('second')).toBe(false);
            expect(warnSpy).toHaveBeenCalledTimes(1);
            expect(warnSpy.mock.calls[0][0]).toContain('failed to record a breadcrumb');
            manager.dispose();
        });

        it('Should return false instead of throwing when the interceptor throws', () => {
            const manager = new BreadcrumbsManager({
                intercept: () => {
                    throw new Error('interceptor bug');
                },
            });
            manager.initialize();

            expect(manager.info('test')).toBe(false);
            manager.dispose();
        });

        it('Should keep the patched console usable when the storage throws', () => {
            const manager = new BreadcrumbsManager(undefined, { storage: throwingStorage });
            manager.initialize();

            expect(() => console.log('app log')).not.toThrow();
            expect(() => console.error('app error')).not.toThrow();
            manager.dispose();
        });
    });

    describe('send', () => {
        it('Should resolve with an Unknown status instead of throwing when beforeSend throws', async () => {
            const client = BacktraceTestClient.buildFakeClient({
                beforeSend: () => {
                    throw new Error('boom');
                },
            });

            const result = await client.send(new Error('test'));
            expect(result.status).toBe('Unknown');
            expect(warnSpy.mock.calls[0][0]).toContain('failed to send a report');
        });

        it('Should resolve instead of rejecting when an after-send listener throws', async () => {
            const client = BacktraceTestClient.buildFakeClient();
            client.on('after-send', () => {
                throw new Error('boom');
            });

            await expect(client.send(new Error('test'))).resolves.toBeDefined();
        });

        it('Should still send the report when a dynamic attribute provider throws', async () => {
            const client = BacktraceTestClient.buildFakeClient();
            client.addAttribute(() => {
                throw new Error('boom');
            });

            const result = await client.send(new Error('test'));
            expect(result.status).toBe('Ok');
        });
    });
});
