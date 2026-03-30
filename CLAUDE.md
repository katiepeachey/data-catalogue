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
  curl -X POST "https://api.render.com/v1/services/srv-d6o8ne450q8c73an0s30/deploys" \
    -H "Authorization: Bearer rnd_30NbytgzDIp4i6eMMnT2BiAH01XL" \
    -H "Content-Type: application/json" \
    -d '{"clearCache": "do_not_clear"}'
  ```

## Git & GitHub

- GitHub CLI is installed at `~/.local/bin/gh` (not in system PATH by default — open a new terminal or use full path)
- Authenticated as `katiepeachey`
- Production branch: `main`

**IMPORTANT**: Never commit or push code changes directly to `main`. Always create a new feature branch first, make changes there, then merge into `main` when ready.

## Tools

- **Render MCP**: Configured for the Kernel workspace (`tea-ch9pthd269v0obcaimr0`). Available via `mcp__render__*` tools.
- **GitHub CLI**: `~/.local/bin/gh`
