import { BacktraceClient } from '@backtrace-labs/react-native';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { SUBMISSION_URL } from './src/consts';

BacktraceClient.initialize({
    url: SUBMISSION_URL,
    userAttributes: {
        'custom-attribute': 'test',
        id: 1,
        'is-boolean': true,
        'custom-annotation': {
            prop1: true,
            prop2: 123,
        },
    },
});

AppRegistry.registerComponent(appName, () => App);
