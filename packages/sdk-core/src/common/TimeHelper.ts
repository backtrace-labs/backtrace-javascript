export class TimeHelper {
    public static timeNowInSec(): number {
        return Math.floor(new Date().getTime() / 1000);
    }
}
