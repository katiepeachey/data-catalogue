import { Category, Label, Source, SfFieldType } from '../types';
import { RawCatalogField } from './fetchCatalogFields';

/** Convert snake_case field name to human-readable title */
export function humanizeName(fieldName: string): string {
  const stripped = fieldName
    .replace(/_reasoning$/i, '')
    .replace(/_confidence$/i, '')
    .replace(/_boolean$/i, '')
    .replace(/_sources$/i, '')
    .replace(/_list$/i, '')
    .replace(/_array$/i, '');

  return stripped
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
    .replace(/\b(B2b|B2c|Erp|Crm|Tms|Hr|Ai|Api|Url|Naics|Sic|Ipo|Ceo|Cfo|Cto|Psp|Xdr|Esg|Krnl)\b/gi,
      (m) => m.toUpperCase()
    );
}

/** Map catalog field → Category (checks all catalog field names) */
export function mapCategory(field: RawCatalogField): Category {
  const fieldNames = ensureArray(field.catalog_field_names);
  const entityType = (field.entity_type || '').toLowerCase();

  for (const fieldName of fieldNames) {
    const name = fieldName.toLowerCase();
    if (/tech|erp|crm|tool|stack|software|saas|platform/.test(name)) return 'Technographics';
    if (/headcount|employee|workforce|staff|team_size|people_count/.test(name)) return 'People Metrics';
    if (/hiring|job|recruit|talent|vacancy|open_role/.test(name)) return 'Hiring Signals';
    if (/legal_name|founded|domain|url|website|company_name|headquarters/.test(name)) return 'Entity Data';
    if (entityType === 'account' && /location|office|country|address|hq/.test(name)) return 'Entity Data';
    if (/revenue|funding|valuation|pricing|financial|ipo|investor|market_cap|arr|mrr/.test(name)) return 'Firmographics';
    if (/vertical|industry|naics|sic|sector|business_model|b2b|b2c/.test(name)) return 'Firmographics';
    if (/subsidiary|parent|family|hierarchy|acquisition|merger/.test(name)) return 'Firmographics';
  }

  if (entityType === 'account') return 'Entity Data';
  return 'Custom Enrichment';
}

/** Map catalog field → Labels (checks all catalog field names) */
export function mapLabels(field: RawCatalogField): Label[] {
  const fieldNames = ensureArray(field.catalog_field_names);
  const labels: Set<Label> = new Set();

  for (const fieldName of fieldNames) {
    const name = fieldName.toLowerCase();

    if (/revenue|funding|pricing|valuation|ipo|investor|financial|market_cap|arr|mrr|cost/.test(name))
      labels.add('financial-profile');
    if (/tech|erp|crm|tool|stack|software|platform|saas/.test(name))
      labels.add('technology-infrastructure');
    if (/location|office|country|address|hq|city|region|presence|international/.test(name))
      labels.add('location-geography');
    if (/headcount|employee|workforce|staff|people|team_size|benefits/.test(name))
      labels.add('workforce-people');
    if (/hiring|job|recruit|talent|vacancy|open_role/.test(name))
      labels.add('hiring-talent');
    if (/vertical|industry|naics|sic|sector|market/.test(name))
      labels.add('industry-market');
    if (/legal_name|founded|domain|url|website|company_name|brand|identity/.test(name))
      labels.add('company-identity');
    if (/subsidiary|parent|family|hierarchy|acquisition|merger/.test(name))
      labels.add('corporate-structure');
    if (/ecommerce|retail|shop|store|wholesale/.test(name))
      labels.add('ecommerce-retail');
    if (/compliance|risk|regulation|gdpr|kyc|aml/.test(name))
      labels.add('compliance-risk');
    if (/support|pylon|ticket|helpdesk|customer_service/.test(name))
      labels.add('customer-support');
    if (/business_model|b2b|b2c|sales|marketing|outbound|inbound|lead|icp/.test(name))
      labels.add('sales-marketing');
    if (/operation|logistics|supply_chain|delivery/.test(name))
      labels.add('operations');
  }

  if (labels.size === 0) labels.add('company-identity');
  return Array.from(labels);
}

/** Map MotherDuck catalog_field_data_type to Salesforce field type */
export function mapSfFieldType(dataType: string | null): SfFieldType {
  switch (dataType?.toLowerCase()) {
    case 'number': return 'Number';
    case 'boolean': return 'Checkbox';
    case 'string_array': return 'Multi-Select Picklist';
    case 'date': return 'Date';
    case 'string':
    default:
      return 'Text';
  }
}

/** Extract example value from classifier options JSON if available */
export function generateExampleValue(field: RawCatalogField): string {
  if (!field.sample_options) return '';
  try {
    const parsed = JSON.parse(field.sample_options);
    const options = parsed.options;
    if (Array.isArray(options) && options.length > 0) {
      return options
        .slice(0, 3)
        .map((o: { name?: string }) => o.name || '')
        .filter(Boolean)
        .join(' · ');
    }
  } catch {
    // ignore parse errors
  }
  return '';
}

/** Suffix patterns that indicate a secondary output field */
const SECONDARY_SUFFIXES = [
  '_reasoning', '_confidence', '_boolean', '_sources', '_list',
  '_array', '_score', '_count', '_description', '_evidence',
];

export function isSecondaryField(fieldName: string): boolean {
  return SECONDARY_SUFFIXES.some((s) => fieldName.toLowerCase().endsWith(s));
}

export function getBaseName(fieldName: string): string {
  let base = fieldName.toLowerCase();
  for (const suffix of SECONDARY_SUFFIXES) {
    if (base.endsWith(suffix)) {
      return base.slice(0, -suffix.length);
    }
  }
  return base;
}

export interface TransformedDatapoint {
  id: string;
  catalogFieldId: number;
  name: string;
  category: Category;
  description: string;
  outputFields: string[];      // raw catalog field names (e.g. "krnl_funding")
  exampleValue: string;
  exampleEvidence: string;
  exampleUrl: string;
  source: Source;
  labels: Label[];
  updatedDate: string;
  producingAgents: string[];
  classifierInfo: string[];
  agentTypes: string[];
  rdClassification: string | null;
  dataType: string | null;
  entityType: string | null;
  clientCount: number;
  agentStatuses: string[];
  classifierOptionsSample: string | null;
}

export function transformToDatapoint(field: RawCatalogField): TransformedDatapoint {
  const now = new Date();
  const updatedDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const category = mapCategory(field);

  // People Metrics and Hiring Signals come from both LinkedIn and Kernel AI
  const source: Source =
    category === 'People Metrics' || category === 'Hiring Signals' ? 'both' : 'kernel';

  const agentName = sanitizeAgentName(field.agent_name);

  return {
    id: `agent_${field.agent_id}`,
    catalogFieldId: field.agent_id,
    name: agentName,
    category,
    description: field.description || `Data enrichment: ${agentName}`,
    outputFields: ensureArray(field.catalog_field_names),
    exampleValue: generateExampleValue(field),
    exampleEvidence: '',
    exampleUrl: '',
    source,
    labels: mapLabels(field),
    updatedDate,
    producingAgents: [agentName],
    classifierInfo: ensureArray(field.classifiers),
    agentTypes: ensureArray(field.agent_types),
    rdClassification: ensureArray(field.rd_classifications)[0] || null,
    dataType: field.data_type || null,
    entityType: field.entity_type || null,
    clientCount: Number(field.client_count) || 0,
    agentStatuses: ensureArray(field.statuses),
    classifierOptionsSample: field.sample_options || null,
  };
}

/** DuckDB arrays may come as actual arrays or strings — normalise */
function ensureArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.filter(Boolean).map(String);
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch { /* ignore */ }
  }
  return [];
}

/** Remove internal prefixes from agent names for public display */
function sanitizeAgentName(name: string): string {
  return name
    .replace(/^\[Impl\.\]\s*/i, '')
    .replace(/^\[Custom\]\s*/i, '')
    .replace(/^\[One-off\]\s*/i, '')
    .replace(/^\[Archive\]\s*/i, '')
    .replace(/^\d+\.\s*/, '')
    .trim();
}
