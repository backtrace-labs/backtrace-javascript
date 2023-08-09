import { useState } from 'react';

export default function ButtonWithError() {
    const [clicked, setClicked] = useState(false);

    function throwOnClicked() {
        if (clicked) {
            throw new Error('Test throw in ButtonWithBoundary to demonstrate an Inner Error Boundary');
        }
    }

    return (
        <>
            {throwOnClicked()}
            <button className="action-button" onClick={() => setClicked(true)}>
                <span className="action-button-text">Trigger Inner ErrorBoundary</span>
            </button>
        </>
    );
}
