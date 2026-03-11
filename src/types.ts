export type Source = 'kernel' | 'linkedin';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export type Label =
  | 'company-identity' | 'location-geography' | 'corporate-structure'
  | 'financial-profile' | 'technology-infrastructure' | 'sales-marketing'
  | 'workforce-people' | 'hiring-talent' | 'customer-support'
  | 'compliance-risk' | 'ecommerce-retail' | 'operations' | 'industry-market';

export type Category =
  | 'Entity Data' | 'Firmographics' | 'Technographics'
  | 'People Metrics' | 'Hiring Signals' | 'Custom Enrichment';

export interface Datapoint {
  id: string;
  name: string;
  category: Category;
  description: string;
  outputFields: string[];
  exampleValue: string;
  exampleEvidence: string;
  exampleUrl: string;
  source: Source;
  labels: Label[];
  updatedDate: string;
}

export interface Submission extends Datapoint {
  status: SubmissionStatus;
  submittedAt: string;
  rejectionReason?: string;
  visible?: boolean;
}

/** Standard Salesforce field types for mapping */
export const SF_FIELD_TYPES = [
  'Text',
  'Long Text Area',
  'Number',
  'Currency',
  'Percent',
  'Date',
  'DateTime',
  'Checkbox',
  'Picklist',
  'Multi-Select Picklist',
  'URL',
  'Email',
  'Phone',
] as const;

export type SfFieldType = typeof SF_FIELD_TYPES[number];

export interface DatapointField {
  id: number;
  datapointId: string;
  fieldName: string;
  displayName: string;
  sfFieldType: SfFieldType;
  visible: boolean;
  sortOrder: number;
  adminEdited: boolean;
}
