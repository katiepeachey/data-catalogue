export type Source = 'kernel' | 'linkedin' | 'both';
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
  classifierOptionsSample?: string | null;
  dataType?: string | null;
}

export interface Submission extends Datapoint {
  status: SubmissionStatus;
  submittedAt: string;
  rejectionReason?: string;
  visible?: boolean;
}

/** Standard Salesforce field types */
export const SF_FIELD_TYPES = [
  'Text',
  'Text (Long)',
  'Text Area (Long)',
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
  'Lookup',
] as const;

export type SfFieldType = typeof SF_FIELD_TYPES[number];

/** Standard Dynamics 365 field types */
export const DYNAMICS_FIELD_TYPES = [
  'Single Line of Text',
  'Multiple Lines of Text',
  'Whole Number',
  'Decimal Number',
  'Currency',
  'Date Only',
  'Date and Time',
  'Two Options',
  'Choice',
  'Choices',
  'URL',
  'Email',
  'Phone',
  'Lookup',
] as const;

export type DynamicsFieldType = typeof DYNAMICS_FIELD_TYPES[number] | string;

/** Map a Salesforce field type to its Dynamics 365 equivalent */
export const SF_TO_DYNAMICS: Record<string, string> = {
  'Text':                  'Single Line of Text',
  'Text (Long)':           'Multiple Lines of Text',
  'Text Area (Long)':      'Multiple Lines of Text',
  'Long Text Area':        'Multiple Lines of Text',
  'Number':                'Whole Number',
  'Currency':              'Currency',
  'Percent':               'Decimal Number',
  'Date':                  'Date Only',
  'DateTime':              'Date and Time',
  'Checkbox':              'Two Options',
  'Picklist':              'Choice',
  'Multi-Select Picklist': 'Choices',
  'URL':                   'URL',
  'Email':                 'Email',
  'Phone':                 'Phone',
  'Lookup':                'Lookup',
};

export interface DatapointField {
  id: number;
  datapointId: string;
  fieldName: string;
  displayName: string;
  sfFieldType: SfFieldType;
  dynamicsFieldType: string;
  fieldLength: number | null;
  helpText: string;
  visible: boolean;
  sortOrder: number;
  adminEdited: boolean;
  exampleValue?: string | null;
}
