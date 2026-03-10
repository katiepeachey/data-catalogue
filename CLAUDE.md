# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a static HTML catalogue of Kernel AI datapoints. It is a single-file frontend with no build step — just `index.html` and `kernel-logo.png`.

## Deployment

- **Hosting**: Render static site at https://data-catalogue.onrender.com
- **Repo**: https://github.com/katiepeachey/data-catalogue
- **Auto-deploy**: Render deploys automatically on pushes to `main`
- To trigger a manual deploy via API:
  ```bash
  curl -X POST "https://api.render.com/v1/services/srv-d6o7v7vgi27c73e97s6g/deploys" \
    -H "Authorization: Bearer <RENDER_API_KEY>" \
    -H "Content-Type: application/json" \
    -d '{"clearCache": "do_not_clear"}'
  ```

## Git & GitHub

- GitHub CLI is installed at `~/.local/bin/gh` (not in system PATH by default — open a new terminal or use full path)
- Authenticated as `katiepeachey`
- Active branch: `first-build`; production branch: `main`

## Tools

- **Render MCP**: Configured for the Kernel workspace (`tea-ch9pthd269v0obcaimr0`). Available via `mcp__render__*` tools.
- **GitHub CLI**: `~/.local/bin/gh`
