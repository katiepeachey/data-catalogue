import { Label, Category, Source, SF_FIELD_TYPES, DYNAMICS_FIELD_TYPES, SF_TO_DYNAMICS, DatapointField } from '../types';
import { SubmissionWithMeta } from '../db/datapoints';
import { layout, escapeHtml } from './layout';

const ALL_LABELS: { value: Label; display: string }[] = [
  { value: 'company-identity',          display: 'Entity Identity' },
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

function categoryOption(cat: Category, current: Category): string {
  return `<option value="${escapeHtml(cat)}"${cat === current ? ' selected' : ''}>${escapeHtml(cat)}</option>`;
}

function sourceOption(src: Source, current: Source): string {
  const labels: Record<Source, string> = { kernel: 'Kernel AI', linkedin: 'LinkedIn', both: 'Kernel AI & LinkedIn' };
  return `<option value="${src}"${src === current ? ' selected' : ''}>${labels[src]}</option>`;
}

function labelCheckbox(label: { value: Label; display: string }, isChecked: boolean): string {
  return `<label class="label-checkbox${isChecked ? ' checked' : ''}">
    <input type="checkbox" name="labels" value="${label.value}"${isChecked ? ' checked' : ''} />
    <span class="sub-label lbl-${label.value}">${escapeHtml(label.display)}</span>
  </label>`;
}

function previewSourceBadge(source: Source): string {
  const kernelBadge = `<span class="source-badge source-kernel">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:11px;height:11px;flex-shrink:0;">
      <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>Kernel AI</span>`;
  const linkedinBadge = `<span class="source-badge source-linkedin">
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452H16.89v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a1.98 1.98 0 0 1-1.983-1.98 1.98 1.98 0 0 1 3.962 0 1.98 1.98 0 0 1-1.979 1.98zm1.961 13.019H3.374V9h3.924v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>LinkedIn</span>`;
  if (source === 'kernel') return kernelBadge;
  if (source === 'linkedin') return linkedinBadge;
  return `<div style="display:flex;gap:6px;flex-wrap:wrap;">${kernelBadge}${linkedinBadge}</div>`;
}

export function reviewView(submission: SubmissionWithMeta, fields: DatapointField[]): string {
  const labelCheckboxes = ALL_LABELS.map((l) =>
    labelCheckbox(l, submission.labels.includes(l.value))
  ).join('\n');

  const categoryOptions = ALL_CATEGORIES.map((c) =>
    categoryOption(c, submission.category)
  ).join('\n');

  const previewLabels = submission.labels
    .map((l) => {
      const found = ALL_LABELS.find((al) => al.value === l);
      return `<span class="sub-label lbl-${l}">${escapeHtml(found?.display || l)}</span>`;
    })
    .join('');

  const previewFields = fields
    .filter((f) => f.visible)
    .map((f) => `<li>
      <span class="field-tag">${escapeHtml(f.displayName)}</span>
      <span class="sf-type-badge">${escapeHtml(f.sfFieldType)}</span>
    </li>`)
    .join('\n');

  const statusClass =
    submission.status === 'pending'
      ? 'status-pending'
      : submission.status === 'approved'
      ? 'status-approved'
      : 'status-rejected';

  const statusLabel =
    submission.status.charAt(0).toUpperCase() + submission.status.slice(1);

  const sfTypeOptions = SF_FIELD_TYPES.map((t) => `<option value="${t}">${t}</option>`).join('');
  const dynTypeOptions = DYNAMICS_FIELD_TYPES.map((t) => `<option value="${t}">${t}</option>`).join('');
  const sfToDynJson = JSON.stringify(SF_TO_DYNAMICS);

  // Classifier options for per-option example UI
  let classifierOptions: string[] = [];
  if (submission.classifierOptionsSample) {
    try {
      const parsed = JSON.parse(submission.classifierOptionsSample);
      classifierOptions = (parsed.options || []).map((o: { name: string }) => o.name).filter(Boolean);
    } catch { /* ignore */ }
  }
  const hasOptions = classifierOptions.length > 0;
  const classifierOptionsJson = JSON.stringify(classifierOptions);

  const fieldConfigRows = fields.map((f, i) => {
    // Parse any existing per-option map
    let perOptionMap: Record<string, string> = {};
    let exampleSingle = '';
    if (f.exampleValue) {
      try {
        const parsed = JSON.parse(f.exampleValue);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          perOptionMap = parsed;
        } else {
          exampleSingle = f.exampleValue || '';
        }
      } catch { exampleSingle = f.exampleValue || ''; }
    }

    // Chips for fields in datapoints with classifier options
    const chipsHtml = hasOptions ? classifierOptions.map((opt, oi) =>
      `<span class="admin-chip${oi === 0 ? ' active' : ''}" data-opt="${escapeHtml(opt)}" data-fi="${i}">${escapeHtml(opt)}</span>`
    ).join('') : '';

    // Initial text for the shared input = first option's example (or empty)
    const firstOptExample = hasOptions && classifierOptions[0]
      ? escapeHtml(perOptionMap[classifierOptions[0]] || '')
      : '';
    const firstOptPlaceholder = hasOptions && classifierOptions[0]
      ? `Example for ${escapeHtml(classifierOptions[0])}...`
      : 'e.g. $12M';

    return `
    <div class="field-card" id="fieldCard_${i}">
      <input type="hidden" name="fields[${i}][fieldName]" value="${escapeHtml(f.fieldName)}" />

      <div class="field-card-header">
        <span class="field-tag">${escapeHtml(f.fieldName)}</span>
        <div class="field-card-header-right">
          <label class="field-vis-label">
            <input type="checkbox" name="fields[${i}][visible]" value="1"${f.visible ? ' checked' : ''}
              style="accent-color:#343539;width:14px;height:14px;" />
            Visible
          </label>
          <div class="field-order-wrap">
            <span>Order</span>
            <input class="form-input" type="number" name="fields[${i}][sortOrder]"
              value="${f.sortOrder}" style="width:52px;" />
          </div>
        </div>
      </div>

      <div class="field-card-row">
        <div class="field-card-col">
          <label class="field-card-label">Display Name</label>
          <input class="form-input" type="text" name="fields[${i}][displayName]"
            value="${escapeHtml(f.displayName)}" />
        </div>
        <div class="field-card-col">
          <label class="field-card-label">SF Type</label>
          <select class="form-select" name="fields[${i}][sfFieldType]"
            onchange="autoMapDynamics(this, ${i})">
            ${SF_FIELD_TYPES.map((t) =>
              `<option value="${t}"${t === f.sfFieldType ? ' selected' : ''}>${t}</option>`
            ).join('')}
          </select>
        </div>
        <div class="field-card-col">
          <label class="field-card-label">Dynamics Type</label>
          <select class="form-select" name="fields[${i}][dynamicsFieldType]" id="dynType_${i}">
            <option value="${escapeHtml(f.dynamicsFieldType)}">${escapeHtml(f.dynamicsFieldType || '—')}</option>
            ${DYNAMICS_FIELD_TYPES.filter((t) => t !== f.dynamicsFieldType).map((t) =>
              `<option value="${t}">${t}</option>`
            ).join('')}
          </select>
        </div>
        <div class="field-card-col-sm">
          <label class="field-card-label">Length</label>
          <input class="form-input" type="number" id="fieldLen_${i}"
            name="fields[${i}][fieldLength]"
            value="${f.fieldLength != null ? f.fieldLength : ''}"
            placeholder="—" style="width:80px;" />
        </div>
        <div class="field-card-col">
          <label class="field-card-label">Example</label>
          <input type="hidden" name="fields[${i}][exampleValue]" id="exVal_${i}"
            value="${escapeHtml(f.exampleValue || '')}" />
          ${hasOptions ? `
          <div class="admin-chips" id="adminChips_${i}"
            data-map="${escapeHtml(JSON.stringify(perOptionMap))}">
            ${chipsHtml}
          </div>
          <input class="form-input" type="text" id="optInput_${i}"
            value="${firstOptExample}"
            placeholder="${firstOptPlaceholder}"
            style="margin-top:5px;"
            oninput="updateChipExample(${i})" />
          ` : `
          <input class="form-input" type="text" id="singleInput_${i}"
            value="${escapeHtml(exampleSingle)}"
            placeholder="e.g. $12M"
            oninput="document.getElementById('exVal_${i}').value=this.value" />
          `}
        </div>
      </div>

      <div class="field-card-help-row">
        <label class="field-card-label">Help Text</label>
        <input class="form-input" type="text" name="fields[${i}][helpText]"
          value="${escapeHtml(f.helpText)}"
          placeholder="e.g. Reference to parent account record — used for hierarchy linking" />
      </div>
    </div>`;
  }).join('');

  const body = `
    <div class="review-layout">

      <!-- LEFT: Edit form -->
      <div class="review-left">
        <div class="card review-card">
          <div class="review-card-header">
            <h2 class="review-card-title">Edit Datapoint</h2>
            <span class="status-badge ${statusClass}">${statusLabel}</span>
          </div>

          <form id="reviewForm" method="POST" action="/admin/review/${escapeHtml(submission.id)}">
            <input type="hidden" name="_action" id="_action" value="approve" />
            <input type="hidden" name="rejectionReason" id="rejectionReasonHidden" value="" />

            <div class="form-grid">

              <div class="form-group">
                <label class="form-label" for="name">Datapoint Name</label>
                <input class="form-input" type="text" id="name" name="name"
                  value="${escapeHtml(submission.name)}" required />
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
              <textarea class="form-textarea" id="description" name="description"
                rows="4">${escapeHtml(submission.description)}</textarea>
            </div>

            <div class="form-group">
              <label class="form-label">
                Field Configuration
                <span class="label-hint">Configure display names, SF types, and visibility per field</span>
              </label>
              <div class="field-config-list-wrap">
                <div class="field-config-list" id="fieldConfigTable">
                  ${fieldConfigRows}
                  ${fields.length === 0 ? '<p style="color:#aaa;font-size:13px;padding:16px;">No fields configured yet. Add fields below or run a sync.</p>' : ''}
                </div>
                <button type="button" class="btn btn-outline btn-sm" style="margin:12px 18px;" onclick="addFieldRow()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add Field
                </button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="source">Source</label>
              <select class="form-select" id="source" name="source">
                ${sourceOption('kernel', submission.source)}
                ${sourceOption('linkedin', submission.source)}
                ${sourceOption('both', submission.source)}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Labels</label>
              <div class="labels-grid">
                ${labelCheckboxes}
              </div>
            </div>

          </form>
        </div>
      </div>

      <!-- RIGHT: Preview -->
      <div class="review-right">
        <div class="card preview-card">
          <div class="preview-header">Preview</div>
          <div class="preview-body">

            <div class="preview-labels">
              <div class="sub-labels">${previewLabels}</div>
            </div>

            <div class="preview-name">${escapeHtml(submission.name)}</div>

            <p class="preview-desc">${escapeHtml(submission.description)}</p>

            <div class="preview-section-title">Output Fields</div>
            <ul class="fields-list preview-fields">
              ${previewFields}
            </ul>

            <div class="preview-section-title">Example Output</div>
            <div class="preview-example-val">${escapeHtml(submission.exampleValue)}</div>
            ${submission.exampleEvidence
              ? `<div class="preview-evidence">${escapeHtml(submission.exampleEvidence)}</div>`
              : ''}
            ${submission.exampleUrl
              ? `<div class="preview-url">${escapeHtml(submission.exampleUrl)}</div>`
              : ''}

            <div class="preview-footer">
              ${previewSourceBadge(submission.source)}
            </div>

          </div>
        </div>

        <div class="card submission-meta-card">
          <div class="meta-title">Submission Info</div>
          <div class="meta-row">
            <span class="meta-key">ID</span>
            <span class="meta-val mono">${escapeHtml(submission.id)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-key">Submitted</span>
            <span class="meta-val">${escapeHtml(new Date(submission.submittedAt).toLocaleString('en-GB'))}</span>
          </div>
          <div class="meta-row">
            <span class="meta-key">Status</span>
            <span class="meta-val"><span class="status-badge ${statusClass}">${statusLabel}</span></span>
          </div>
          ${submission.rejectionReason
            ? `<div class="meta-row meta-reason">
                <span class="meta-key">Rejection Reason</span>
                <span class="meta-val">${escapeHtml(submission.rejectionReason)}</span>
              </div>`
            : ''}
        </div>

        <div class="card portal-context-card" style="margin-top:14px;">
          <div class="meta-title">Portal Context</div>
          ${submission.adminEdited
            ? `<div class="meta-row">
                <span class="meta-key">Admin Edited</span>
                <span class="meta-val"><span class="status-badge status-approved" style="font-size:10px;">Yes — syncs won't overwrite</span></span>
              </div>`
            : ''}
          ${submission.autoName && submission.autoName !== submission.name
            ? `<div class="meta-row">
                <span class="meta-key">Portal Name</span>
                <span class="meta-val mono" style="font-size:11px;">${escapeHtml(submission.autoName)}</span>
              </div>`
            : ''}
          ${submission.producingAgents.length > 0
            ? `<div class="meta-row" style="flex-direction:column;gap:4px;">
                <span class="meta-key">Producing Agents</span>
                <div style="display:flex;flex-wrap:wrap;gap:4px;">
                  ${submission.producingAgents.map((a) =>
                    `<span class="sub-label lbl-technology-infrastructure" style="font-size:10px;">${escapeHtml(a)}</span>`
                  ).join('')}
                </div>
              </div>`
            : ''}
          ${submission.classifierInfo.length > 0
            ? `<div class="meta-row" style="flex-direction:column;gap:4px;">
                <span class="meta-key">Classifiers</span>
                <div style="display:flex;flex-wrap:wrap;gap:4px;">
                  ${submission.classifierInfo.map((c) =>
                    `<span class="sub-label lbl-industry-market" style="font-size:10px;">${escapeHtml(c)}</span>`
                  ).join('')}
                </div>
              </div>`
            : ''}
          ${submission.rdClassification
            ? `<div class="meta-row">
                <span class="meta-key">Classification</span>
                <span class="meta-val">${escapeHtml(submission.rdClassification)}</span>
              </div>`
            : ''}
          ${submission.dataType
            ? `<div class="meta-row">
                <span class="meta-key">Data Type</span>
                <span class="meta-val mono" style="font-size:11px;">${escapeHtml(submission.dataType)}</span>
              </div>`
            : ''}
          ${submission.entityType
            ? `<div class="meta-row">
                <span class="meta-key">Entity Type</span>
                <span class="meta-val mono" style="font-size:11px;">${escapeHtml(submission.entityType)}</span>
              </div>`
            : ''}
          <div class="meta-row">
            <span class="meta-key">Client Count</span>
            <span class="meta-val">${submission.clientCount}</span>
          </div>
        </div>
      </div>

    </div>

    <!-- Sticky action bar -->
    <div class="action-bar">
      <a href="/admin/queue" class="btn btn-outline">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back to Queue
      </a>
      <div class="action-bar-right">
        <button type="button" class="btn btn-danger" id="rejectBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          Reject
        </button>
        <button type="submit" form="reviewForm" class="btn btn-primary" id="approveBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Approve &amp; Save
        </button>
      </div>
    </div>

    <!-- Rejection modal -->
    <div id="rejectOverlay" class="modal-overlay" style="display:none;">
      <div class="modal-box">
        <div class="modal-header">
          <h3 class="modal-title">Reject Datapoint</h3>
          <button type="button" class="modal-close" id="modalClose">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <p class="modal-sub">Provide a reason for rejection. This will be sent as a Slack notification.</p>
        <div class="form-group" style="margin-bottom:20px;">
          <label class="form-label" for="rejectionReasonInput">Rejection Reason <span style="color:#c0392b;">*</span></label>
          <textarea
            class="form-textarea"
            id="rejectionReasonInput"
            rows="4"
            placeholder="e.g. Description is too vague. Output fields need to be more specific. Please revise and resubmit."
          ></textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" id="modalCancelBtn">Cancel</button>
          <button type="button" class="btn btn-danger" id="confirmRejectBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>

    <style>
      /* -- Review layout -- */
      .review-layout {
        display: grid;
        grid-template-columns: 1fr 360px;
        gap: 20px;
        align-items: start;
        padding-bottom: 100px;
      }

      .review-card { padding: 0; }
      .review-card-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 20px 24px 16px;
        border-bottom: 1px solid #eaeeea;
      }
      .review-card-title { font-size: 15px; font-weight: 700; color: #1a1a1a; }

      form#reviewForm { padding: 20px 24px 24px; }

      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      .label-hint {
        font-size: 11px; color: #aaa; font-weight: 400;
        text-transform: none; letter-spacing: 0; margin-left: 6px;
      }

      /* Labels grid */
      .labels-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 12px;
        background: #fafcfa;
        border: 1px solid #e8ece8;
        border-radius: 8px;
      }
      .label-checkbox {
        display: flex; align-items: center; gap: 8px;
        cursor: pointer; padding: 4px;
        border-radius: 6px;
        transition: background 0.1s;
      }
      .label-checkbox:hover { background: #f0f2f0; }
      .label-checkbox input[type="checkbox"] {
        width: 14px; height: 14px; flex-shrink: 0;
        cursor: pointer; accent-color: #2d7a4f;
      }

      /* -- Admin option chips -- */
      .admin-chips { display: flex; flex-wrap: wrap; gap: 4px; }
      .admin-chip {
        display: inline-flex; align-items: center;
        font-size: 10px; font-weight: 700; letter-spacing: 0.03em;
        border-radius: 20px; padding: 3px 10px;
        cursor: pointer; border: 1.5px solid #e0e4e0;
        background: #f0f2f0; color: #666;
        transition: all 0.12s; white-space: nowrap; user-select: none;
      }
      .admin-chip:hover { background: #e4e8e4; border-color: #c8d5c9; }
      .admin-chip.active { background: #343539; color: #fff; border-color: #343539; }

      /* -- Field config cards -- */
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

      /* -- SF type badge -- */
      .sf-type-badge {
        display: inline-flex; font-size: 9px; font-weight: 600;
        background: #eef2fc; color: #3a5fa0; border: 1px solid #b8c8ef;
        border-radius: 3px; padding: 1px 5px; margin-left: 4px;
        text-transform: uppercase; letter-spacing: 0.04em;
      }

      /* -- Preview card -- */
      .preview-card { margin-bottom: 14px; }
      .preview-header {
        font-size: 11px; font-weight: 700; color: #999;
        text-transform: uppercase; letter-spacing: 0.08em;
        padding: 12px 18px;
        border-bottom: 1px solid #eaeeea;
        background: #fafcfa;
      }
      .preview-body { padding: 18px; }
      .preview-labels { margin-bottom: 10px; }
      .preview-name {
        font-size: 14px; font-weight: 700; color: #1a1a1a;
        margin-bottom: 8px;
      }
      .preview-desc {
        font-size: 12.5px; color: #666; line-height: 1.55;
        margin-bottom: 14px;
      }
      .preview-section-title {
        font-size: 10.5px; font-weight: 700; color: #bbb;
        text-transform: uppercase; letter-spacing: 0.07em;
        margin-bottom: 6px; margin-top: 12px;
      }
      .preview-fields { list-style: none; display: flex; flex-direction: column; gap: 4px; }
      .preview-example-val {
        font-size: 12.5px; color: #333; line-height: 1.5;
      }
      .preview-evidence {
        font-size: 11.5px; color: #999; margin-top: 3px;
        font-style: italic; line-height: 1.45;
      }
      .preview-url {
        font-size: 11px; color: #5a8fd4;
        font-family: 'SFMono-Regular', 'Consolas', 'Courier New', monospace;
        word-break: break-all; margin-top: 3px;
      }
      .preview-footer {
        display: flex; align-items: center; justify-content: space-between;
        margin-top: 16px; padding-top: 12px;
        border-top: 1px solid #f0f2f0;
      }
      .preview-date { font-size: 11.5px; color: #bbb; }

      /* -- Submission meta card -- */
      .submission-meta-card { padding: 16px 18px; }
      .meta-title {
        font-size: 11px; font-weight: 700; color: #bbb;
        text-transform: uppercase; letter-spacing: 0.08em;
        margin-bottom: 12px;
      }
      .meta-row {
        display: flex; gap: 10px; align-items: flex-start;
        padding: 5px 0; border-bottom: 1px solid #f0f2f0;
        font-size: 12px;
      }
      .meta-row:last-child { border-bottom: none; }
      .meta-key { color: #aaa; min-width: 90px; flex-shrink: 0; }
      .meta-val { color: #333; }
      .meta-val.mono { font-family: 'SFMono-Regular', 'Consolas', 'Courier New', monospace; font-size: 11px; color: #666; }
      .meta-reason .meta-val { color: #a03a3a; }
      .portal-context-card { padding: 16px 18px; }
      .portal-context-card .meta-title { margin-bottom: 10px; }

      /* -- Action bar -- */
      .action-bar {
        position: fixed; bottom: 0; left: 0; right: 0;
        background: #fff; border-top: 1px solid #e8ece8;
        padding: 14px 28px;
        display: flex; align-items: center; justify-content: space-between;
        z-index: 50;
        box-shadow: 0 -2px 12px rgba(0,0,0,0.06);
      }
      .action-bar-right { display: flex; align-items: center; gap: 10px; }

      /* -- Rejection modal -- */
      .modal-overlay {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.45);
        z-index: 200;
        display: none;
        align-items: center;
        justify-content: center;
      }
      .modal-box {
        background: #fff;
        border-radius: 14px;
        border: 1px solid #e8ece8;
        box-shadow: 0 8px 40px rgba(0,0,0,0.18);
        padding: 28px;
        width: 100%;
        max-width: 480px;
        margin: 20px;
      }
      .modal-header {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 8px;
      }
      .modal-title { font-size: 16px; font-weight: 700; color: #1a1a1a; }
      .modal-close {
        background: none; border: none; cursor: pointer;
        color: #aaa; padding: 2px;
        transition: color 0.15s;
      }
      .modal-close:hover { color: #555; }
      .modal-sub {
        font-size: 13px; color: #888; margin-bottom: 18px; line-height: 1.5;
      }
      .modal-actions {
        display: flex; align-items: center; justify-content: flex-end; gap: 10px;
      }

      @media (max-width: 860px) {
        .review-layout { grid-template-columns: 1fr; }
        .form-grid { grid-template-columns: 1fr; }
      }
    </style>

    <script>
      var SF_TO_DYNAMICS_MAP = ${sfToDynJson};
      var SF_DEFAULT_LENGTHS = {
        'Text': 255, 'Text (Long)': 1000, 'Text Area (Long)': 5000,
        'Long Text Area': 32768, 'URL': 255, 'Email': 254,
        'Phone': 40, 'Picklist': 255, 'Multi-Select Picklist': 4099, 'Lookup': 18
      };

      function autoMapDynamics(sfSelect, fieldIdx) {
        var sfType = sfSelect.value;

        // Map Dynamics type
        var mapped = SF_TO_DYNAMICS_MAP[sfType] || '';
        var dynSel = document.getElementById('dynType_' + fieldIdx);
        if (dynSel && mapped) {
          for (var i = 0; i < dynSel.options.length; i++) {
            if (dynSel.options[i].value === mapped) { dynSel.value = mapped; break; }
          }
          // Add option if not present
          if (dynSel.value !== mapped) {
            var opt = document.createElement('option');
            opt.value = mapped; opt.textContent = mapped;
            dynSel.insertBefore(opt, dynSel.firstChild);
            dynSel.value = mapped;
          }
        }

        // Auto-fill default length
        var lenInp = document.getElementById('fieldLen_' + fieldIdx);
        if (lenInp) {
          var defaultLen = SF_DEFAULT_LENGTHS[sfType];
          lenInp.value = defaultLen !== undefined ? defaultLen : '';
        }
      }

      var overlay     = document.getElementById('rejectOverlay');
      var rejectBtn   = document.getElementById('rejectBtn');
      var modalClose  = document.getElementById('modalClose');
      var cancelBtn   = document.getElementById('modalCancelBtn');
      var confirmBtn  = document.getElementById('confirmRejectBtn');
      var reasonInput = document.getElementById('rejectionReasonInput');
      var actionInput = document.getElementById('_action');
      var reasonHidden = document.getElementById('rejectionReasonHidden');
      var form        = document.getElementById('reviewForm');

      function openModal() {
        overlay.style.display = 'flex';
        reasonInput.focus();
      }

      function closeModal() {
        overlay.style.display = 'none';
        reasonInput.value = '';
      }

      rejectBtn.addEventListener('click', openModal);
      modalClose.addEventListener('click', closeModal);
      cancelBtn.addEventListener('click', closeModal);

      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeModal();
      });

      confirmBtn.addEventListener('click', function() {
        var reason = reasonInput.value.trim();
        if (!reason) {
          reasonInput.style.borderColor = '#c0392b';
          reasonInput.style.boxShadow = '0 0 0 3px rgba(192,57,43,0.12)';
          reasonInput.focus();
          return;
        }
        actionInput.value = 'reject';
        reasonHidden.value = reason;
        overlay.style.display = 'none';
        form.submit();
      });

      reasonInput.addEventListener('input', function() {
        reasonInput.style.borderColor = '';
        reasonInput.style.boxShadow = '';
      });

      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && overlay.style.display !== 'none') closeModal();
      });

      var classifierOpts = ${classifierOptionsJson};

      // Per-field example maps: { fieldIndex: { optionName: exampleText } }
      var adminChipMaps = {};
      var adminActiveChip = {};

      function adminSelectChip(chipEl, fi) {
        // Save current text input value into the map for the previously active chip
        var input = document.getElementById('optInput_' + fi);
        var prev = adminActiveChip[fi];
        if (prev !== null && prev !== undefined && input) {
          if (!adminChipMaps[fi]) adminChipMaps[fi] = {};
          adminChipMaps[fi][prev] = input.value;
          flushChipMap(fi);
        }
        // Update chip styles
        var chipsEl = document.getElementById('adminChips_' + fi);
        if (chipsEl) chipsEl.querySelectorAll('.admin-chip').forEach(function(c) { c.classList.remove('active'); });
        chipEl.classList.add('active');
        // Load new chip's saved value
        var opt = chipEl.getAttribute('data-opt');
        adminActiveChip[fi] = opt;
        if (input) {
          input.value = (adminChipMaps[fi] && adminChipMaps[fi][opt]) || '';
          input.placeholder = 'Example for ' + opt + '...';
          input.focus();
        }
      }

      // Initialise from server-rendered data-map attributes and attach click listeners
      document.querySelectorAll('.admin-chips').forEach(function(chipsEl) {
        var fi = parseInt(chipsEl.id.replace('adminChips_', ''), 10);
        try { adminChipMaps[fi] = JSON.parse(chipsEl.getAttribute('data-map') || '{}'); }
        catch(e) { adminChipMaps[fi] = {}; }
        var firstChip = chipsEl.querySelector('.admin-chip');
        adminActiveChip[fi] = firstChip ? firstChip.getAttribute('data-opt') : null;
        // Attach click listeners to each chip
        chipsEl.querySelectorAll('.admin-chip').forEach(function(chip) {
          chip.addEventListener('click', function() { adminSelectChip(chip, fi); });
        });
      });

      function updateChipExample(fi) {
        var input = document.getElementById('optInput_' + fi);
        var opt = adminActiveChip[fi];
        if (opt && input) {
          if (!adminChipMaps[fi]) adminChipMaps[fi] = {};
          adminChipMaps[fi][opt] = input.value;
        }
        flushChipMap(fi);
      }

      function flushChipMap(fi) {
        var map = adminChipMaps[fi] || {};
        var clean = {};
        Object.keys(map).forEach(function(k) { if (map[k]) clean[k] = map[k]; });
        var hidden = document.getElementById('exVal_' + fi);
        if (hidden) hidden.value = Object.keys(clean).length ? JSON.stringify(clean) : '';
      }

      // On submit: flush the currently active chip's input for every field before sending
      form.addEventListener('submit', function() {
        Object.keys(adminActiveChip).forEach(function(fi) {
          updateChipExample(parseInt(fi, 10));
        });
      });

      // Field config: add new card
      var fieldRowCount = ${fields.length};

      function addFieldRow() {
        var list = document.getElementById('fieldConfigTable');
        var i = fieldRowCount++;

        var card = document.createElement('div');
        card.className = 'field-card';
        card.id = 'fieldCard_' + i;

        // Hidden field name
        var hiddenName = document.createElement('input');
        hiddenName.type = 'hidden';
        hiddenName.name = 'fields[' + i + '][fieldName]';
        card.appendChild(hiddenName);

        // Header row
        var header = document.createElement('div');
        header.className = 'field-card-header';
        var nameInp = document.createElement('input');
        nameInp.className = 'form-input';
        nameInp.type = 'text';
        nameInp.placeholder = 'field_name';
        nameInp.style.cssText = 'flex:1;max-width:260px;';
        nameInp.addEventListener('input', function() { hiddenName.value = nameInp.value; });
        var headerRight = document.createElement('div');
        headerRight.className = 'field-card-header-right';
        headerRight.innerHTML = '<label class="field-vis-label"><input type="checkbox" name="fields[' + i + '][visible]" value="1" checked style="accent-color:#343539;width:14px;height:14px;" /> Visible</label>'
          + '<div class="field-order-wrap"><span>Order</span><input class="form-input" type="number" name="fields[' + i + '][sortOrder]" value="' + i + '" style="width:52px;" /></div>';
        header.appendChild(nameInp);
        header.appendChild(headerRight);
        card.appendChild(header);

        // Types row
        var row1 = document.createElement('div');
        row1.className = 'field-card-row';

        var colDN = document.createElement('div'); colDN.className = 'field-card-col';
        colDN.innerHTML = '<label class="field-card-label">Display Name</label><input class="form-input" type="text" name="fields[' + i + '][displayName]" placeholder="Display Name" />';

        var colSF = document.createElement('div'); colSF.className = 'field-card-col';
        var sfLabel = document.createElement('label'); sfLabel.className = 'field-card-label'; sfLabel.textContent = 'SF Type';
        var sel = document.createElement('select');
        sel.className = 'form-select';
        sel.name = 'fields[' + i + '][sfFieldType]';
        sel.innerHTML = '${sfTypeOptions}';
        sel.onchange = function() { autoMapDynamics(sel, i); };
        colSF.appendChild(sfLabel); colSF.appendChild(sel);

        var colDyn = document.createElement('div'); colDyn.className = 'field-card-col';
        var dynLabel = document.createElement('label'); dynLabel.className = 'field-card-label'; dynLabel.textContent = 'Dynamics Type';
        var dynSel = document.createElement('select');
        dynSel.className = 'form-select';
        dynSel.name = 'fields[' + i + '][dynamicsFieldType]';
        dynSel.id = 'dynType_' + i;
        dynSel.innerHTML = '${dynTypeOptions}';
        colDyn.appendChild(dynLabel); colDyn.appendChild(dynSel);

        var colLen = document.createElement('div'); colLen.className = 'field-card-col-sm';
        colLen.innerHTML = '<label class="field-card-label">Length</label><input class="form-input" type="number" id="fieldLen_' + i + '" name="fields[' + i + '][fieldLength]" placeholder="—" style="width:80px;" />';

        var colEx = document.createElement('div'); colEx.className = 'field-card-col';
        var exLabel = document.createElement('label'); exLabel.className = 'field-card-label'; exLabel.textContent = 'Example';
        var hidden = document.createElement('input');
        hidden.type = 'hidden'; hidden.name = 'fields[' + i + '][exampleValue]'; hidden.id = 'exVal_' + i;
        var singleInp = document.createElement('input');
        singleInp.className = 'form-input'; singleInp.type = 'text';
        singleInp.id = 'singleInput_' + i; singleInp.placeholder = 'e.g. $12M';
        singleInp.oninput = function() { hidden.value = singleInp.value; };
        colEx.appendChild(exLabel); colEx.appendChild(hidden); colEx.appendChild(singleInp);

        row1.appendChild(colDN); row1.appendChild(colSF); row1.appendChild(colDyn);
        row1.appendChild(colLen); row1.appendChild(colEx);
        card.appendChild(row1);

        // Help text row
        var helpRow = document.createElement('div');
        helpRow.className = 'field-card-help-row';
        helpRow.innerHTML = '<label class="field-card-label">Help Text</label><input class="form-input" type="text" name="fields[' + i + '][helpText]" placeholder="e.g. Reference to parent account record — used for hierarchy linking" />';
        card.appendChild(helpRow);

        list.appendChild(card);
      }
    </script>
  `;

  return layout(`Review: ${submission.name}`, body);
}
