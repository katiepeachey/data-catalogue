import { RawCatalogField } from './fetchCatalogFields';

export interface GroupedCatalogField {
  primary: RawCatalogField;
  secondaryFields: string[];
  allCatalogFieldIds: number[];
}

/**
 * Pass-through — grouping is now done in the SQL query (by top-level agent).
 * Each RawCatalogField already represents one agent with all its catalog fields.
 */
export function groupRelatedFields(fields: RawCatalogField[]): GroupedCatalogField[] {
  return fields.map((field) => ({
    primary: field,
    secondaryFields: [],
    allCatalogFieldIds: [],
  }));
}
