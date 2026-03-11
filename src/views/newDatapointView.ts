import { Category, Label, SF_FIELD_TYPES } from '../types';
import { layout, escapeHtml } from './layout';

const ALL_LABELS: { value: Label; display: string }[] = [
  { value: 'company-identity',          display: 'Company Identity' },
  { value: 'location-geography',        display: 'Location & Geography' },
  { value: 'corporate-structure',       display: 'Corporate Structure' },
  { value: 'financial-profile',         display: 'Financial Profile' },
  { value: 'technology-infrastructure', display: 'Technology & Infrastructure' },
  { value: 'sales-marketing',           display: 'Sales & Marketing' },
  { value: 'workforce-people',          display: 'Workforce & People' },
  { value: 'hiring-talent',             display: 'Hiring & Talent' },
  { value: 'customer-support',          display: 'Customer Support' },
  { value: 'compliance-risk',           display: 'Compliance & Risk' },
  { value: 'ecommerce-retail',          display: 'E-commerce & Retail' },
  { value: 'operations',                display: 'Operations' },
  { value: 'industry-market',           display: 'Industry & Market' },
];

const ALL_CATEGORIES: Category[] = [
  'Entity Data', 'Firmographics', 'Technographics',
  'People Metrics', 'Hiring Signals', 'Custom Enrichment',
];

export function newDatapointView(): string {
  const categoryOptions = ALL_CATEGORIES.map((c) =>
    `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`
  ).join('\n');

  const labelCheckboxes = ALL_LABELS.map((l) =>
    `<label class="label-checkbox">
      <input type="checkbox" name="labels" value="${l.value}" />
      <span class="sub-label lbl-${l.value}">${escapeHtml(l.display)}</span>
    </label>`
  ).join('\n');

  const sfTypeOptions = SF_FIELD_TYPES.map((t) => `<option value="${t}">${t}</option>`).join('');

  const body = `
    <div style="max-width:800px;">
      <div class="page-header">
        <h1 class="page-title">Add Datapoint</h1>
      </div>

      <div class="card" style="padding:0;">
        <div style="padding:20px 24px 16px;border-bottom:1px solid #eaeeea;">
          <h2 style="font-size:15px;font-weight:700;color:#1a1a1a;">New Datapoint</h2>
          <p style="font-size:12px;color:#999;margin-top:4px;">Manually add a datapoint to the catalogue. It will be created with "pending" status.</p>
        </div>

        <form method="POST" action="/admin/new" style="padding:20px 24px 24px;">

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label" for="name">Datapoint Name</label>
              <input class="form-input" type="text" id="name" name="name" required placeholder="e.g. Company Revenue" />
            </div>
            <div class="form-group">
              <label class="form-label" for="category">Category</label>
              <select class="form-select" id="category" name="category">
                ${categoryOptions}
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="description">Description</label>
            <textarea class="form-textarea" id="description" name="description" rows="4"
              placeholder="Describe what this datapoint captures..."></textarea>
          </div>

          <div class="form-group">
            <label class="form-label" for="exampleValue">Example Value</label>
            <input class="form-input" type="text" id="exampleValue" name="exampleValue"
              placeholder="e.g. $10M - $50M ARR" />
          </div>

          <div class="form-group">
            <label class="form-label" for="source">Source</label>
            <select class="form-select" id="source" name="source">
              <option value="kernel">Kernel AI</option>
              <option value="linkedin">LinkedIn</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Labels</label>
            <div class="labels-grid">
              ${labelCheckboxes}
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">
              Output Fields
              <span class="label-hint">Add fields this datapoint will produce</span>
            </label>
            <div class="field-config-table-wrap">
              <table class="field-config-table" id="fieldConfigTable">
                <thead>
                  <tr>
                    <th style="width:30%;">Field Name</th>
                    <th style="width:30%;">Display Name</th>
                    <th style="width:25%;">SF Field Type</th>
                    <th style="width:15%;"></th>
                  </tr>
                </thead>
                <tbody id="fieldTableBody"></tbody>
              </table>
              <button type="button" class="btn btn-outline btn-sm" style="margin:8px 10px;" onclick="addFieldRow()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add Field
              </button>
            </div>
          </div>

          <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:12px;border-top:1px solid #eaeeea;">
            <a href="/admin/queue" class="btn btn-outline">Cancel</a>
            <button type="submit" class="btn btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Create Datapoint
            </button>
          </div>

        </form>
      </div>
    </div>

    <style>
      .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .labels-grid {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 8px; padding: 12px; background: #fafcfa;
        border: 1px solid #e8ece8; border-radius: 8px;
      }
      .label-checkbox {
        display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 4px; border-radius: 6px;
      }
      .label-checkbox:hover { background: #f0f2f0; }
      .label-checkbox input[type="checkbox"] { width: 14px; height: 14px; accent-color: #2d7a4f; cursor: pointer; }
      .label-hint {
        font-size: 11px; color: #aaa; font-weight: 400;
        text-transform: none; letter-spacing: 0; margin-left: 6px;
      }
      .field-config-table-wrap {
        background: #fafcfa; border: 1px solid #e8ece8;
        border-radius: 8px; overflow: hidden;
      }
      .field-config-table { width: 100%; border-collapse: collapse; }
      .field-config-table thead th {
        background: #f0f2f0; color: #888; font-size: 10px; font-weight: 600;
        text-transform: uppercase; letter-spacing: 0.06em;
        padding: 8px 10px; text-align: left; border-bottom: 1px solid #e0e4e0;
      }
      .field-config-table tbody td {
        padding: 6px 10px; border-bottom: 1px solid #f0f2f0; vertical-align: middle;
      }
      @media (max-width: 860px) { .form-grid { grid-template-columns: 1fr; } }
    </style>

    <script>
      var fieldCount = 0;
      function addFieldRow() {
        var tbody = document.getElementById('fieldTableBody');
        var i = fieldCount++;
        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td><input class="form-input" type="text" name="fieldName[]" placeholder="field_name" style="padding:6px 8px;font-size:12px;" /></td>' +
          '<td><input class="form-input" type="text" name="fieldDisplayName[]" placeholder="Display Name" style="padding:6px 8px;font-size:12px;" /></td>' +
          '<td><select class="form-select" name="fieldSfType[]" style="padding:6px 8px;font-size:12px;">${sfTypeOptions}</select></td>' +
          '<td style="text-align:center;"><button type="button" class="btn btn-outline btn-sm" onclick="this.closest(\'tr\').remove()" style="padding:4px 8px;font-size:11px;color:#a03a3a;">Remove</button></td>';
        tbody.appendChild(tr);
      }
      addFieldRow();
    </script>
  `;

  return layout('Add Datapoint', body);
}
