export class TimeHelper {
    public static now(): number {
        return Math.floor(new Date().getTime() / 1000);
    }
}
