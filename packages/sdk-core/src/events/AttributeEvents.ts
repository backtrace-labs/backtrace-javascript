import { ReportData } from '../model/report/ReportData.js';

export type AttributeEvents = {
    'scoped-attributes-updated': [attributes: ReportData];
};
