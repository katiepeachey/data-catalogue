import { CleaningField } from '../db/cleaningFields';
import { layout, escapeHtml } from './layout';
import { SF_FIELD_TYPES } from '../types';

const CATEGORIES = ['required', 'recommended', 'optional'] as const;
const FIELD_TYPES = [...SF_FIELD_TYPES];
const CATEGORY_LABELS: Record<string, string> = { required: 'Required', recommended: 'Recommended', optional: 'Optional' };

function row(f: CleaningField, i: number): string {
  const typeOpts = FIELD_TYPES.map((t) =>
    `<option value="${t}"${t === f.fieldType ? ' selected' : ''}>${t}</option>`
  ).join('');
  const catOpts = CATEGORIES.map((c) =>
    `<option value="${c}"${c === f.category ? ' selected' : ''}>${CATEGORY_LABELS[c]}</option>`
  ).join('');

  return `
  <tr id="row-${escapeHtml(f.fieldId)}" data-field-id="${escapeHtml(f.fieldId)}">
    <td><span class="field-tag" style="font-size:11px;">${escapeHtml(f.fieldId)}</span></td>
    <td><input class="form-input" type="text" name="label" value="${escapeHtml(f.label)}" style="padding:5px 8px;font-size:13px;" /></td>
    <td><input class="form-input" type="text" name="fieldName" value="${escapeHtml(f.fieldName)}" style="padding:5px 8px;font-size:13px;" /></td>
    <td><select class="form-select" name="fieldType" style="padding:5px 8px;font-size:13px;">${typeOpts}</select></td>
    <td>
      <select class="form-select" name="fieldLength" style="padding:5px 8px;font-size:13px;width:90px;">
        <option value="">—</option>
        ${[18,40,80,100,255,500,1000,4096,5000,32768].map((v) =>
          `<option value="${v}"${f.fieldLength === v ? ' selected' : ''}>${v}</option>`
        ).join('')}
      </select>
    </td>
    <td><select class="form-select" name="category" style="padding:5px 8px;font-size:13px;">${catOpts}</select></td>
    <td><input class="form-input" type="number" name="displayOrder" value="${f.displayOrder}" style="padding:5px 8px;font-size:13px;width:60px;" /></td>
    <td style="max-width:220px;"><input class="form-input" type="text" name="helpText" value="${escapeHtml(f.helpText)}" style="padding:5px 8px;font-size:13px;" /></td>
    <td>
      <button type="button" class="btn btn-primary btn-sm" onclick="saveField('${escapeHtml(f.fieldId)}')">Save</button>
      <button type="button" class="btn btn-danger btn-sm" onclick="deleteField('${escapeHtml(f.fieldId)}', '${escapeHtml(f.label)}')" style="margin-left:4px;">Delete</button>
    </td>
  </tr>`;
}

export function cleaningFieldsView(fields: CleaningField[], flash?: string): string {
  const byCategory = CATEGORIES.map((cat) => {
    const catFields = fields.filter((f) => f.category === cat);
    if (catFields.length === 0) return '';
    return `
    <tr class="cat-header">
      <td colspan="9" style="padding:10px 14px 6px;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#6b7280;background:#f9fafb;border-bottom:1px solid #eaebee;">
        ${CATEGORY_LABELS[cat]} (${catFields.length})
      </td>
    </tr>
    ${catFields.map((f, i) => row(f, i)).join('')}`;
  }).join('');

  const flashHtml = flash
    ? `<div class="flash-msg"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>${escapeHtml(decodeURIComponent(flash))}</div>`
    : '';

  const body = `
<style>
  .cf-table { width:100%; border-collapse:collapse; }
  .cf-table th { font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#6b7280;padding:8px 12px;text-align:left;background:#f9fafb;border-bottom:1px solid #eaebee;white-space:nowrap; }
  .cf-table td { padding:6px 12px;border-bottom:1px solid #f0f1f3;vertical-align:middle; }
  .cf-table tbody tr:hover { background:#fafbfa; }
  .add-row td { padding:12px;background:#f9fafb;border-top:2px solid #eaebee; }
</style>

<div class="page-header">
  <h1 class="page-title">Cleaning Fields</h1>
  <a href="/admin/field-builder" class="btn btn-outline btn-sm">← Field Builder</a>
</div>

${flashHtml}

<div class="card" style="margin-bottom:16px;padding:16px 20px;">
  <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
    <div>
      <div style="font-size:13px;font-weight:600;color:#1a1a1a;margin-bottom:2px;">Import from CSV</div>
      <div style="font-size:12px;color:#9ca3af;">Headers: <code>Label, Field Name, Type, Length, Help Text, Category</code></div>
    </div>
    <input type="file" id="csvFileInput" accept=".csv" style="font-size:13px;" />
    <button type="button" class="btn btn-outline btn-sm" onclick="previewCsv()">Preview</button>
  </div>
  <div id="csvPreviewWrap" style="display:none;margin-top:14px;">
    <div id="csvPreviewTable" style="overflow:auto;max-height:280px;margin-bottom:10px;"></div>
    <div style="display:flex;align-items:center;gap:10px;">
      <button class="btn btn-primary btn-sm" onclick="importCsv()">Import rows</button>
      <span id="csvStatus" style="font-size:13px;color:#6b7280;"></span>
    </div>
  </div>
</div>
<div class="card" style="overflow:auto;">
  <table class="cf-table">
    <thead>
      <tr>
        <th>Field ID</th>
        <th>Label</th>
        <th>Field Name</th>
        <th>Type</th>
        <th>Length</th>
        <th>Category</th>
        <th>Order</th>
        <th>Help Text</th>
        <th></th>
      </tr>
    </thead>
    <tbody id="fieldTable">
      ${byCategory}
      <tr class="add-row">
        <td colspan="9">
          <details>
            <summary style="cursor:pointer;font-size:13px;font-weight:600;color:#343539;">+ Add field</summary>
            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;align-items:flex-end;">
              <div><label class="field-card-label">Field ID</label><input class="form-input" id="new_fieldId" placeholder="kernel_field_name" style="width:180px;" /></div>
              <div><label class="field-card-label">Label</label><input class="form-input" id="new_label" placeholder="Kernel - Field name" style="width:200px;" /></div>
              <div><label class="field-card-label">Field Name</label><input class="form-input" id="new_fieldName" placeholder="kernel_field_name" style="width:180px;" /></div>
              <div><label class="field-card-label">Type</label>
                <select class="form-select" id="new_fieldType" style="width:140px;">
                  ${FIELD_TYPES.map((t) => `<option>${t}</option>`).join('')}
                </select>
              </div>
              <div><label class="field-card-label">Length</label>
                <select class="form-select" id="new_fieldLength" style="width:90px;">
                  <option value="">—</option>
                  ${[18,40,80,100,255,500,1000,4096,5000,32768].map((v) => `<option value="${v}">${v}</option>`).join('')}
                </select>
              </div>
              <div><label class="field-card-label">Category</label>
                <select class="form-select" id="new_category" style="width:130px;">
                  ${CATEGORIES.map((c) => `<option value="${c}">${CATEGORY_LABELS[c]}</option>`).join('')}
                </select>
              </div>
              <div><label class="field-card-label">Order</label><input class="form-input" id="new_displayOrder" type="number" value="${fields.length + 1}" style="width:60px;" /></div>
              <div style="flex:1;min-width:180px;"><label class="field-card-label">Help Text</label><input class="form-input" id="new_helpText" placeholder="Description…" /></div>
              <button type="button" class="btn btn-primary btn-sm" onclick="addField()">Add</button>
            </div>
          </details>
        </td>
      </tr>
    </tbody>
  </table>
</div>

<p style="margin-top:12px;font-size:12px;color:#9ca3af;">Changes apply to both Salesforce and Dynamics. The Field Builder will reflect changes immediately.</p>

<script>
function getRowData(fieldId) {
  var row = document.getElementById('row-' + fieldId);
  return {
    label:        row.querySelector('[name=label]').value,
    fieldName:    row.querySelector('[name=fieldName]').value,
    fieldType:    row.querySelector('[name=fieldType]').value,
    fieldLength:  row.querySelector('[name=fieldLength]').value || null,
    category:     row.querySelector('[name=category]').value,
    displayOrder: parseInt(row.querySelector('[name=displayOrder]').value) || 0,
    helpText:     row.querySelector('[name=helpText]').value,
  };
}

function saveField(fieldId) {
  fetch('/admin/cleaning-fields/' + encodeURIComponent(fieldId) + '/edit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(getRowData(fieldId)),
  }).then(function(r) { return r.json(); }).then(function(d) {
    if (d.ok) showToast('Saved');
    else alert('Error: ' + (d.error || 'unknown'));
  });
}

function deleteField(fieldId, label) {
  if (!confirm('Delete "' + label + '" from all CRM types?')) return;
  fetch('/admin/cleaning-fields/' + encodeURIComponent(fieldId) + '/delete', {
    method: 'POST',
  }).then(function(r) { return r.json(); }).then(function(d) {
    if (d.ok) { document.getElementById('row-' + fieldId).remove(); showToast('Deleted'); }
    else alert('Error: ' + (d.error || 'unknown'));
  });
}

function addField() {
  var body = {
    fieldId:      document.getElementById('new_fieldId').value.trim(),
    label:        document.getElementById('new_label').value.trim(),
    fieldName:    document.getElementById('new_fieldName').value.trim(),
    fieldType:    document.getElementById('new_fieldType').value,
    fieldLength:  document.getElementById('new_fieldLength').value || null,
    category:     document.getElementById('new_category').value,
    displayOrder: parseInt(document.getElementById('new_displayOrder').value) || 99,
    helpText:     document.getElementById('new_helpText').value.trim(),
  };
  if (!body.fieldId || !body.label || !body.fieldName) { alert('Field ID, Label and Field Name are required'); return; }
  fetch('/admin/cleaning-fields/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(function(r) { return r.json(); }).then(function(d) {
    if (d.ok) location.reload();
    else alert('Error: ' + (d.error || 'unknown'));
  });
}

var parsedCsvRows = [];

function parseCsv(text) {
  var lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  var headers = lines[0].split(',').map(function(h) { return h.trim().replace(/^"|"$/g, ''); });
  var colLabel    = headers.findIndex(function(h) { return /label/i.test(h); });
  var colName     = headers.findIndex(function(h) { return /field.?name/i.test(h); });
  var colType     = headers.findIndex(function(h) { return /type/i.test(h); });
  var colLength   = headers.findIndex(function(h) { return /length/i.test(h); });
  var colHelp     = headers.findIndex(function(h) { return /help/i.test(h); });
  var colCategory = headers.findIndex(function(h) { return /category/i.test(h); });
  return lines.slice(1).map(function(line) {
    var cols = line.split(',').map(function(c) { return c.trim().replace(/^"|"$/g, ''); });
    return {
      label:     colLabel    >= 0 ? cols[colLabel]    : '',
      fieldName: colName     >= 0 ? cols[colName]     : '',
      fieldType: colType     >= 0 ? cols[colType]     : 'Text',
      fieldLength: colLength >= 0 ? cols[colLength]   : '',
      helpText:  colHelp     >= 0 ? cols[colHelp]     : '',
      category:  colCategory >= 0 ? cols[colCategory] : 'optional',
    };
  }).filter(function(r) { return r.label || r.fieldName; });
}

function previewCsv() {
  try {
  var inputEl = document.getElementById('csvFileInput');
  var file = inputEl && inputEl.files && inputEl.files[0];
  if (!file) { alert('Please select a CSV file first.'); return; }
  var reader = new FileReader();
  reader.onerror = function() { alert('Error reading file.'); };
  reader.onload = function(e) {
    try {
    var text = e.target ? String(e.target.result || '') : '';
    parsedCsvRows = parseCsv(text);
    if (parsedCsvRows.length === 0) { alert('No valid rows found. Check your CSV headers.'); return; }
    var html = '<table style="border-collapse:collapse;font-size:12px;min-width:600px;">';
    html += '<thead><tr style="background:#f9fafb;">';
    ['Label','Field Name','Type','Length','Help Text','Category'].forEach(function(h) {
      html += '<th style="padding:6px 10px;border:1px solid #eaebee;text-align:left;font-weight:600;">' + h + '</th>';
    });
    html += '</tr></thead><tbody>';
    parsedCsvRows.forEach(function(r) {
      html += '<tr>';
      [r.label, r.fieldName, r.fieldType, r.fieldLength, r.helpText, r.category].forEach(function(v) {
        html += '<td style="padding:5px 10px;border:1px solid #eaebee;">' + (v || '') + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    document.getElementById('csvPreviewTable').innerHTML = html;
    document.getElementById('csvStatus').textContent = parsedCsvRows.length + ' rows ready to import';
    document.getElementById('csvPreviewWrap').style.display = '';
    } catch(err) { alert('Parse error: ' + err.message); }
  };
  reader.readAsText(file);
  } catch(err) { alert('Error: ' + err.message); }
}

function importCsv() {
  if (!parsedCsvRows.length) return;
  document.getElementById('csvStatus').textContent = 'Importing…';
  fetch('/admin/cleaning-fields/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parsedCsvRows),
  }).then(function(r) { return r.json(); }).then(function(d) {
    if (d.ok) {
      showToast('Imported ' + d.imported + ' fields' + (d.skipped ? ', skipped ' + d.skipped : ''));
      setTimeout(function() { location.reload(); }, 1000);
    } else {
      alert('Error: ' + (d.error || 'unknown'));
      document.getElementById('csvStatus').textContent = '';
    }
  });
}

function showToast(msg) {
  var t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#343539;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;z-index:9999;';
  document.body.appendChild(t);
  setTimeout(function() { t.remove(); }, 2000);
}
</script>
`;

  return layout('Cleaning Fields', body);
}
