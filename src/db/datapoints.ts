import { getLocalDb } from './local';
import { Submission, SubmissionStatus } from '../types';

interface DatapointRow {
  id: string;
  catalog_field_id: number | null;
  name: string;
  category: string;
  description: string;
  output_fields: string;
  example_value: string;
  example_evidence: string;
  example_url: string;
  source: string;
  labels: string;
  updated_date: string;
  status: string;
  rejection_reason: string | null;
  submitted_at: string;
  producing_agents: string;
  classifier_info: string;
  agent_types: string;
  rd_classification: string | null;
  data_type: string | null;
  entity_type: string | null;
  client_count: number;
  agent_statuses: string;
  classifier_options_sample: string | null;
  visible: number;
  admin_edited: number;
  admin_edited_at: string | null;
  auto_name: string;
  auto_description: string;
  auto_category: string;
  auto_labels: string;
  auto_output_fields: string;
}

export interface SubmissionWithMeta extends Submission {
  adminEdited: boolean;
  visible: boolean;
  autoName: string;
  autoDescription: string;
  autoCategory: string;
  producingAgents: string[];
  classifierInfo: string[];
  rdClassification: string | null;
  dataType: string | null;
  entityType: string | null;
  clientCount: number;
}

function rowToSubmission(row: DatapointRow): Submission {
  return {
    id: row.id,
    name: row.name,
    category: row.category as Submission['category'],
    description: row.description,
    outputFields: JSON.parse(row.output_fields || '[]'),
    exampleValue: row.example_value || '',
    exampleEvidence: row.example_evidence || '',
    exampleUrl: row.example_url || '',
    source: (row.source || 'kernel') as Submission['source'],
    labels: JSON.parse(row.labels || '[]'),
    updatedDate: row.updated_date || '',
    status: row.status as SubmissionStatus,
    submittedAt: row.submitted_at || new Date().toISOString(),
    rejectionReason: row.rejection_reason || undefined,
    visible: row.visible === 1,
  };
}

function rowToSubmissionWithMeta(row: DatapointRow): SubmissionWithMeta {
  return {
    ...rowToSubmission(row),
    adminEdited: row.admin_edited === 1,
    visible: row.visible === 1,
    autoName: row.auto_name || '',
    autoDescription: row.auto_description || '',
    autoCategory: row.auto_category || '',
    producingAgents: JSON.parse(row.producing_agents || '[]'),
    classifierInfo: JSON.parse(row.classifier_info || '[]'),
    rdClassification: row.rd_classification,
    dataType: row.data_type,
    entityType: row.entity_type,
    clientCount: row.client_count || 0,
  };
}

export interface ListFilters {
  status?: SubmissionStatus;
  category?: string;
  search?: string;
  page?: number;
  perPage?: number;
  visible?: boolean;
}

export function listDatapoints(filters: ListFilters = {}): { items: Submission[]; total: number } {
  const db = getLocalDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  if (filters.category) {
    conditions.push('category = ?');
    params.push(filters.category);
  }
  if (filters.search) {
    conditions.push('(name LIKE ? OR description LIKE ? OR auto_name LIKE ?)');
    params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
  }
  if (filters.visible !== undefined) {
    conditions.push('visible = ?');
    params.push(filters.visible ? 1 : 0);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM datapoints ${where}`).get(...params) as { total: number };
  const total = countRow.total;

  const perPage = filters.perPage || 25;
  const page = filters.page || 1;
  const offset = (page - 1) * perPage;

  const rows = db.prepare(
    `SELECT * FROM datapoints ${where} ORDER BY name ASC LIMIT ? OFFSET ?`
  ).all(...params, perPage, offset) as DatapointRow[];

  return {
    items: rows.map(rowToSubmission),
    total,
  };
}

export function getDatapoint(id: string): Submission | undefined {
  const db = getLocalDb();
  const row = db.prepare('SELECT * FROM datapoints WHERE id = ?').get(id) as DatapointRow | undefined;
  return row ? rowToSubmission(row) : undefined;
}

export function getDatapointWithMeta(id: string): SubmissionWithMeta | undefined {
  const db = getLocalDb();
  const row = db.prepare('SELECT * FROM datapoints WHERE id = ?').get(id) as DatapointRow | undefined;
  return row ? rowToSubmissionWithMeta(row) : undefined;
}

export function updateDatapoint(id: string, updates: Partial<Submission>): Submission | undefined {
  const db = getLocalDb();
  const existing = db.prepare('SELECT * FROM datapoints WHERE id = ?').get(id) as DatapointRow | undefined;
  if (!existing) return undefined;

  const sets: string[] = [];
  const params: unknown[] = [];

  if (updates.name !== undefined) { sets.push('name = ?'); params.push(updates.name); }
  if (updates.category !== undefined) { sets.push('category = ?'); params.push(updates.category); }
  if (updates.description !== undefined) { sets.push('description = ?'); params.push(updates.description); }
  if (updates.outputFields !== undefined) { sets.push('output_fields = ?'); params.push(JSON.stringify(updates.outputFields)); }
  if (updates.exampleValue !== undefined) { sets.push('example_value = ?'); params.push(updates.exampleValue); }
  if (updates.exampleEvidence !== undefined) { sets.push('example_evidence = ?'); params.push(updates.exampleEvidence); }
  if (updates.exampleUrl !== undefined) { sets.push('example_url = ?'); params.push(updates.exampleUrl); }
  if (updates.source !== undefined) { sets.push('source = ?'); params.push(updates.source); }
  if (updates.labels !== undefined) { sets.push('labels = ?'); params.push(JSON.stringify(updates.labels)); }
  if (updates.updatedDate !== undefined) { sets.push('updated_date = ?'); params.push(updates.updatedDate); }
  if (updates.status !== undefined) { sets.push('status = ?'); params.push(updates.status); }
  if (updates.rejectionReason !== undefined) { sets.push('rejection_reason = ?'); params.push(updates.rejectionReason); }

  if (sets.length === 0) return getDatapoint(id);

  // Mark as admin-edited whenever an admin saves changes
  sets.push('admin_edited = 1');
  sets.push("admin_edited_at = datetime('now')");

  params.push(id);
  db.prepare(`UPDATE datapoints SET ${sets.join(', ')} WHERE id = ?`).run(...params);

  return getDatapoint(id);
}

export function getStats(): { pending: number; approved: number; rejected: number; total: number } {
  const db = getLocalDb();
  const rows = db.prepare(
    `SELECT status, COUNT(*) as cnt FROM datapoints GROUP BY status`
  ).all() as { status: string; cnt: number }[];

  const stats = { pending: 0, approved: 0, rejected: 0, total: 0 };
  for (const row of rows) {
    if (row.status === 'pending') stats.pending = row.cnt;
    else if (row.status === 'approved') stats.approved = row.cnt;
    else if (row.status === 'rejected') stats.rejected = row.cnt;
    stats.total += row.cnt;
  }
  return stats;
}

export function getAllSubmissions(): Submission[] {
  const db = getLocalDb();
  const rows = db.prepare('SELECT * FROM datapoints ORDER BY name ASC').all() as DatapointRow[];
  return rows.map(rowToSubmission);
}

export function getAllSubmissionsWithMeta(): SubmissionWithMeta[] {
  const db = getLocalDb();
  const rows = db.prepare('SELECT * FROM datapoints ORDER BY name ASC').all() as DatapointRow[];
  return rows.map(rowToSubmissionWithMeta);
}

export function toggleVisibility(id: string, visible: boolean): boolean {
  const db = getLocalDb();
  const result = db.prepare('UPDATE datapoints SET visible = ? WHERE id = ?').run(visible ? 1 : 0, id);
  return result.changes > 0;
}
