import { layout, escapeHtml } from './layout';

export interface FlowEntry {
  id: number;
  flow_id: number;
  label: string | null;
  added_at: string;
}

export function syncConfigView(flows: FlowEntry[], msg?: string): string {
  const rows = flows.map((f) => `
    <tr>
      <td><code style="font-size:12px;">${f.flow_id}</code></td>
      <td style="font-size:12px;color:#555;">${escapeHtml(f.label || '—')}</td>
      <td style="font-size:11px;color:#aaa;">${escapeHtml(f.added_at)}</td>
      <td style="text-align:center;">
        <form method="POST" action="/admin/sync-config/remove" style="margin:0;">
          <input type="hidden" name="id" value="${f.id}" />
          <button type="submit" class="btn btn-outline btn-sm"
            style="padding:3px 10px;font-size:11px;color:#a03a3a;border-color:#f0b8a0;">
            Remove
          </button>
        </form>
      </td>
    </tr>`).join('');

  const body = `
    <div style="max-width:720px;">
      <div class="page-header">
        <h1 class="page-title">Sync Config</h1>
      </div>

      ${msg ? `<div class="flash-msg">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>${escapeHtml(msg)}</div>` : ''}

      <!-- Flow whitelist -->
      <div class="card" style="padding:0;margin-bottom:20px;">
        <div style="padding:16px 20px 12px;border-bottom:1px solid #eaeeea;">
          <h2 style="font-size:14px;font-weight:700;color:#1a1a1a;">Flow Whitelist</h2>
          <p style="font-size:12px;color:#999;margin-top:3px;">
            Flows tagged "Data Catalogue" in the portal — add their ID or paste the URL path
            (e.g. <code>workflows/44575</code> or just <code>44575</code>).
            Control agents with type&nbsp;135 are picked up automatically.
          </p>
        </div>

        <form method="POST" action="/admin/sync-config/add"
          style="display:flex;gap:10px;align-items:flex-end;padding:14px 20px;border-bottom:1px solid #eaeeea;">
          <div style="flex:1;">
            <label class="form-label" for="flowInput" style="margin-bottom:5px;">Add Flow</label>
            <input class="form-input" type="text" id="flowInput" name="flowInput"
              placeholder="workflows/44575  or  44575"
              style="font-size:13px;" />
          </div>
          <div style="flex:1;">
            <label class="form-label" for="label" style="margin-bottom:5px;">Label (optional)</label>
            <input class="form-input" type="text" id="label" name="label"
              placeholder="e.g. Company Profile v2"
              style="font-size:13px;" />
          </div>
          <button type="submit" class="btn btn-primary" style="flex-shrink:0;">Add</button>
        </form>

        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f5f6f6;">
              <th style="padding:8px 20px;text-align:left;font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #eaeeea;">Flow ID</th>
              <th style="padding:8px 20px;text-align:left;font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #eaeeea;">Label</th>
              <th style="padding:8px 20px;text-align:left;font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #eaeeea;">Added</th>
              <th style="border-bottom:1px solid #eaeeea;"></th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="4" style="padding:20px;text-align:center;font-size:12px;color:#ccc;">No flows added yet</td></tr>`}
          </tbody>
        </table>
      </div>

      <div style="display:flex;gap:10px;">
        <form method="POST" action="/admin/sync">
          <button type="submit" class="btn btn-primary">Run Sync Now</button>
        </form>
        <a href="/admin/queue" class="btn btn-outline">Back to Queue</a>
      </div>
    </div>`;

  return layout('Sync Config', body);
}
