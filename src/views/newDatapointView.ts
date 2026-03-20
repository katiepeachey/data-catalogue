import { Category, Label, SF_FIELD_TYPES, DYNAMICS_FIELD_TYPES, SF_TO_DYNAMICS } from '../types';
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

  const sfTypeOptions = SF_FIELD_TYPES.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
  const dynTypeOptions = DYNAMICS_FIELD_TYPES.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
  const sfToDynJson = JSON.stringify(SF_TO_DYNAMICS);

  const LENGTH_OPTIONS = ['', 18, 40, 80, 100, 255, 500, 1000, 4000, 5000, 32768];
  const lengthOptionsHtml = LENGTH_OPTIONS.map((v) =>
    `<option value="${v}">${v === '' ? '— none' : v}</option>`
  ).join('');

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

          <input type="hidden" name="valueMode" value="schema" />

          <div class="form-group">
            <label class="form-label">
              Classifier Options
              <span class="label-hint">If this datapoint outputs a fixed set of values (e.g. B2B, B2C), add them here. Leave empty for free-text outputs.</span>
            </label>
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
            <div class="field-config-list-wrap">
              <div class="field-config-list" id="fieldConfigList"></div>
              <button type="button" class="btn btn-outline btn-sm" style="margin:12px 18px;" onclick="addFieldRow()">
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

      /* -- Field config cards (reused from review view) -- */
      .field-config-list-wrap { display: flex; flex-direction: column; gap: 0; }
      .field-config-list { display: flex; flex-direction: column; }

      .field-card {
        padding: 16px 18px;
        border-bottom: 1px solid #eaebee;
        display: flex; flex-direction: column; gap: 12px;
      }
      .field-card:last-child { border-bottom: none; }

      .field-card-header {
        display: flex; align-items: center; justify-content: space-between; gap: 12px;
      }
      .field-card-header-right {
        display: flex; align-items: center; gap: 16px; flex-shrink: 0;
      }
      .field-vis-label {
        display: flex; align-items: center; gap: 6px;
        font-size: 13px; color: #555; cursor: pointer; user-select: none;
      }
      .field-order-wrap {
        display: flex; align-items: center; gap: 6px;
        font-size: 13px; color: #555;
      }

      .field-card-row {
        display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap;
      }
      .field-card-col { flex: 1; min-width: 140px; display: flex; flex-direction: column; gap: 5px; }
      .field-card-col-sm { width: 90px; flex-shrink: 0; display: flex; flex-direction: column; gap: 5px; }
      .field-card-label {
        font-size: 11px; font-weight: 600; color: #6b7280;
        letter-spacing: 0.04em; text-transform: uppercase;
      }

      .field-card-help-row {
        display: flex; flex-direction: column; gap: 5px;
      }
      .field-card-picklist-row {
        display: flex; flex-direction: column; gap: 5px;
      }
      .field-card-remove-row {
        display: flex; justify-content: flex-end;
      }

      @media (max-width: 860px) { .form-grid { grid-template-columns: 1fr; } }
    </style>

    <script>
      var fieldCount = 0;
      var sfOpts = '${sfTypeOptions}';
      var dynOpts = '${dynTypeOptions}';
      var lengthOpts = '${lengthOptionsHtml}';
      var SF_TO_DYNAMICS_MAP = ${sfToDynJson};
      var SF_DEFAULT_LENGTHS = {
        'Text': 255, 'Text (Long)': 1000, 'Text Area (Long)': 5000,
        'Long Text Area': 32768, 'URL': 255, 'Email': 254,
        'Phone': 40, 'Picklist': 255, 'Multi-Select Picklist': 4099, 'Lookup': 18
      };
      var PICKLIST_TYPES = { 'Picklist': true, 'Multi-Select Picklist': true };

      function toKernelFieldName(displayName) {
        var slug = displayName
          .toLowerCase()
          .replace(/[^a-z0-9\\s_]/g, '')
          .replace(/[\\s_]+/g, '_')
          .replace(/^_|_$/g, '');
        return 'kernel_' + slug;
      }

      function removeFieldCard(btn) { btn.closest('.field-card').remove(); }
      function removeOptionRow(btn) {
        btn.closest('tr').remove();
        syncFieldExamples();
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

        var opts = getOptionNames();
        if (opts.length > 0) {
          var existingMap = {};
          try { if (existingVal) existingMap = JSON.parse(existingVal); } catch(e) {}
          var wrap = document.createElement('div');
          wrap.className = 'per-opt-examples';
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
        } else {
          var inp = document.createElement('input');
          inp.className = 'form-input';
          inp.type = 'text';
          inp.placeholder = 'e.g. Acme Corp';
          inp.style.cssText = 'padding:6px 8px;font-size:12px;';
          inp.value = existingVal || '';
          inp.oninput = function() { hidden.value = inp.value; };
          hidden.value = existingVal || '';
          cell.appendChild(inp);
        }
      }

      function syncFieldExamples() {
        var cards = document.querySelectorAll('.field-card');
        cards.forEach(function(card) {
          var exCol = card.querySelector('.field-example-col');
          if (!exCol) return;
          var hidden = exCol.querySelector('input[name="fieldExample[]"]');
          var oldVal = hidden ? hidden.value : '';
          while (exCol.firstChild) exCol.removeChild(exCol.firstChild);
          buildExampleCellInto(exCol, oldVal);
        });
      }

      function autoMapDynamics(sfSelect, fieldIdx) {
        var sfType = sfSelect.value;
        var mapped = SF_TO_DYNAMICS_MAP[sfType] || '';
        var dynSel = document.getElementById('dynType_' + fieldIdx);
        if (dynSel && mapped) {
          for (var j = 0; j < dynSel.options.length; j++) {
            if (dynSel.options[j].value === mapped) { dynSel.value = mapped; break; }
          }
          if (dynSel.value !== mapped) {
            var opt = document.createElement('option');
            opt.value = mapped; opt.textContent = mapped;
            dynSel.insertBefore(opt, dynSel.firstChild);
            dynSel.value = mapped;
          }
        }
        var lenSel = document.getElementById('fieldLen_' + fieldIdx);
        if (lenSel) {
          var defaultLen = SF_DEFAULT_LENGTHS[sfType];
          lenSel.value = defaultLen !== undefined ? String(defaultLen) : '';
        }
        // Show/hide picklist values
        var plRow = document.getElementById('picklistRow_' + fieldIdx);
        if (plRow) {
          plRow.style.display = PICKLIST_TYPES[sfType] ? '' : 'none';
        }
      }

      function addFieldRow() {
        var list = document.getElementById('fieldConfigList');
        var i = fieldCount++;

        var card = document.createElement('div');
        card.className = 'field-card';

        // Header: Field Name + Visible + Order
        var header = document.createElement('div');
        header.className = 'field-card-header';

        var nameInp = document.createElement('input');
        nameInp.className = 'form-input';
        nameInp.type = 'text';
        nameInp.name = 'fieldName[]';
        nameInp.placeholder = 'kernel_field_name';
        nameInp.setAttribute('data-manual', '0');
        nameInp.style.cssText = 'flex:1;max-width:260px;font-family:SFMono-Regular,Consolas,Courier New,monospace;font-size:12px;';
        nameInp.addEventListener('input', function() { nameInp.setAttribute('data-manual', '1'); });

        var headerRight = document.createElement('div');
        headerRight.className = 'field-card-header-right';
        headerRight.innerHTML =
          '<label class="field-vis-label"><input type="checkbox" name="fieldVisible_' + i + '" value="1" checked style="accent-color:#343539;width:14px;height:14px;" /> Visible</label>'
          + '<div class="field-order-wrap"><span>Order</span><input class="form-input" type="number" name="fieldSortOrder[]" value="' + i + '" style="width:52px;" /></div>';

        header.appendChild(nameInp);
        header.appendChild(headerRight);
        card.appendChild(header);

        // Row 1: Display Name, SF Type, Dynamics Type, Length, Example
        var row1 = document.createElement('div');
        row1.className = 'field-card-row';

        var colDN = document.createElement('div'); colDN.className = 'field-card-col';
        var dnLabel = document.createElement('label'); dnLabel.className = 'field-card-label'; dnLabel.textContent = 'Display Name';
        var dnInput = document.createElement('input');
        dnInput.className = 'form-input'; dnInput.type = 'text';
        dnInput.name = 'fieldDisplayName[]'; dnInput.placeholder = 'Display Name';
        dnInput.addEventListener('input', function() {
          if (nameInp.getAttribute('data-manual') === '0') {
            nameInp.value = toKernelFieldName(dnInput.value);
          }
        });
        colDN.appendChild(dnLabel); colDN.appendChild(dnInput);

        var colSF = document.createElement('div'); colSF.className = 'field-card-col';
        var sfLabel = document.createElement('label'); sfLabel.className = 'field-card-label'; sfLabel.textContent = 'SF Type';
        var sel = document.createElement('select');
        sel.className = 'form-select'; sel.name = 'fieldSfType[]';
        sel.innerHTML = sfOpts;
        sel.onchange = function() { autoMapDynamics(sel, i); };
        colSF.appendChild(sfLabel); colSF.appendChild(sel);

        var colDyn = document.createElement('div'); colDyn.className = 'field-card-col';
        var dynLabel = document.createElement('label'); dynLabel.className = 'field-card-label'; dynLabel.textContent = 'Dynamics Type';
        var dynSel = document.createElement('select');
        dynSel.className = 'form-select'; dynSel.name = 'fieldDynamicsType[]'; dynSel.id = 'dynType_' + i;
        dynSel.innerHTML = dynOpts;
        colDyn.appendChild(dynLabel); colDyn.appendChild(dynSel);

        var colLen = document.createElement('div'); colLen.className = 'field-card-col-sm';
        colLen.innerHTML = '<label class="field-card-label">Length</label><select class="form-select" id="fieldLen_' + i + '" name="fieldLength[]">' + lengthOpts + '</select>';

        var colEx = document.createElement('div'); colEx.className = 'field-card-col field-example-col';
        var exLabel = document.createElement('label'); exLabel.className = 'field-card-label'; exLabel.textContent = 'Example';
        colEx.appendChild(exLabel);
        buildExampleCellInto(colEx, '');

        row1.appendChild(colDN); row1.appendChild(colSF); row1.appendChild(colDyn);
        row1.appendChild(colLen); row1.appendChild(colEx);
        card.appendChild(row1);

        // Help text row
        var helpRow = document.createElement('div');
        helpRow.className = 'field-card-help-row';
        helpRow.innerHTML = '<label class="field-card-label">Help Text</label><input class="form-input" type="text" name="fieldHelpText[]" placeholder="e.g. Reference to parent account record" />';
        card.appendChild(helpRow);

        // Picklist values row (hidden by default)
        var plRow = document.createElement('div');
        plRow.className = 'field-card-picklist-row';
        plRow.id = 'picklistRow_' + i;
        plRow.style.display = 'none';
        plRow.innerHTML = '<label class="field-card-label">Picklist Values <span style="font-weight:400;color:#aaa;text-transform:none;letter-spacing:0;">(semicolon-separated)</span></label><input class="form-input" type="text" name="fieldPicklistValues[]" placeholder="e.g. Option A; Option B; Option C" />';
        card.appendChild(plRow);

        // Remove button row
        var removeRow = document.createElement('div');
        removeRow.className = 'field-card-remove-row';
        removeRow.innerHTML = '<button type="button" class="btn btn-outline btn-sm" onclick="removeFieldCard(this)" style="padding:4px 12px;font-size:11px;color:#a03a3a;">Remove</button>';
        card.appendChild(removeRow);

        list.appendChild(card);
      }

      function addOptionRow() {
        var tbody = document.getElementById('optionTableBody');
        var tr = document.createElement('tr');
        var td1 = document.createElement('td');
        td1.innerHTML = '<input class="form-input" type="text" name="optionName[]" placeholder="e.g. B2B" style="padding:6px 8px;font-size:12px;" oninput="syncFieldExamples()" />';
        var td2 = document.createElement('td');
        td2.style.textAlign = 'center';
        td2.innerHTML = '<button type="button" class="btn btn-outline btn-sm" onclick="removeOptionRow(this)" style="padding:4px 8px;font-size:11px;color:#a03a3a;">Remove</button>';
        tr.appendChild(td1); tr.appendChild(td2);
        tbody.appendChild(tr);
        syncFieldExamples();
      }

      addFieldRow();
    </script>
  `;

  return layout('Add Datapoint', body);
}
