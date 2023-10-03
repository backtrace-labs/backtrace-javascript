import { Events } from '../../src/common/Events';

describe('Events', () => {
    it('should call every callback once', () => {
        const event = 'event';
        const fn1 = jest.fn();
        const fn2 = jest.fn();
        const fn3 = jest.fn();

        const events = new Events();
        events.on(event, fn1);
        events.on(event, fn2);
        events.on(event, fn3);

        events.emit(event);

        expect(fn1).toBeCalledTimes(1);
        expect(fn2).toBeCalledTimes(1);
        expect(fn3).toBeCalledTimes(1);
    });

    it('should pass args to callback', () => {
        const event = 'event';
        const fn = jest.fn();
        const args = ['a', 1, true];

        const events = new Events();
        events.on(event, fn);

        events.emit(event, ...args);

        expect(fn).toBeCalledWith(...args);
    });

    it('should call each callback in order', () => {
        const event = 'event';
        const fn1 = jest.fn();
        const fn2 = jest.fn();
        const fn3 = jest.fn();

        const events = new Events();
        events.on(event, fn1);
        events.on(event, fn2);
        events.on(event, fn3);

        events.emit(event);

        expect(fn1.mock.invocationCallOrder[0]).toBeLessThan(fn2.mock.invocationCallOrder[0]);
        expect(fn2.mock.invocationCallOrder[0]).toBeLessThan(fn3.mock.invocationCallOrder[0]);
    });

    it('should call once callback only once', () => {
        const event = 'event';
        const fn = jest.fn();

        const events = new Events();
        events.once(event, fn);

        events.emit(event);
        events.emit(event);

        expect(fn).toBeCalledTimes(1);
    });

    it('should call callback every time', () => {
        const event = 'event';
        const fn = jest.fn();

        const events = new Events();
        events.on(event, fn);

        events.emit(event);
        events.emit(event);

        expect(fn).toBeCalledTimes(2);
    });

    it('should return false from emit when there are no listeners', () => {
        const events = new Events();
        expect(events.emit('event')).toEqual(false);
    });

    it('should return true from emit when there are listeners', () => {
        const event = 'event';
        const fn = jest.fn();

        const events = new Events();
        events.on(event, fn);

        expect(events.emit('event')).toEqual(true);
    });

    it('should no longer call removed callback', () => {
        const event = 'event';
        const fn = jest.fn();

        const events = new Events();
        events.on(event, fn);
        events.emit(event);
        events.off(event, fn);
        events.emit(event);

        expect(fn).toBeCalledTimes(1);
    });

    it('should not throw when callback throws', () => {
        const event = 'event';
        const fn = jest.fn().mockImplementation(() => {
            throw new Error('abc');
        });

        const events = new Events();
        events.on(event, fn);

        expect(() => events.emit(event)).not.toThrow();
    });

    it('should execute other callbacks when callback throws', () => {
        const event = 'event';
        const fn1 = jest.fn();
        const fn2 = jest.fn().mockImplementation(() => {
            throw new Error('abc');
        });
        const fn3 = jest.fn();

        const events = new Events();
        events.on(event, fn1);
        events.on(event, fn2);
        events.on(event, fn3);
        events.emit(event);

        expect(fn1).toBeCalledTimes(1);
        expect(fn2).toBeCalledTimes(1);
        expect(fn3).toBeCalledTimes(1);
    });
});
