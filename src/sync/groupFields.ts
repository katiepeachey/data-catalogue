import { RawCatalogField } from './fetchCatalogFields';
import { getBaseName, isSecondaryField } from './transform';

export interface GroupedCatalogField {
  primary: RawCatalogField;
  secondaryFields: string[];   // Additional output field names from related fields
  allCatalogFieldIds: number[];
}

/**
 * Group related catalog fields into single datapoints.
 * e.g., enterprise_pricing + enterprise_pricing_reasoning + enterprise_pricing_confidence
 * → one datapoint with multiple output fields.
 */
export function groupRelatedFields(fields: RawCatalogField[]): GroupedCatalogField[] {
  // Build a map of base_name → fields
  const baseMap = new Map<string, RawCatalogField[]>();

  for (const field of fields) {
    const base = getBaseName(field.catalog_field_name);
    const existing = baseMap.get(base) || [];
    existing.push(field);
    baseMap.set(base, existing);
  }

  const grouped: GroupedCatalogField[] = [];

  for (const [, relatedFields] of baseMap) {
    // Find the primary field (the one without a secondary suffix)
    // If all are secondary, pick the first one
    let primary = relatedFields.find((f) => !isSecondaryField(f.catalog_field_name));
    if (!primary) {
      primary = relatedFields[0];
    }

    // Merge output fields from all related fields
    const allOutputFields = new Set<string>();
    const allCatalogFieldIds: number[] = [];
    const allAgents = new Set<string>();
    const allClassifiers = new Set<string>();

    for (const f of relatedFields) {
      allCatalogFieldIds.push(f.catalog_field_id);
      for (const of of ensureArray(f.output_fields)) allOutputFields.add(of);
      for (const a of ensureArray(f.producing_agents)) allAgents.add(a);
      for (const c of ensureArray(f.classifiers)) allClassifiers.add(c);
    }

    // Build the secondary fields list (output field names from non-primary fields)
    const secondaryFields = relatedFields
      .filter((f) => f !== primary)
      .map((f) => f.catalog_field_name);

    // Merge agents and classifiers into the primary
    const mergedPrimary: RawCatalogField = {
      ...primary,
      output_fields: Array.from(allOutputFields),
      producing_agents: Array.from(allAgents),
      classifiers: Array.from(allClassifiers),
      client_count: Math.max(...relatedFields.map((f) => Number(f.client_count) || 0)),
    };

    grouped.push({
      primary: mergedPrimary,
      secondaryFields,
      allCatalogFieldIds,
    });
  }

  return grouped;
}

function ensureArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.filter(Boolean).map(String);
  return [];
}
