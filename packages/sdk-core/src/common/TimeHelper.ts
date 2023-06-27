export class TimeHelper {
    public static now(): number {
        return Date.now();
    }

    public static toTimestampInSec(timestampMs: number): number {
        return Math.floor(timestampMs / 1000);
    }

    public static convertSecondsToMilliseconds(timeInSec: number): number {
        return timeInSec * 1000;
    }
}
