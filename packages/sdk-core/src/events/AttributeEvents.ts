import { ReportData } from '../model/report/ReportData';

export type AttributeEvents = {
    'scoped-attributes-updated'(attributes: ReportData): void;
};
