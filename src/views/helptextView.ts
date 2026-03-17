import { layout, escapeHtml } from './layout';
import { HelptextMap } from '../db/columnHelptext';

const COLUMNS: { key: string; label: string }[] = [
  { key: 'labels',        label: 'Labels' },
  { key: 'datapoint',     label: 'Datapoint' },
  { key: 'description',   label: 'Description' },
  { key: 'output_fields', label: 'Output Fields' },
  { key: 'example_values', label: 'Example / Possible Values' },
  { key: 'source',        label: 'Source' },
];

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'cat_entity_data',       label: 'Entity Data' },
  { key: 'cat_firmographics',     label: 'Firmographics' },
  { key: 'cat_technographics',    label: 'Technographics' },
  { key: 'cat_people_metrics',    label: 'People Metrics' },
  { key: 'cat_hiring_signals',    label: 'Hiring Signals' },
  { key: 'cat_custom_enrichment', label: 'Custom Enrichment' },
];

function renderFields(items: { key: string; label: string }[], helptext: HelptextMap): string {
  return items.map((col) => `
    <div class="form-group">
      <label class="form-label" for="ht_${col.key}">${escapeHtml(col.label)}</label>
      <textarea class="form-textarea" id="ht_${col.key}" name="${col.key}" rows="2"
        placeholder="Enter helptext for '${escapeHtml(col.label)}'..."
      >${escapeHtml(helptext[col.key] || '')}</textarea>
    </div>
  `).join('\n');
}

export function helptextView(helptext: HelptextMap, flashMsg?: string): string {
  const flash = flashMsg
    ? `<div class="flash-msg">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        ${escapeHtml(decodeURIComponent(flashMsg))}
      </div>`
    : '';

  const allKeys = [...COLUMNS.map(c => c.key), ...CATEGORIES.map(c => c.key)];

  const body = `
    ${flash}

    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
      <div>
        <h1 class="page-title">Helptext</h1>
        <p style="font-size:13px;color:#aaa;margin-top:4px;">
          Set tooltip text shown when hovering column and category headers in the public catalogue.
        </p>
      </div>
      <a href="/admin/queue" class="btn btn-outline btn-sm">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back to Queue
      </a>
    </div>

    <form method="POST" action="/admin/helptext">
      ${allKeys.map(k => `<input type="hidden" name="_keys" value="${k}" />`).join('')}

      <div class="card" style="padding:24px;max-width:700px;margin-bottom:20px;">
        <div style="font-size:12px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:16px;">Column Headers</div>
        ${renderFields(COLUMNS, helptext)}
      </div>

      <div class="card" style="padding:24px;max-width:700px;margin-bottom:20px;">
        <div style="font-size:12px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:16px;">Category Headers</div>
        ${renderFields(CATEGORIES, helptext)}
      </div>

      <div style="max-width:700px;display:flex;justify-content:flex-end;">
        <button type="submit" class="btn btn-primary">Save Helptext</button>
      </div>
    </form>
  `;

  return layout('Helptext', body);
}
