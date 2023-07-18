import React, { useState } from 'react';
import './App.css';
import { BacktraceClient } from '@backtrace/react';

function App() {
    const [clicked, setClicked] = useState(false);
    function sendError() {
        const client = BacktraceClient.instance;
        if (client) {
            client.send(new Error('Manual Test Error'));
            alert('Error sent! Check your Backtrace console to see the error.');
        }
    }
    if (clicked) {
        throw new Error('Test throw to demonstrate the Backtrace Error Boundary');
    }
    return (
        <div className="App">
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
                        <span className="action-button-text">Trigger Error Boundary</span>
                    </button>
                    <button className="action-button" onClick={() => sendError()}>
                        <span className="action-button-text">Manually Send Report</span>
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
