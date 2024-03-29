import '../App.css';

interface Props {
    error: Error;
}

export default function Fallback({ error }: Props) {
    return (
        <div className="App">
            <div className="App-header center">
                <img
                    src="https://info.saucelabs.com/rs/468-XBT-687/images/SL%20logo%20horizontal%20color%2Bdark%402x.png"
                    width={250}
                    alt="Sauce Labs"
                />
                <h1 className="card-header">
                    This is the fallback component that gets rendered after a rendering error within the main
                    ErrorBoundary!
                </h1>
                <p className="card-text">Check your Backtrace console to see the Error and Component stacks!</p>
                <p className="card-text">Error: {error.message}</p>
            </div>
        </div>
    );
}
