import { SubmissionStatus } from '../types';
import { SubmissionWithMeta } from '../db/datapoints';
import { layout, escapeHtml } from './layout';

const LABEL_DISPLAY: Record<string, string> = {
  'company-identity': 'Entity Identity',
  'location-geography': 'Location &amp; Geography',
  'corporate-structure': 'Corporate Structure',
  'financial-profile': 'Financial Profile',
  'technology-infrastructure': 'Technology &amp; Infrastructure',
  'sales-marketing': 'Sales &amp; Marketing',
  'workforce-people': 'Workforce &amp; People',
  'hiring-talent': 'Hiring &amp; Talent',
  'customer-support': 'Customer Support',
  'compliance-risk': 'Compliance &amp; Risk',
  'ecommerce-retail': 'E-commerce &amp; Retail',
  'operations': 'Operations',
  'industry-market': 'Industry &amp; Market',
};

function statusBadge(status: SubmissionStatus): string {
  if (status === 'pending') {
    return `<span class="status-badge status-pending">
      <svg width="7" height="7" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3.5" fill="currentColor"/></svg>
      Pending
    </span>`;
  }
  if (status === 'approved') {
    return `<span class="status-badge status-approved">
      <svg width="7" height="7" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3.5" fill="currentColor"/></svg>
      Approved
    </span>`;
  }
  return `<span class="status-badge status-rejected">
    <svg width="7" height="7" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3.5" fill="currentColor"/></svg>
    Rejected
  </span>`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

export function queueView(submissions: SubmissionWithMeta[], flashMsg?: string): string {
  const pending  = submissions.filter((s) => s.status === 'pending').length;
  const approved = submissions.filter((s) => s.status === 'approved').length;
  const rejected = submissions.filter((s) => s.status === 'rejected').length;

  const flash = flashMsg
    ? `<div class="flash-msg">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        ${escapeHtml(decodeURIComponent(flashMsg))}
      </div>`
    : '';

  const rowsHtml = submissions.length === 0
    ? `<tr><td colspan="7" class="empty-cell">No submissions yet.</td></tr>`
    : submissions.map((s) => {
        const labelChips = s.labels
          .map(
            (l) =>
              `<span class="sub-label lbl-${l}">${LABEL_DISPLAY[l] || l}</span>`
          )
          .join('');

        const reviewBtn =
          s.status === 'pending'
            ? `<a href="/admin/review/${escapeHtml(s.id)}" class="btn btn-primary btn-sm">Review</a>`
            : `<a href="/admin/review/${escapeHtml(s.id)}" class="btn btn-outline btn-sm">View</a>`;

        const visToggle = s.status === 'approved'
          ? `<label class="toggle-switch">
              <input type="checkbox" ${s.visible ? 'checked' : ''}
                onchange="toggleVis('${escapeHtml(s.id)}', this.checked)" />
              <span class="toggle-slider"></span>
            </label>`
          : `<span style="color:#ccc;font-size:11px;">&mdash;</span>`;

        return `<tr class="data-row"
          data-name="${escapeHtml(s.name.toLowerCase())}"
          data-category="${escapeHtml(s.category)}"
          data-labels="${escapeHtml(s.labels.join(','))}"
          data-status="${s.status}">
          <td>
            <div class="dp-name">${escapeHtml(s.name)}</div>
            <div class="dp-cat">${escapeHtml(s.category)}</div>
          </td>
          <td>
            <span class="cat-chip cat-${s.category.toLowerCase().replace(/\s+/g, '-')}">${escapeHtml(s.category)}</span>
          </td>
          <td><div class="sub-labels">${labelChips}</div></td>
          <td class="date-cell">${formatDate(s.submittedAt)}</td>
          <td>${statusBadge(s.status)}</td>
          <td style="text-align:center;">${visToggle}</td>
          <td>${reviewBtn}</td>
        </tr>`;
      }).join('\n');

  const body = `
    ${flash}

    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;">
      <h1 class="page-title">
        Review Queue
        ${pending > 0 ? `<span class="badge">${pending} pending</span>` : ''}
      </h1>
      <div style="display:flex;gap:8px;align-items:center;">
        <a href="/admin/new" class="btn btn-primary btn-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Datapoint
        </a>
        <a href="/admin/helptext" class="btn btn-outline btn-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          Set Helptext
        </a>
        <a href="/admin/sync-config" class="btn btn-outline btn-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;">
            <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
          </svg>
          Sync Config
        </a>
        <form method="POST" action="/admin/sync" style="margin:0;">
          <button type="submit" class="btn btn-outline btn-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Sync from MotherDuck
          </button>
        </form>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-pill">Pending <span class="count-orange">${pending}</span></div>
      <div class="stat-pill">Approved <span class="count">${approved}</span></div>
      <div class="stat-pill">Rejected <span class="count-red">${rejected}</span></div>
      <div class="stat-pill">Total <span class="count">${submissions.length}</span></div>
    </div>

    <div class="queue-filters">
      <div class="search-wrap" style="position:relative;flex:1;min-width:180px;max-width:280px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);width:14px;height:14px;color:#aaa;pointer-events:none;">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input id="qSearch" type="text" placeholder="Search datapoints…"
          oninput="filterQueue()"
          style="width:100%;padding:8px 10px 8px 32px;border:1px solid #eaeeea;border-radius:8px;font-size:13px;outline:none;" />
      </div>
      <select id="qCategory" onchange="filterQueue()" style="padding:8px 12px;border:1px solid #eaeeea;border-radius:8px;font-size:13px;background:#fff;outline:none;cursor:pointer;">
        <option value="">All Categories</option>
        <option value="Entity Data">Entity Data</option>
        <option value="Firmographics">Firmographics</option>
        <option value="Technographics">Technographics</option>
        <option value="People Metrics">People Metrics</option>
        <option value="Hiring Signals">Hiring Signals</option>
        <option value="Custom Enrichment">Custom Enrichment</option>
      </select>
      <select id="qLabel" onchange="filterQueue()" style="padding:8px 12px;border:1px solid #eaeeea;border-radius:8px;font-size:13px;background:#fff;outline:none;cursor:pointer;">
        <option value="">All Labels</option>
        <option value="company-identity">Entity Identity</option>
        <option value="location-geography">Location &amp; Geography</option>
        <option value="corporate-structure">Corporate Structure</option>
        <option value="financial-profile">Financial Profile</option>
        <option value="technology-infrastructure">Technology &amp; Infrastructure</option>
        <option value="sales-marketing">Sales &amp; Marketing</option>
        <option value="workforce-people">Workforce &amp; People</option>
        <option value="hiring-talent">Hiring &amp; Talent</option>
        <option value="customer-support">Customer Support</option>
        <option value="compliance-risk">Compliance &amp; Risk</option>
        <option value="ecommerce-retail">E-commerce &amp; Retail</option>
        <option value="operations">Operations</option>
        <option value="industry-market">Industry &amp; Market</option>
      </select>
      <select id="qStatus" onchange="filterQueue()" style="padding:8px 12px;border:1px solid #eaeeea;border-radius:8px;font-size:13px;background:#fff;outline:none;cursor:pointer;">
        <option value="">All Statuses</option>
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
      </select>
    </div>

    <div class="card">
      <div class="table-scroll">
        <table>
          <colgroup>
            <col style="width:20%"/>
            <col style="width:12%"/>
            <col style="width:22%"/>
            <col style="width:10%"/>
            <col style="width:10%"/>
            <col style="width:10%"/>
            <col style="width:10%"/>
          </colgroup>
          <thead>
            <tr>
              <th>Datapoint</th>
              <th>Category</th>
              <th>Labels</th>
              <th>Submitted</th>
              <th>Status</th>
              <th>Visible</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>

    <style>
      .queue-filters { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
      .table-scroll { overflow-x: auto; }
      table { width: 100%; border-collapse: collapse; }
      thead th {
        background: #fff; color: #999; font-size: 11px; font-weight: 600;
        letter-spacing: 0.08em; text-transform: uppercase;
        padding: 14px 16px; text-align: left;
        border-bottom: 1px solid #eaeeea; white-space: nowrap;
      }
      .data-row td {
        padding: 14px 16px; vertical-align: middle;
        border-bottom: 1px solid #f0f2f0; font-size: 13px;
      }
      .data-row:last-child td { border-bottom: none; }
      .data-row:hover td { background: #fafcfa; }
      .dp-name { font-weight: 600; color: #1a1a1a; font-size: 13px; }
      .dp-cat  { font-size: 11.5px; color: #999; margin-top: 2px; }
      .date-cell { font-size: 12px; color: #aaa; white-space: nowrap; }
      .empty-cell {
        text-align: center; padding: 60px 20px;
        color: #bbb; font-size: 14px;
      }
      .cat-chip {
        display: inline-flex; align-items: center;
        font-size: 11.5px; font-weight: 600; border-radius: 6px; padding: 3px 9px;
      }
      .cat-entity-data       { background: #e8f5ee; color: #2d7a4f; border: 1px solid #c0dfc9; }
      .cat-firmographics     { background: #fff3e8; color: #c06c1a; border: 1px solid #f5c88a; }
      .cat-technographics    { background: #eef2fc; color: #3a5fa0; border: 1px solid #b8c8ef; }
      .cat-people-metrics    { background: #f3eefb; color: #6a3fa0; border: 1px solid #d5c0ef; }
      .cat-hiring-signals    { background: #fbeee8; color: #a03a3a; border: 1px solid #f0b8a0; }
      .cat-custom-enrichment { background: #eaf6fb; color: #2a7a9a; border: 1px solid #a8d8ef; }

      .toggle-switch { position: relative; display: inline-block; width: 36px; height: 20px; }
      .toggle-switch input { opacity: 0; width: 0; height: 0; }
      .toggle-slider {
        position: absolute; cursor: pointer; inset: 0;
        background: #ddd; border-radius: 20px;
        transition: background 0.2s;
      }
      .toggle-slider::before {
        content: ''; position: absolute; width: 16px; height: 16px;
        left: 2px; bottom: 2px; background: #fff;
        border-radius: 50%; transition: transform 0.2s;
      }
      .toggle-switch input:checked + .toggle-slider { background: #8fb49a; }
      .toggle-switch input:checked + .toggle-slider::before { transform: translateX(16px); }
    </style>

    <script>
      function filterQueue() {
        var q = document.getElementById('qSearch').value.toLowerCase().trim();
        var cat = document.getElementById('qCategory').value;
        var label = document.getElementById('qLabel').value;
        var status = document.getElementById('qStatus').value;
        var rows = document.querySelectorAll('tr.data-row');
        rows.forEach(function(row) {
          var name = row.getAttribute('data-name') || '';
          var rowCat = row.getAttribute('data-category') || '';
          var rowLabels = row.getAttribute('data-labels') || '';
          var rowStatus = row.getAttribute('data-status') || '';
          var show = true;
          if (q && name.indexOf(q) === -1) show = false;
          if (cat && rowCat !== cat) show = false;
          if (label && rowLabels.split(',').indexOf(label) === -1) show = false;
          if (status && rowStatus !== status) show = false;
          row.style.display = show ? '' : 'none';
        });
      }

      function toggleVis(id, visible) {
        fetch('/admin/datapoints/' + id + '/visibility', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visible: visible })
        }).then(function(r) {
          if (!r.ok) console.error('Failed to toggle visibility');
        }).catch(function(err) { console.error('Toggle error:', err); });
      }
    </script>
  `;

  return layout('Review Queue', body);
}
