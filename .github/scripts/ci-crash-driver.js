// Appended to the example's index.js by the Android CI workflow. Never committed to the example.
import { Linking } from 'react-native';

Linking.addEventListener('url', ({ url }) => {
    const fatal = /^backtrace-example:\/\/ci-js-fatal\?marker=([A-Za-z0-9-]+)$/.exec(url ?? '');
    if (fatal) {
        console.log(`BT_CI_DRIVER firing: ${url}`);
        setTimeout(() => {
            throw new Error(`BT_CI_JS_FATAL ${fatal[1]}`);
        }, 0);
        return;
    }
    const match = /^backtrace-example:\/\/ci-native-crash\?marker=([A-Za-z0-9-]+)$/.exec(url ?? '');
    if (!match) {
        return;
    }
    console.log(`BT_CI_DRIVER firing: ${url}`);
    const client = BacktraceClient.instance;
    client.addAttribute({ 'ci.marker': match[1] });
    client.crash();
});

BacktraceClient.instance?.database?.on('added', (record) => {
    if (record.type === 'report') {
        console.log(
            `BT_CI_RECORD ${record.data.classifiers?.[0]} ${JSON.stringify(record.data.attributes?.['error.message'] ?? '')}`,
        );
    }
});

console.log('BT_CI_DRIVER_ARMED');
