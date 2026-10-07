// Appended to the example's index.js by the Android CI workflow. Never committed to the example.
import * as CiReact from 'react';
import { AppRegistry as CiAppRegistry, Linking } from 'react-native';

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
        const { attributes, classifiers, threads } = record.data;
        console.log(
            `BT_CI_RECORD ${classifiers?.[0]} ${JSON.stringify(attributes?.['error.message'] ?? '')} ` +
                `${JSON.stringify(attributes?.['error.type'] ?? '')} fatal=${attributes?.fatal} ` +
                `threads=${Object.keys(threads ?? {}).join(',')}`,
        );
    }
});

function CiRenderError({ marker }) {
    throw new Error(`BT_CI_RENDER_ERROR ${marker}`);
}

// Sits outside the example's ErrorBoundary.
function CiRenderErrorRoot({ children }) {
    const [marker, setMarker] = CiReact.useState();
    CiReact.useEffect(() => {
        const subscription = Linking.addEventListener('url', ({ url }) => {
            const match = /^backtrace-example:\/\/ci-render-error\?marker=([A-Za-z0-9-]+)$/.exec(url ?? '');
            if (match) {
                console.log(`BT_CI_DRIVER firing: ${url}`);
                setTimeout(() => setMarker(match[1]), 0);
            }
        });
        console.log('BT_CI_DRIVER_ARMED');
        return () => subscription.remove();
    }, []);
    return marker ? CiReact.createElement(CiRenderError, { marker }) : children;
}

CiAppRegistry.setWrapperComponentProvider(() => CiRenderErrorRoot);
