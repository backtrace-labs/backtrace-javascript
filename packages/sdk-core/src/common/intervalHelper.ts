/**
 * Due to the event loop, NodeJS application might not exit
 * due to some background work that the SDK delegates to setIntervals.
 * Thanks to this helper we can cancell interval in NodeJS process.
 * @param interval setInterval interval
 */
export function unrefInterval(interval: number | NodeJS.Timeout) {
    if (!interval || typeof interval === 'number') {
        return;
    }

    interval.unref();
}
