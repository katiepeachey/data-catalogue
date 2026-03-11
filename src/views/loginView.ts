import { escapeHtml } from './layout';

export function loginView(error?: string): string {
  const errorHtml = error
    ? `<div class="login-error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        ${escapeHtml(error)}
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Admin Login – Kernel</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f6f6;
      color: #343539;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .login-wrapper {
      width: 100%;
      max-width: 400px;
      padding: 24px;
    }

    .login-logo-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 32px;
      gap: 12px;
    }

    .login-logo {
      height: 40px;
      width: auto;
    }

    .login-logo-label {
      font-size: 11px;
      color: #a1a1a2;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-weight: 500;
    }

    .login-card {
      background: #fff;
      border-radius: 14px;
      border: 1px solid #eaebee;
      box-shadow: 0 2px 12px rgba(0,0,0,0.05);
      padding: 32px;
    }

    .login-heading {
      font-size: 18px;
      font-weight: 700;
      color: #343539;
      margin-bottom: 6px;
    }

    .login-sub {
      font-size: 13px;
      color: #a1a1a2;
      margin-bottom: 24px;
      line-height: 1.5;
    }

    .form-group { margin-bottom: 16px; }

    label.form-label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #343539;
      margin-bottom: 6px;
      letter-spacing: 0.02em;
    }

    .form-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #eaebee;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      background: #fff;
      color: #343539;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .form-input:focus {
      border-color: #b5c4b6;
      box-shadow: 0 0 0 3px rgba(152,165,156,0.15);
    }

    .btn-signin {
      width: 100%;
      padding: 11px 18px;
      background: #b5c4b6;
      color: #343539;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      margin-top: 4px;
      transition: opacity 0.15s;
    }
    .btn-signin:hover { opacity: 0.88; }

    .login-error {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fbeee8;
      border: 1px solid #f0b8a0;
      border-radius: 8px;
      padding: 11px 14px;
      margin-bottom: 18px;
      font-size: 13px;
      color: #a03a3a;
    }
    .login-error svg {
      width: 15px;
      height: 15px;
      flex-shrink: 0;
    }

    .login-footer {
      text-align: center;
      margin-top: 20px;
      font-size: 12px;
      color: #a1a1a2;
    }
    .login-footer a {
      color: #a1a1a2;
      text-decoration: none;
    }
    .login-footer a:hover { color: #98a59c; }
  </style>
</head>
<body>

<div class="login-wrapper">
  <div class="login-logo-wrap">
    <img src="/kernel-logo.png" class="login-logo" alt="Kernel" />
    <span class="login-logo-label">Admin Portal</span>
  </div>

  <div class="login-card">
    <h1 class="login-heading">Admin Access</h1>
    <p class="login-sub">Enter your password to access the datapoint review queue.</p>

    ${errorHtml}

    <form method="POST" action="/admin/login">
      <div class="form-group">
        <label class="form-label" for="password">Password</label>
        <input
          class="form-input"
          type="password"
          id="password"
          name="password"
          placeholder="Enter admin password"
          autocomplete="current-password"
          required
          autofocus
        />
      </div>
      <button type="submit" class="btn-signin">Sign In</button>
    </form>
  </div>

  <div class="login-footer">
    <a href="/">View public catalogue</a>
  </div>
</div>

</body>
</html>`;
}
