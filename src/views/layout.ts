export function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHtml(title)} – Kernel Admin</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f6f6;
      color: #343539;
      min-height: 100vh;
    }

    /* ── Navbar ── */
    .navbar {
      background: #fff;
      border-bottom: 1px solid #eaebee;
      padding: 0 28px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .navbar-brand { display: flex; align-items: center; gap: 16px; text-decoration: none; }
    .navbar-logo { height: 28px; width: auto; display: block; }
    .brand-divider { width: 1px; height: 20px; background: #eaebee; }
    .brand-sub { font-size: 11px; color: #a1a1a2; letter-spacing: 0.06em; text-transform: uppercase; }
    .navbar-actions { display: flex; align-items: center; gap: 16px; }
    .nav-link {
      font-size: 13px; color: #343539; text-decoration: none;
      display: flex; align-items: center; gap: 6px;
      cursor: pointer; transition: color 0.15s;
    }
    .nav-link:hover { color: #98a59c; }
    .nav-link svg { width: 15px; height: 15px; opacity: 0.6; }
    .btn-logout {
      background: none; border: 1px solid #eaebee; border-radius: 7px;
      padding: 7px 14px; font-size: 13px; color: #343539;
      cursor: pointer; display: flex; align-items: center; gap: 6px;
      font-family: inherit; transition: border-color 0.15s, color 0.15s;
    }
    .btn-logout:hover { border-color: #c8d5c9; color: #343539; }
    .btn-logout svg { width: 14px; height: 14px; opacity: 0.55; }

    /* ── Page body ── */
    .page-body { padding: 28px; }

    /* ── Flash message ── */
    .flash-msg {
      display: flex; align-items: center; gap: 10px;
      background: #f0f6f1; border: 1px solid #c8d5c9; border-radius: 8px;
      padding: 12px 16px; margin-bottom: 20px;
      font-size: 13px; color: #343539;
    }
    .flash-msg svg { width: 16px; height: 16px; flex-shrink: 0; color: #98a59c; }

    /* ── Card ── */
    .card {
      background: #fff; border-radius: 12px;
      border: 1px solid #eaebee; overflow: hidden;
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    }

    /* ── Stats row ── */
    .stats-row { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
    .stat-pill {
      background: #fff; border: 1px solid #eaebee; border-radius: 20px;
      padding: 6px 16px; font-size: 13px; font-weight: 500; color: #343539;
      display: flex; align-items: center; gap: 8px;
    }
    .stat-pill .count {
      background: #e2ede3; color: #343539; border-radius: 10px;
      padding: 1px 8px; font-size: 12px; font-weight: 700;
    }
    .stat-pill .count-orange { background: #fff3e8; color: #c06c1a; border-radius: 10px; padding: 1px 8px; font-size: 12px; font-weight: 700; }
    .stat-pill .count-red   { background: #fbeee8; color: #a03a3a; border-radius: 10px; padding: 1px 8px; font-size: 12px; font-weight: 700; }

    /* ── Buttons ── */
    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      border-radius: 8px; padding: 9px 18px;
      font-size: 13px; font-weight: 600; font-family: inherit;
      cursor: pointer; border: none; text-decoration: none;
      transition: opacity 0.15s, box-shadow 0.15s;
    }
    .btn:hover { opacity: 0.88; }
    .btn-primary { background: #b5c4b6; color: #343539; }
    .btn-danger  { background: #dc2626; color: #fff; }
    .btn-outline {
      background: #fff; color: #343539;
      border: 1px solid #eaebee;
    }
    .btn-outline:hover { border-color: #c8d5c9; color: #343539; }
    .btn-sm { padding: 6px 14px; font-size: 12px; border-radius: 7px; }

    /* ── Form elements ── */
    label.form-label {
      display: block; font-size: 12px; font-weight: 600;
      color: #343539; margin-bottom: 6px; letter-spacing: 0.02em;
    }
    .form-input, .form-select, .form-textarea {
      width: 100%; padding: 9px 12px;
      border: 1px solid #eaebee; border-radius: 8px;
      font-size: 13px; font-family: inherit;
      background: #fff; color: #343539; outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .form-input:focus, .form-select:focus, .form-textarea:focus {
      border-color: #b5c4b6;
      box-shadow: 0 0 0 3px rgba(152,165,156,0.15);
    }
    .form-textarea { resize: vertical; line-height: 1.55; }
    .form-group { margin-bottom: 18px; }

    /* ── Sub-label chips ── */
    .sub-labels { display: flex; flex-wrap: wrap; gap: 4px; }
    .sub-label {
      display: inline-flex; align-items: center;
      font-size: 10px; font-weight: 700;
      letter-spacing: 0.04em; text-transform: uppercase;
      border-radius: 20px; padding: 3px 9px;
      white-space: nowrap; line-height: 1.4;
    }
    .lbl-company-identity          { background: #f0f6f1; color: #343539; border: 1px solid #c8d5c9; }
    .lbl-location-geography        { background: #fff8e8; color: #8a5c00; border: 1px solid #f0d080; }
    .lbl-corporate-structure       { background: #f3eefb; color: #6a3fa0; border: 1px solid #d5c0ef; }
    .lbl-financial-profile         { background: #fff3e8; color: #c06c1a; border: 1px solid #f5c88a; }
    .lbl-technology-infrastructure { background: #eef2fc; color: #3a5fa0; border: 1px solid #b8c8ef; }
    .lbl-sales-marketing           { background: #fbeef8; color: #8a2d7a; border: 1px solid #e8b0d8; }
    .lbl-workforce-people          { background: #f0f6f1; color: #343539; border: 1px solid #c8d5c9; }
    .lbl-hiring-talent             { background: #fbeee8; color: #a03a3a; border: 1px solid #f0b8a0; }
    .lbl-customer-support          { background: #edf4ff; color: #2a5faa; border: 1px solid #b8d0f5; }
    .lbl-compliance-risk           { background: #fdf4e8; color: #9a5a10; border: 1px solid #f0cc90; }
    .lbl-ecommerce-retail          { background: #f0f8ff; color: #2a6a9a; border: 1px solid #a8d0ef; }
    .lbl-operations                { background: #f5f5f5; color: #555;    border: 1px solid #d8d8d8; }
    .lbl-industry-market           { background: #fff0f5; color: #a03060; border: 1px solid #f0b8cc; }

    /* ── Source badges ── */
    .source-badge {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 11.5px; font-weight: 600; border-radius: 6px;
      padding: 3px 9px; white-space: nowrap;
    }
    .source-kernel   { background: #f0f6f1; color: #343539; border: 1px solid #c8d5c9; }
    .source-linkedin { background: #eaf2fc; color: #0a66c2; border: 1px solid #b3d0ef; }
    .source-badge svg { width: 11px; height: 11px; flex-shrink: 0; }

    /* ── Field tag ── */
    .field-tag {
      display: inline-block; font-size: 12px; color: #343539;
      background: #f0f6f1; border: 1px solid #c8d5c9;
      border-radius: 4px; padding: 2px 7px;
    }

    /* ── Status badges ── */
    .status-badge {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 11.5px; font-weight: 700; border-radius: 20px;
      padding: 3px 10px; white-space: nowrap; letter-spacing: 0.03em;
    }
    .status-pending  { background: #fff3e8; color: #c06c1a; border: 1px solid #f5c88a; }
    .status-approved { background: #f0f6f1; color: #343539; border: 1px solid #c8d5c9; }
    .status-rejected { background: #fbeee8; color: #a03a3a; border: 1px solid #f0b8a0; }

    /* ── Page header ── */
    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 20px;
    }
    .page-title {
      font-size: 20px; font-weight: 700; color: #343539;
      display: flex; align-items: center; gap: 10px;
    }
    .page-title .badge {
      background: #e2ede3; color: #343539;
      border-radius: 10px; padding: 2px 10px;
      font-size: 13px; font-weight: 700;
    }
  </style>
</head>
<body>

<nav class="navbar">
  <a class="navbar-brand" href="/">
    <img src="/kernel-logo.png" class="navbar-logo" alt="Kernel" />
    <div class="brand-divider"></div>
    <span class="brand-sub">Admin</span>
  </a>
  <div class="navbar-actions">
    <a class="nav-link" href="/">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M9 9h6M9 12h6M9 15h4"/>
      </svg>
      View Catalogue
    </a>
    <a class="nav-link" href="/admin/queue">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
      Review Queue
    </a>
    <form method="POST" action="/admin/logout" style="margin:0;">
      <button type="submit" class="btn-logout">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Sign Out
      </button>
    </form>
  </div>
</nav>

<div class="page-body">
${body}
</div>

</body>
</html>`;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
