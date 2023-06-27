export interface MetricsQueue<T> {
    total: number;
    submissionUrl: string;
    maximumEvents: number;
    add(event: T): void;
    send(): Promise<void>;
}
