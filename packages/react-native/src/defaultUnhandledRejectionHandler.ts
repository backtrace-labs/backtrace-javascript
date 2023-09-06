// This is the copy of the original unhandled rejection handler generated by react-native.
// The code is avaoilable here: https://github.com/facebook/react-native/blob/d468d9d57f1c6973c7bbadaecfcd61c173716b02/packages/react-native/Libraries/promiseRejectionTrackingOptions.js

export const defaultUnhandledRejectionHandler = {
    allRejections: true,
    onUnhandled: (id: number, rejection: Error) => {
        let message: string;
        let stack: string | undefined;

        // $FlowFixMe[method-unbinding] added when improving typing for this parameters
        const stringValue = Object.prototype.toString.call(rejection);
        if (stringValue === '[object Error]') {
            // $FlowFixMe[method-unbinding] added when improving typing for this parameters
            message = Error.prototype.toString.call(rejection);
            const error: Error = rejection;
            stack = error.stack as string;
        } else {
            try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                message = require('pretty-format')(rejection);
            } catch {
                message = typeof rejection === 'string' ? rejection : JSON.stringify(rejection);
            }
        }

        const warning =
            `Possible Unhandled Promise Rejection (id: ${id}):\n` + `${message ?? ''}\n` + (stack == null ? '' : stack);
        console.warn(warning);
    },
    onHandled: (id: number) => {
        const warning =
            `Promise Rejection Handled (id: ${id})\n` +
            'This means you can ignore any previous messages of the form ' +
            `"Possible Unhandled Promise Rejection (id: ${id}):"`;
        console.warn(warning);
    },
};
