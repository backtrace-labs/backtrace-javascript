import { NativeModules } from 'react-native';
import { DemoAction } from '../actions';

export const actions: DemoAction[] = __DEV__
    ? []
    : [
          {
              name: 'ANR',
              platform: 'android',
              action: async () => {
                  const errorGenerator = NativeModules.ErrorGenerator;
                  if (!errorGenerator) {
                      throw new Error('Native modules are not enabled.');
                  }

                  errorGenerator.blockMainThread(10000);
              },
          },
          {
              name: 'Generate Android unhandled exception',
              platform: 'android',
              action: async () => {
                  const errorGenerator = NativeModules.ErrorGenerator;
                  if (!errorGenerator) {
                      throw new Error('Native modules are not enabled.');
                  }

                  errorGenerator.throwError();
              },
          },
      ];
