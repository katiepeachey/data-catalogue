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

  // sfTypeOptions rendered server-side — avoids quote-nesting issues in JS
  const sfTypeOptions = SF_FIELD_TYPES.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');

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
            <label class="form-label">Example / Possible Values</label>
            <div class="value-mode-toggle">
              <label class="mode-radio">
                <input type="radio" name="valueMode" value="example" checked onchange="switchValueMode('example')" />
                Free text example
              </label>
              <label class="mode-radio">
                <input type="radio" name="valueMode" value="schema" onchange="switchValueMode('schema')" />
                Set fixed options
              </label>
            </div>

            <div id="exampleValueSection">
              <input class="form-input" type="text" id="exampleValue" name="exampleValue"
                placeholder="e.g. $10M - $50M ARR" style="margin-top:8px;" />
            </div>

            <div id="schemaSection" style="display:none;margin-top:8px;">
              <div class="field-config-table-wrap">
                <table class="field-config-table" style="width:100%;">
                  <thead>
                    <tr>
                      <th>Option Name</th>
                      <th style="width:60px;"></th>
                    </tr>
                  </thead>
                  <tbody id="optionTableBody"></tbody>
                </table>
                <button type="button" class="btn btn-outline btn-sm" style="margin:8px 10px;" onclick="addOptionRow()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add Option
                </button>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="source">Source</label>
            <select class="form-select" id="source" name="source">
              <option value="kernel">Kernel AI</option>
              <option value="linkedin">LinkedIn</option>
              <option value="both">Kernel AI &amp; LinkedIn</option>
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
                    <th style="width:22%;">Field Name</th>
                    <th style="width:22%;">Display Name</th>
                    <th style="width:18%;">SF Field Type</th>
                    <th style="width:28%;">Example</th>
                    <th style="width:10%;"></th>
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
        display: flex; flex-wrap: wrap;
        gap: 8px; padding: 12px; background: #fafcfa;
        border: 1px solid #e8ece8; border-radius: 8px;
      }
      .label-checkbox {
        display: flex; align-items: center; gap: 6px; cursor: pointer;
        padding: 4px 6px; border-radius: 6px; flex-shrink: 0;
      }
      .label-checkbox:hover { background: #f0f2f0; }
      .label-checkbox input[type="checkbox"] { width: 14px; height: 14px; accent-color: #8fb49a; cursor: pointer; flex-shrink: 0; }
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
      .field-config-table tbody tr:last-child td { border-bottom: none; }
      .value-mode-toggle { display: flex; gap: 20px; margin-bottom: 4px; }
      .mode-radio { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #343539; cursor: pointer; }
      .mode-radio input { accent-color: #8fb49a; cursor: pointer; }
      @media (max-width: 860px) { .form-grid { grid-template-columns: 1fr; } }
    </style>

    <script>
      var currentMode = 'example';
      var fieldCount = 0;
      var sfOpts = '${sfTypeOptions}';

      function removeFieldRow(btn) { btn.closest('tr').remove(); }
      function removeOptionRow(btn) {
        btn.closest('tr').remove();
        if (currentMode === 'schema') syncFieldExamples();
      }

      function switchValueMode(mode) {
        currentMode = mode;
        document.getElementById('exampleValueSection').style.display = mode === 'example' ? '' : 'none';
        document.getElementById('schemaSection').style.display = mode === 'schema' ? '' : 'none';
        // Rebuild example cells for all field rows
        var rows = document.querySelectorAll('#fieldTableBody tr');
        rows.forEach(function(tr) {
          var cells = tr.querySelectorAll('td');
          if (cells.length < 5) return;
          var exCell = cells[3];
          var hidden = exCell.querySelector('input[name="fieldExample[]"]');
          var oldVal = hidden ? hidden.value : '';
          while (exCell.firstChild) exCell.removeChild(exCell.firstChild);
          buildExampleCellInto(exCell, oldVal);
        });
      }

      function getOptionNames() {
        return Array.prototype.slice.call(
          document.querySelectorAll('#optionTableBody input[name="optionName[]"]')
        ).map(function(el) { return el.value.trim(); }).filter(Boolean);
      }

      function rebuildFieldJson(exCell) {
        var hidden = exCell.querySelector('input[name="fieldExample[]"]');
        var inputs = exCell.querySelectorAll('input[data-opt]');
        var map = {};
        inputs.forEach(function(inp) {
          if (inp.value.trim()) map[inp.getAttribute('data-opt')] = inp.value;
        });
        if (hidden) hidden.value = Object.keys(map).length > 0 ? JSON.stringify(map) : '';
      }

      function buildExampleCellInto(cell, existingVal) {
        var hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.name = 'fieldExample[]';
        cell.appendChild(hidden);

        if (currentMode === 'example') {
          var inp = document.createElement('input');
          inp.className = 'form-input';
          inp.type = 'text';
          inp.placeholder = 'e.g. Acme Corp';
          inp.style.cssText = 'padding:6px 8px;font-size:12px;';
          inp.value = existingVal || '';
          inp.oninput = function() { hidden.value = inp.value; };
          hidden.value = existingVal || '';
          cell.appendChild(inp);
        } else {
          // per-option mode
          var existingMap = {};
          try { if (existingVal) existingMap = JSON.parse(existingVal); } catch(e) {}
          var wrap = document.createElement('div');
          wrap.className = 'per-opt-examples';
          var opts = getOptionNames();
          opts.forEach(function(opt) {
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:4px;';
            var lbl = document.createElement('span');
            lbl.style.cssText = 'font-size:11px;font-weight:600;color:#555;min-width:56px;max-width:80px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0;';
            lbl.title = opt;
            lbl.textContent = opt;
            var optInp = document.createElement('input');
            optInp.className = 'form-input';
            optInp.type = 'text';
            optInp.placeholder = 'example...';
            optInp.setAttribute('data-opt', opt);
            optInp.value = existingMap[opt] || '';
            optInp.style.cssText = 'padding:4px 6px;font-size:11px;flex:1;min-width:0;';
            optInp.oninput = function() { rebuildFieldJson(cell); };
            row.appendChild(lbl); row.appendChild(optInp);
            wrap.appendChild(row);
          });
          cell.appendChild(wrap);
          rebuildFieldJson(cell);
        }
      }

      function syncFieldExamples() {
        var rows = document.querySelectorAll('#fieldTableBody tr');
        rows.forEach(function(tr) {
          var cells = tr.querySelectorAll('td');
          if (cells.length < 5) return;
          var exCell = cells[3];
          var hidden = exCell.querySelector('input[name="fieldExample[]"]');
          var oldVal = hidden ? hidden.value : '';
          while (exCell.firstChild) exCell.removeChild(exCell.firstChild);
          buildExampleCellInto(exCell, oldVal);
        });
      }

      function addFieldRow() {
        var tbody = document.getElementById('fieldTableBody');
        var tr = document.createElement('tr');

        var sel = document.createElement('select');
        sel.className = 'form-select';
        sel.name = 'fieldSfType[]';
        sel.style.cssText = 'padding:6px 8px;font-size:12px;';
        sel.innerHTML = sfOpts;

        var td1 = document.createElement('td');
        td1.innerHTML = '<input class="form-input" type="text" name="fieldName[]" placeholder="field_name" style="padding:6px 8px;font-size:12px;" />';
        var td2 = document.createElement('td');
        td2.innerHTML = '<input class="form-input" type="text" name="fieldDisplayName[]" placeholder="Display Name" style="padding:6px 8px;font-size:12px;" />';
        var td3 = document.createElement('td');
        td3.appendChild(sel);
        var td4 = document.createElement('td');
        buildExampleCellInto(td4, '');
        var td5 = document.createElement('td');
        td5.style.textAlign = 'center';
        td5.innerHTML = '<button type="button" class="btn btn-outline btn-sm" onclick="removeFieldRow(this)" style="padding:4px 8px;font-size:11px;color:#a03a3a;">Remove</button>';
        tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3); tr.appendChild(td4); tr.appendChild(td5);
        tbody.appendChild(tr);
        fieldCount++;
      }

      function addOptionRow() {
        var tbody = document.getElementById('optionTableBody');
        var tr = document.createElement('tr');
        var td1 = document.createElement('td');
        td1.innerHTML = '<input class="form-input" type="text" name="optionName[]" placeholder="e.g. B2B" style="padding:6px 8px;font-size:12px;" oninput="if(currentMode===\'schema\')syncFieldExamples()" />';
        var td2 = document.createElement('td');
        td2.style.textAlign = 'center';
        td2.innerHTML = '<button type="button" class="btn btn-outline btn-sm" onclick="removeOptionRow(this)" style="padding:4px 8px;font-size:11px;color:#a03a3a;">Remove</button>';
        tr.appendChild(td1); tr.appendChild(td2);
        tbody.appendChild(tr);
        if (currentMode === 'schema') syncFieldExamples();
      }

      addFieldRow();
    </script>
  `;

  return layout('Add Datapoint', body);
}
