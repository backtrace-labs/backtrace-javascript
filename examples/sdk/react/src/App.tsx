import React, { useState } from 'react';
import './App.css';
import { BacktraceClient, ErrorBoundary } from '@backtrace/react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { SUBMISSION_URL } from './consts';
import InnerFallback from './components/InnerFallback';
import ButtonWithError from './components/ButtonWithError';

function App() {
    const [clicked, setClicked] = useState(false);
    const client = BacktraceClient.instance;

    async function sendError() {
        await client.send(new Error('Manual Test Error'));
        toast('Error sent! Check your Backtrace console to see the error.');
    }

    async function sendMessage() {
        await client.send('Manual Test Message');
        toast('Message sent! Check your Backtrace console to see the message.');
    }

    async function sendMetrics() {
        if (!client.metrics) {
            toast.error('Metrics are unavailable');
            return;
        }
        client.metrics.send();
        toast('Metrics sent! Check your Backtrace console to see the metrics.');
    }

    if (clicked) {
        throw new Error('Test throw to demonstrate the Backtrace Error Boundary');
    }
    if (SUBMISSION_URL.includes('your-universe')) {
        toast.error('Don\'t forget to update your submission url in "./src/consts.ts" with your universe and token!');
    }

    return (
        <div className="App">
            <ToastContainer />
            <div className="App-header center">
                <img
                    src="https://info.saucelabs.com/rs/468-XBT-687/images/SL%20logo%20horizontal%20color%2Bdark%402x.png"
                    width={250}
                    alt="Sauce Labs"
                />
                <h1 className="card-header">Welcome to the Backtrace React SDK demo!</h1>
                <p className="card-header extra-padding-bottom">
                    Click the button below to throw an error and demo the Error Boundary
                </p>
                <div className="column">
                    <button className="action-button" onClick={() => setClicked(true)}>
                        <span className="action-button-text">Trigger Main ErrorBoundary</span>
                    </button>
                    <ErrorBoundary name="inner-boundary" fallback={<InnerFallback />}>
                        <ButtonWithError />
                    </ErrorBoundary>
                    <button className="action-button" onClick={() => sendError()}>
                        <span className="action-button-text">Send an error</span>
                    </button>
                    <button className="action-button" onClick={() => sendMessage()}>
                        <span className="action-button-text">Send a message</span>
                    </button>
                    <button className="action-button" onClick={() => sendMetrics()}>
                        <span className="action-button-text">Send metrics</span>
                    </button>
                </div>
            </div>
            <div className="footer center">
                <div className="center">
                    <a href="https://www.facebook.com/saucelabs">
                        <img
                            src="https://info.saucelabs.com/rs/468-XBT-687/images/facebook.png"
                            height="30px"
                            width="30"
                            alt=""
                        />
                    </a>
                    <a href="https://www.linkedin.com/company/sauce-labs/" className="extra-padding">
                        <img
                            src="https://info.saucelabs.com/rs/468-XBT-687/images/Linkedin.png"
                            height="30px"
                            width="30"
                            alt=""
                        />
                    </a>
                    <a href="http://www.twitter.com/saucelabs/">
                        <img
                            src="https://info.saucelabs.com/rs/468-XBT-687/images/twitter.png"
                            height="30px"
                            width="30"
                            alt=""
                        />
                    </a>
                </div>
                <div>
                    <h5>Sauce Labs</h5>
                    <p>450 Sansome Street, 9th Floor, San Francisco, CA 94111</p>
                    <p>Copyright © 2023 Sauce Labs. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}

export default App;
