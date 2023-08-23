import { BacktraceClient, BacktraceStringAttachment, createBacktraceReduxMiddleware } from '@backtrace/browser';
import { SUBMISSION_URL } from './consts';
import { createSlice, configureStore } from '@reduxjs/toolkit';

const client = BacktraceClient.initialize({
    url: SUBMISSION_URL,
    name: '@backtrace/browser-example',
    version: '0.0.1',
    userAttributes: {
        'custom-attribute': 'test',
        'custom-annotation': {
            prop1: true,
            prop2: 123,
        },
    },
});

interface DemoState {
    count: number;
}

const initialState: DemoState = {
    count: 0,
};

const counterSlice = createSlice({
    name: 'Redux-Demo',
    initialState,
    reducers: {
        setCount(state, action) {
            state.count = action.payload;
        },
    },
});

const { setCount } = counterSlice.actions;

const store = configureStore({
    reducer: {
        counter: counterSlice.reducer,
    },
    middleware: (getDefaultMiddleware) => {
        const backtraceMiddleware = createBacktraceReduxMiddleware(client);
        return getDefaultMiddleware().concat(backtraceMiddleware);
    },
});

function getCount() {
    return store.getState().counter.count;
}

function parseNotExistingDomElement(): string {
    const element = document.getElementById('not-existing-id') as HTMLElement;
    return element.outerText.split('\n')[1].toString();
}

const sendErrorButton = document.getElementById('send-error') as HTMLElement;
const sendMessageButton = document.getElementById('send-message') as HTMLElement;
const sendUnhandledExceptionButton = document.getElementById('send-unhandled-exception') as HTMLElement;
const sendPromiseRejectionButton = document.getElementById('send-promise-rejection') as HTMLElement;
const generateMetricButton = document.getElementById('generate-metric') as HTMLElement;
const sendMetricsButton = document.getElementById('send-metrics') as HTMLElement;
const reduxDemoButton = document.getElementById('redux-demo') as HTMLElement;
const incrementCounterButton = document.getElementById('increment') as HTMLElement;
const decrementCounterButton = document.getElementById('decrement') as HTMLElement;
const clearCounterButton = document.getElementById('clear') as HTMLElement;
const sendReduxErrorButton = document.getElementById('send-redux-error') as HTMLElement;

async function sendHandledException() {
    try {
        console.log('send-error click');
        parseNotExistingDomElement();
    } catch (err) {
        await client.send(err as Error, { action: 'send-error' }, [
            new BacktraceStringAttachment('test.txt', 'sample attachment content'),
        ]);
    }
}

async function sendMessage() {
    console.log('send-message click');
    await client.send('test-message', { action: 'send-message' }, [
        new BacktraceStringAttachment('test.txt', 'sample attachment content'),
    ]);
}

function generateMetric() {
    console.log('generate-metric click');
    if (!client.metrics) {
        console.log('metrics are unavailable');
        return;
    }
    client.metrics.addSummedEvent('click');
}

function sendMetrics() {
    console.log('send-metrics click');
    if (!client.metrics) {
        console.log('metrics are unavailable');
        return;
    }
    client.metrics.send();
}

function unhandledPromiseRejection() {
    console.log('unhandled promise rejection');
    return new Promise(() => {
        throw new Error('Promise rejection');
    });
}

function unhandledException() {
    console.log('unhandled exception');
    throw new Error('unhandled exception');
}

function handleReduxButtonClick() {
    const reduxDemoContainer = document.getElementById('redux-demo-container') as HTMLElement;
    const mainButtonsContainer = document.getElementById('main-buttons-container') as HTMLElement;

    reduxDemoContainer.style.display = 'block';
    mainButtonsContainer.style.display = 'none';
}

function repaintCount() {
    const countEl = document.getElementById('count') as HTMLElement;
    const count = store.getState().counter.count;
    countEl.innerText = String(count);
}

function handleIncrementClick() {
    console.log('increment counter click');
    const count = getCount();
    store.dispatch(setCount(count + 1));
    repaintCount();
}

function handleDecrementClick() {
    console.log('decrement counter click');
    const count = getCount();
    store.dispatch(setCount(count - 1));
    repaintCount();
}

function handleClearClick() {
    console.log('clear counter click');
    store.dispatch(setCount(0));
    repaintCount();
}

sendErrorButton.onclick = sendHandledException;
sendMessageButton.onclick = sendMessage;
generateMetricButton.onclick = generateMetric;
sendMetricsButton.onclick = sendMetrics;
sendUnhandledExceptionButton.onclick = unhandledException;
sendPromiseRejectionButton.onclick = unhandledPromiseRejection;
reduxDemoButton.onclick = handleReduxButtonClick;
incrementCounterButton.onclick = handleIncrementClick;
decrementCounterButton.onclick = handleDecrementClick;
clearCounterButton.onclick = handleClearClick;
sendReduxErrorButton.onclick = sendHandledException;
