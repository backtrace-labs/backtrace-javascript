import { SubmissionUrlInformation } from '../../model/http/index.js';

export class MetricsUrlInformation {
    public static generateSummedEventsUrl(
        hostname: string,
        submissionUrl: string,
        credentialsToken?: string | null,
    ): string | undefined {
        const submissionInformation = this.findSubmissionInformation(submissionUrl, credentialsToken);
        if (!submissionInformation) {
            return undefined;
        }
        return this.generateEventsServiceUrl(
            hostname,
            'summed-events',
            submissionInformation.universe,
            submissionInformation.token,
        );
    }

    public static generateUniqueEventsUrl(
        hostname: string,
        submissionUrl: string,
        credentialsToken?: string | null,
    ): string | undefined {
        const submissionInformation = this.findSubmissionInformation(submissionUrl, credentialsToken);
        if (!submissionInformation) {
            return undefined;
        }

        return this.generateEventsServiceUrl(
            hostname,
            'unique-events',
            submissionInformation.universe,
            submissionInformation.token,
        );
    }

    private static generateEventsServiceUrl(
        hostname: string,
        eventServiceName: string,
        universe: string,
        token: string,
    ): string {
        return new URL(`/api/${eventServiceName}/submit?universe=${universe}&token=${token}`, hostname).toString();
    }

    private static findSubmissionInformation(
        submissionUrl: string,
        token?: string | null,
    ): { universe: string; token: string } | undefined {
        const universe = SubmissionUrlInformation.findUniverse(submissionUrl);
        if (!universe) {
            return undefined;
        }

        token = token ?? SubmissionUrlInformation.findToken(submissionUrl);

        if (!token) {
            return undefined;
        }
        return { universe, token };
    }
}
