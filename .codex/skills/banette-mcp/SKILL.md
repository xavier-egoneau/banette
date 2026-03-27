---
name: banette-mcp
description: Use when Banette must be controlled from an MCP-compatible client such as a desktop AI app. Covers the local stdio MCP server that proxies Banette notes and todos operations to the local Banette API.
---

# Banette MCP Skill

Use this skill when the user wants Banette to be available to an MCP-compatible AI client.

## What this skill does

- Launches or references the Banette MCP server in `stdio`
- Uses Banette tools through MCP instead of direct file edits
- Relies on the Banette local API already exposed by the desktop app

## Workflow

1. Ensure the Banette desktop app is running.
2. Configure the MCP client to launch `npm run mcp` from the project root.
3. Use `banette_ensure_ready` before note or todo operations when the app may not already be open.
4. Use the exposed MCP tools for note and todo operations.
5. If the API is not on the default port, set `BANETTE_API_BASE_URL`.

## MCP tools

- `banette_health`
- `banette_ensure_ready`
- `list_notes`
- `create_note`
- `update_note`
- `delete_note`
- `list_todos`
- `create_todo`
- `update_todo`
- `delete_todo`

## Important constraints

- The MCP server is `stdio`, not an always-on HTTP service.
- Banette itself still needs to be open so its local API is reachable.
- The MCP server can try to launch Banette automatically via `BANETTE_LAUNCH_COMMAND`, `open -a Banette`, a local `.app`, or `npm run dev`.
- Prefer MCP tools over editing Markdown files directly.

## When you need details

Read `.codex/skills/banette-mcp/references/mcp.md`.
