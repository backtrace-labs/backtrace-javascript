// source: https://github.com/facebook/react-native/blob/d468d9d57f1c6973c7bbadaecfcd61c173716b02/packages/react-native/flow/HermesInternalType.js
export interface Hermes {
    hasPromise?: () => boolean;
    enablePromiseRejectionTracker: (options: {
        allRejections: boolean;
        onUnhandled: (id: number, rejection?: Error | string) => void;
    }) => void;
}
