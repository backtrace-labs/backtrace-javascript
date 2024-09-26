import { BacktraceClient, BreadcrumbLogLevel, BreadcrumbType } from '@backtrace/react-native';
import { Alert, Platform } from 'react-native';
import { actions as androidActions } from './android/action';

export interface DemoAction {
    name: string;
    platform: 'android' | 'ios';
    action: () => void | Promise<void>;
}
const innerFunction = () => {
    return (undefined as unknown as string).toString();
};
const throwAnError = () => {
    innerFunction();
};

function notify(message: string) {
    console.log(message);
    Alert.prompt('Backtrace', message, [], 'default', undefined, undefined, {
        cancelable: false,
    });
}

export function generateActions(client: BacktraceClient) {
    const platform = Platform.OS as 'android' | 'ios';
    return [
        {
            name: 'OOM',
            platform,
            action: () => {
                function allocateMemory(size: number) {
                    const numbers = size / 8;
                    const arr = [];
                    arr.length = numbers;
                    for (let i = 0; i < numbers; i++) {
                        arr[i] = i;
                    }
                    return arr;
                }

                const TIME_INTERVAL_IN_MSEC = 40;
                const memoryLeakAllocations = [];

                console.log('Starting OOM. Your application should crash soon.');
                console.log('This may take a while dependning on memory limits.');
                setInterval(() => {
                    const allocation = allocateMemory(10 * 1024 * 1024);
                    memoryLeakAllocations.push(allocation);
                }, TIME_INTERVAL_IN_MSEC);

                return new Promise(() => {
                    // Never resolve
                });
            },
        },
        {
            name: 'Throw an error',
            platform,
            action: async () => {
                console.log('Sending an error to Backtrace.');
                try {
                    throwAnError();
                } catch (err) {
                    await client.send(err as Error);
                }
                notify('Error sent! Check your Backtrace console to see the error.');
            },
        },
        {
            name: 'Send a message',
            platform,
            action: async () => {
                console.log('Sending a message to Backtrace.');
                await client.send('Manual Test Message');
                notify('Message sent! Check your Backtrace console to see the message.');
            },
        },
        {
            name: 'Throw an unhandled error',
            platform,
            action: async () => {
                notify('Sending an unhandled exception to Backtrace.');
                throwAnError();
            },
        },
        {
            name: 'Crash application',
            platform,
            action: async () => {
                client.crash();
            },
        },
        {
            name: 'Generate metric',
            platform,
            action: async () => {
                if (!client.metrics) {
                    notify('Metrics are unavailable');
                    return;
                }

                notify('Adding a new metric called "Generate metric"');
                client.metrics.addSummedEvent('Generate metrics', { date: Date.now() });
            },
        },
        {
            name: 'Send metrics',
            platform,
            action: async () => {
                if (!client.metrics) {
                    notify('Metrics are unavailable');
                    return;
                }

                notify('Sending metrics');
                client.metrics.send();
            },
        },
        {
            name: 'Update a time attribute',
            platform,
            action: async () => {
                const value = Date.now();
                notify(`Setting a time attribute to ${value}`);
                client.addAttribute({ time: value });
            },
        },
        {
            name: 'Add a breadcrumb',
            platform,
            action: async () => {
                const timestamp = Date.now();
                notify(`Adding manual breadcrumb`);
                client.breadcrumbs?.addBreadcrumb('Manual breadcrumb', BreadcrumbLogLevel.Info, BreadcrumbType.User, {
                    timestamp,
                });
            },
        },
        ...Platform.select({
            android: androidActions,
            default: [],
        }),
    ];
}
