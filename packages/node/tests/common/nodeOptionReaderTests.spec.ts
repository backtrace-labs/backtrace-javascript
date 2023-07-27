import { NodeOptionReader } from '../../src/common/NodeOptionReader';
describe('Node options reader', () => {
    describe('argv', () => {
        it('should read --unhandled-rejections option', () => {
            const option = 'unhandled-rejections';
            const expectedValue = 'none';
            const optionWithValue = `--${option}=${expectedValue}`;

            const value = NodeOptionReader.read(option, [optionWithValue]);

            expect(value).toEqual(expectedValue);
        });

        it('should read boolean value option if the option is defined', () => {
            const option = 'trace-warnings';
            const optionWithValue = `--${option}`;

            const value = NodeOptionReader.read(option, [optionWithValue]);

            expect(value).toBeTruthy();
        });

        it('should read undefined if the option is not available', () => {
            const value = NodeOptionReader.read('', ['']);

            expect(value).toBeUndefined();
        });

        it('should read --unhandled-rejections option with option passed with --', () => {
            const option = '--unhandled-rejections';
            const expectedValue = 'warn';
            const optionWithValue = `${option}=${expectedValue}`;

            const value = NodeOptionReader.read(option, [optionWithValue]);

            expect(value).toEqual(expectedValue);
        });

        it('should not read --unhandled-rejections if its not available', () => {
            const value = NodeOptionReader.read('unhandled-rejections');

            expect(value).toBeUndefined();
        });

        it('should prefer --unhandled-rejections available in argv and ignore NODE_OPTIONS', () => {
            const option = '--unhandled-rejections';
            const expectedValue = 'warn';
            const expectedOptionWithValue = `${option}=${expectedValue}`;
            const invalidOptionWithValue = `${option}=none`;

            const value = NodeOptionReader.read(
                'unhandled-rejections',
                [expectedOptionWithValue],
                invalidOptionWithValue,
            );

            expect(value).toEqual(expectedValue);
        });
    });

    describe('NODE_OPTIONS', () => {
        it('should read --unhandled-rejections option from NODE_OPTIONS', () => {
            const option = 'unhandled-rejections';
            const expectedValue = 'throw';
            const optionWithValue = `--${option}=${expectedValue}`;

            const value = NodeOptionReader.read(option, [], optionWithValue);

            expect(value).toEqual(expectedValue);
        });

        it('should read --unhandled-rejections option if multiple NODE_OPTIONS are available', () => {
            const option = 'unhandled-rejections';
            const expectedValue = 'throw';
            const optionWithValue = `--${option}=${expectedValue}`;

            const value = NodeOptionReader.read(
                option,
                [],
                `--max-old-space-size=8192 ${optionWithValue} --track-heap-objects`,
            );

            expect(value).toEqual(expectedValue);
        });

        it('should not read --unhandled-rejections if its not available', () => {
            const value = NodeOptionReader.read('unhandled-rejections');

            expect(value).toBeUndefined();
        });
    });
});
