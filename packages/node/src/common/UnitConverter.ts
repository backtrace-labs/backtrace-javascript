export class UnitConverter {
    public static parseKb(str: string): number {
        return parseInt(str, 10) * 1024;
    }
}
