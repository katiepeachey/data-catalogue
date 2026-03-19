import { CleaningField } from '../db/cleaningFields';
import { layout, escapeHtml } from './layout';

export interface EnrichmentDatapoint {
  id: string;
  name: string;
  category: string;
  fields: { fieldName: string; displayName: string; sfFieldType: string; dynamicsFieldType: string; fieldLength: number | null; helpText: string }[];
}

const CRM_LABELS: Record<string, string> = {
  salesforce: 'Salesforce',
  dynamics: 'Dynamics',
  hubspot: 'HubSpot',
};

const CATEGORY_ORDER = ['required', 'recommended', 'optional'] as const;

const CATEGORY_LABELS: Record<string, string> = {
  required: 'Required',
  recommended: 'Recommended',
  optional: 'Optional',
};

function fieldsByCategory(fields: CleaningField[]): Record<string, CleaningField[]> {
  const grouped: Record<string, CleaningField[]> = { required: [], recommended: [], optional: [] };
  for (const f of fields) {
    (grouped[f.category] ??= []).push(f);
  }
  return grouped;
}

function cleaningPanel(fieldsByCrm: Record<string, CleaningField[]>): string {
  const crmTypes = ['salesforce', 'dynamics'];

  const tabs = crmTypes.map((crm) =>
    `<button type="button" class="crm-tab" data-crm="${crm}" onclick="switchCrm('${crm}')">${CRM_LABELS[crm] ?? crm}</button>`
  ).join('');

  const sections = crmTypes.map((crm) => {
    const fields = fieldsByCrm[crm] ?? [];
    const byCategory = fieldsByCategory(fields);

    const groups = CATEGORY_ORDER.map((cat) => {
      const catFields = byCategory[cat] ?? [];
      if (catFields.length === 0) return '';
      const fieldRows = catFields.map((f) => `
        <label class="field-check-row" title="${escapeHtml(f.helpText)}">
          <input type="checkbox" name="selected_cleaning" value="${escapeHtml(f.id)}"
            class="cleaning-cb crm-${crm}" checked>
          <span class="field-check-label">${escapeHtml(f.label)}</span>
          <span class="field-check-type">${escapeHtml(f.fieldType)}${f.fieldLength ? ` (${f.fieldLength})` : ''}</span>
        </label>`).join('');

      return `
        <div class="field-group">
          <div class="field-group-header">
            <span class="field-group-title">${CATEGORY_LABELS[cat]} <span class="field-group-count">(${catFields.length})</span></span>
            <button type="button" class="toggle-all-btn" onclick="toggleGroup(this, 'crm-${crm}', '${cat}')">all</button>
          </div>
          <div class="field-group-body" data-category="${cat}">
            ${fieldRows}
          </div>
        </div>`;
    }).join('');

    return `
      <div class="crm-section" id="crm-section-${crm}" style="display:none;">
        ${fields.length === 0
          ? `<p class="empty-panel">No fields synced yet for ${CRM_LABELS[crm] ?? crm}. <a href="/admin/sync-config" style="color:#343539;font-weight:600;">Run a sync</a> to populate.</p>`
          : groups
        }
      </div>`;
  }).join('');

  return `
    <div class="panel-header">CRM Cleaning Fields</div>
    <div class="crm-tabs">${tabs}</div>
    ${sections}`;
}

function enrichmentPanel(datapoints: EnrichmentDatapoint[]): string {
  const categories = [...new Set(datapoints.map((d) => d.category))].sort();

  const filterOptions = categories.map((cat) =>
    `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`
  ).join('');

  const groups = categories.map((cat) => {
    const dps = datapoints.filter((d) => d.category === cat);
    const rows = dps.map((dp) => `
      <label class="field-check-row enrichment-row" data-category="${escapeHtml(dp.category)}">
        <input type="checkbox" name="selected_enrichment" value="${escapeHtml(dp.id)}"
          class="enrichment-cb" onchange="updateCount()">
        <span class="field-check-label">${escapeHtml(dp.name)}</span>
        <span class="field-check-type">${dp.fields.length} field${dp.fields.length !== 1 ? 's' : ''}</span>
      </label>`).join('');

    return `
      <div class="field-group enrichment-group" data-category="${escapeHtml(cat)}">
        <div class="field-group-header">
          <span class="field-group-title">${escapeHtml(cat)} <span class="field-group-count">(${dps.length})</span></span>
        </div>
        <div class="field-group-body">${rows}</div>
      </div>`;
  }).join('');

  return `
    <div class="panel-header">Enrichment Datapoints</div>
    <div class="enrichment-filter">
      <select class="form-select" onchange="filterEnrichment(this.value)">
        <option value="">All categories</option>
        ${filterOptions}
      </select>
    </div>
    <div class="enrichment-groups">
      ${datapoints.length === 0
        ? '<p class="empty-panel">No approved datapoints found.</p>'
        : groups
      }
    </div>`;
}

export function fieldBuilderView(
  fieldsByCrm: Record<string, CleaningField[]>,
  datapoints: EnrichmentDatapoint[]
): string {
  // Count total fields across all enrichment datapoints for the field count display
  const enrichmentFieldCountJson = JSON.stringify(
    Object.fromEntries(datapoints.map((d) => [d.id, d.fields.length]))
  );

  const body = `
<style>
  .builder-wrap {
    max-width: 1200px; margin: 0 auto;
  }
  .page-header { margin-bottom: 20px; }

  .builder-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }

  .builder-panel {
    background: #fff;
    border: 1px solid #eaebee;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    max-height: 620px;
    display: flex;
    flex-direction: column;
  }

  .panel-header {
    padding: 14px 18px 10px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #6b7280;
    border-bottom: 1px solid #eaebee;
    flex-shrink: 0;
  }

  .crm-tabs {
    display: flex;
    border-bottom: 1px solid #eaebee;
    flex-shrink: 0;
  }
  .crm-tab {
    flex: 1;
    padding: 9px 0;
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    color: #6b7280;
    transition: color 0.15s, border-color 0.15s;
  }
  .crm-tab.active {
    color: #343539;
    border-bottom-color: #343539;
    font-weight: 600;
  }
  .crm-tab:hover { color: #343539; }

  .crm-section, .enrichment-groups {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
  }

  .enrichment-filter {
    padding: 10px 16px;
    border-bottom: 1px solid #f0f1f3;
    flex-shrink: 0;
  }
  .enrichment-filter .form-select {
    font-size: 12px;
    padding: 6px 10px;
  }

  .field-group { border-bottom: 1px solid #f0f1f3; }
  .field-group:last-child { border-bottom: none; }

  .field-group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px 6px;
  }
  .field-group-title {
    font-size: 12px;
    font-weight: 700;
    color: #343539;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .field-group-count {
    font-weight: 400;
    color: #9ca3af;
  }
  .toggle-all-btn {
    font-size: 11px;
    color: #9ca3af;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    padding: 2px 6px;
    border-radius: 4px;
    transition: background 0.1s, color 0.1s;
  }
  .toggle-all-btn:hover { background: #f3f4f6; color: #343539; }

  .field-group-body { padding: 0 8px 8px; }

  .field-check-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 8px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.1s;
  }
  .field-check-row:hover { background: #f9fafb; }
  .field-check-row input[type="checkbox"] {
    width: 14px; height: 14px; flex-shrink: 0; cursor: pointer;
    accent-color: #343539;
  }
  .field-check-label {
    flex: 1;
    font-size: 13px;
    color: #343539;
  }
  .field-check-type {
    font-size: 11px;
    color: #9ca3af;
    white-space: nowrap;
  }

  .empty-panel {
    padding: 24px 16px;
    font-size: 13px;
    color: #9ca3af;
    text-align: center;
  }

  .export-bar {
    background: #fff;
    border: 1px solid #eaebee;
    border-radius: 12px;
    padding: 14px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  }
  .export-count {
    font-size: 13px;
    color: #6b7280;
  }
  .export-count strong { color: #343539; }

  .export-actions { display: flex; align-items: center; gap: 10px; }

  .crm-hidden { display: none !important; }
  .enrichment-group.hidden { display: none !important; }
</style>

<div class="builder-wrap">
  <div class="page-header">
    <h1 class="page-title">Field Builder</h1>
  </div>

  <form method="POST" action="/admin/field-builder/export" id="builder-form">
    <input type="hidden" name="crm_type" id="crm_type_input" value="salesforce">

    <div class="builder-grid">
      <div class="builder-panel" id="cleaning-panel">
        ${cleaningPanel(fieldsByCrm)}
      </div>
      <div class="builder-panel" id="enrichment-panel">
        ${enrichmentPanel(datapoints)}
      </div>
    </div>

    <div class="export-bar">
      <div class="export-count">
        Selected: <strong id="count-cleaning">0</strong> cleaning fields
        + <strong id="count-enrichment">0</strong> enrichment datapoints
        = <strong id="count-total">0</strong> total fields
      </div>
      <div class="export-actions">
        <button type="submit" class="btn btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export CSV
        </button>
      </div>
    </div>
  </form>
</div>

<script>
const ENRICHMENT_FIELD_COUNTS = ${enrichmentFieldCountJson};

let activeCrm = 'salesforce';

function switchCrm(crm) {
  activeCrm = crm;
  document.getElementById('crm_type_input').value = crm;

  // Show/hide sections
  document.querySelectorAll('.crm-section').forEach(function(el) {
    el.style.display = 'none';
  });
  var section = document.getElementById('crm-section-' + crm);
  if (section) section.style.display = 'block';

  // Update tab active states
  document.querySelectorAll('.crm-tab').forEach(function(tab) {
    tab.classList.toggle('active', tab.dataset.crm === crm);
  });

  updateCount();
}

function toggleGroup(btn, crmClass, category) {
  var rows = document.querySelectorAll('#crm-section-' + activeCrm + ' [data-category="' + category + '"] .cleaning-cb');
  var anyUnchecked = Array.from(rows).some(function(cb) { return !cb.checked; });
  rows.forEach(function(cb) { cb.checked = anyUnchecked; });
  updateCount();
}

function filterEnrichment(category) {
  document.querySelectorAll('.enrichment-group').forEach(function(group) {
    if (!category || group.dataset.category === category) {
      group.classList.remove('hidden');
    } else {
      group.classList.add('hidden');
    }
  });
}

function updateCount() {
  var cleaningChecked = document.querySelectorAll('#crm-section-' + activeCrm + ' .cleaning-cb:checked').length;
  var enrichmentChecked = document.querySelectorAll('.enrichment-cb:checked');
  var enrichmentFields = 0;
  enrichmentChecked.forEach(function(cb) {
    enrichmentFields += (ENRICHMENT_FIELD_COUNTS[cb.value] || 0);
  });

  document.getElementById('count-cleaning').textContent = cleaningChecked;
  document.getElementById('count-enrichment').textContent = enrichmentChecked.length;
  document.getElementById('count-total').textContent = cleaningChecked + enrichmentFields;
}

// Initialise
switchCrm('salesforce');
</script>
`;

  return layout('Field Builder', body);
}
