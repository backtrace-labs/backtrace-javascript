// Appended to the example's index.js by the Android CI workflow. Never committed to the example.
import { Linking } from 'react-native';

Linking.addEventListener('url', ({ url }) => {
    const match = /^backtrace-example:\/\/ci-native-crash\?marker=([A-Za-z0-9-]+)$/.exec(url ?? '');
    if (!match) {
        return;
    }
    console.log(`BT_CI_DRIVER firing: ${url}`);
    const client = BacktraceClient.instance;
    client.addAttribute({ 'ci.marker': match[1] });
    client.crash();
});

console.log('BT_CI_DRIVER_ARMED');
