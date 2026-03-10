import { Submission, SubmissionStatus } from '../types';
import { layout, escapeHtml } from './layout';

const LABEL_DISPLAY: Record<string, string> = {
  'company-identity': 'Company Identity',
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

export function queueView(submissions: Submission[], flashMsg?: string): string {
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
    ? `<tr><td colspan="6" class="empty-cell">No submissions yet.</td></tr>`
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

        return `<tr class="data-row">
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
          <td>${reviewBtn}</td>
        </tr>`;
      }).join('\n');

  const body = `
    ${flash}

    <div class="page-header">
      <h1 class="page-title">
        Review Queue
        ${pending > 0 ? `<span class="badge">${pending} pending</span>` : ''}
      </h1>
    </div>

    <div class="stats-row">
      <div class="stat-pill">Pending <span class="count-orange">${pending}</span></div>
      <div class="stat-pill">Approved <span class="count">${approved}</span></div>
      <div class="stat-pill">Rejected <span class="count-red">${rejected}</span></div>
      <div class="stat-pill">Total <span class="count">${submissions.length}</span></div>
    </div>

    <div class="card">
      <div class="table-scroll">
        <table>
          <colgroup>
            <col style="width:22%"/>
            <col style="width:14%"/>
            <col style="width:28%"/>
            <col style="width:12%"/>
            <col style="width:12%"/>
            <col style="width:12%"/>
          </colgroup>
          <thead>
            <tr>
              <th>Datapoint</th>
              <th>Category</th>
              <th>Labels</th>
              <th>Submitted</th>
              <th>Status</th>
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
    </style>
  `;

  return layout('Review Queue', body);
}
