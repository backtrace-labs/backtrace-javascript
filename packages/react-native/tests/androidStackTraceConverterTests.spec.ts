import { type BacktraceStackFrame } from '@backtrace/sdk-core';
import { fail } from 'assert';
import { AndroidStackTraceConverter } from '../src/converters/AndroidStackTraceConverter';

describe('Android Stack trace converter tests', () => {
    it('Should parse correctly android stack trace', () => {
        const testFrames: Array<BacktraceStackFrame & { frame: string }> = [
            {
                frame: 'com.facebook.react.bridge.JavaMethodWrapper.invoke(JavaMethodWrapper.java:383)',
                library: 'JavaMethodWrapper.java',
                funcName: 'com.facebook.react.bridge.JavaMethodWrapper.invoke',
                line: 383,
            },
            {
                frame: 'com.facebook.jni.NativeRunnable.run(Native Method)',
                library: 'Native',
                funcName: 'com.facebook.jni.NativeRunnable.run',
            },
            {
                frame: 'android.os.Handler.handleCallback(Handler.java:942)',
                library: 'Handler.java',
                funcName: 'android.os.Handler.handleCallback',
                line: 942,
            },
            {
                frame: 'com.facebook.react.bridge.queue.MessageQueueThreadHandler.dispatchMessage(MessageQueueThreadHandler.java:27)',
                library: 'MessageQueueThreadHandler.java',
                funcName: 'com.facebook.react.bridge.queue.MessageQueueThreadHandler.dispatchMessage',
                line: 27,
            },
            {
                frame: 'java.lang.Thread.run(Thread.java:1012)',
                library: 'Thread.java',
                funcName: 'java.lang.Thread.run',
                line: 1012,
            },
        ];
        const androidStackTrace = testFrames.map((n) => n.frame).join('\n');

        const androidStackTraceConverter = new AndroidStackTraceConverter();
        const stackFrames = androidStackTraceConverter.convert(androidStackTrace);

        for (let index = 0; index < testFrames.length; index++) {
            expect(testFrames[index]).toMatchObject(stackFrames[index] as object);
        }
    });

    it('Should convert native method into native library', () => {
        const nativeMethodFrame = 'com.facebook.jni.NativeRunnable.run(Native Method)';
        const androidStackTraceConverter = new AndroidStackTraceConverter();
        const [stackFrame] = androidStackTraceConverter.convert(nativeMethodFrame);
        if (!stackFrame) {
            fail('Stack frame is not defined');
        }
        expect(stackFrame.library).toEqual(androidStackTraceConverter.NativeLibraryName);
    });

    it('Should trim stack trace', () => {
        const nativeMethodFrame = ' \n\ncom.facebook.jni.NativeRunnable.run(Native Method) \n';
        const androidStackTraceConverter = new AndroidStackTraceConverter();
        const stackFrames = androidStackTraceConverter.convert(nativeMethodFrame);
        expect(stackFrames.length).toBe(1);
    });

    it('Should generate an empty stack trace if stack trace is undefined', () => {
        const androidStackTraceConverter = new AndroidStackTraceConverter();
        const stackFrames = androidStackTraceConverter.convert(undefined as unknown as string);
        expect(stackFrames).toBeDefined();
        expect(stackFrames.length).toBe(0);
    });
});
