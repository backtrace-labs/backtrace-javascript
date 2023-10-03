import { Platform } from 'react-native';
import { AndroidUnhandledExceptionHandler } from './android/AndroidUnhandledExceptionHandler';
import { type ExceptionHandler } from './ExceptionHandler';
import { UnhandledExceptionHandler } from './UnhandledExceptionHandler';

export function generateUnhandledExceptionHandler(): ExceptionHandler {
    switch (Platform.OS) {
        case 'android': {
            return new AndroidUnhandledExceptionHandler();
        }
        default: {
            return new UnhandledExceptionHandler();
        }
    }
}
