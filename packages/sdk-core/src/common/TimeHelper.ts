export class TimeHelper {
    public static timeNowInMs(): number {
        return Date.now();
    }
    public static timeNowInSec(): number {
        return Math.floor(Date.now() / 1000);
    }
}
