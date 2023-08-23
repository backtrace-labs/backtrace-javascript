import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package '@backtrace/react-native' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const ReactNative = NativeModules.ReactNative
  ? NativeModules.ReactNative
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

export function multiply(a: number, b: number): Promise<number> {
  return ReactNative.multiply(a, b);
}

export { BacktraceClient } from './BacktraceClient';
export { BacktraceClientBuilder } from './BacktraceClientBuilder';
