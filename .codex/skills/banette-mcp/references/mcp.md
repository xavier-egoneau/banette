# Banette MCP Reference

## Start command

```bash
npm run mcp
```

## Environment override

Use `BANETTE_API_BASE_URL` if Banette listens somewhere else than `http://127.0.0.1:3210`.

Use `BANETTE_LAUNCH_COMMAND` to force how Banette should be launched if the API is not reachable yet.
Use `BANETTE_APP_CWD` if that launch command needs a specific working directory.

## Example MCP client config

```json
{
  "mcpServers": {
    "banette": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/Users/xavieregoneau/projets/banette"
    }
  }
}
```

## Exposed tools

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

## Startup behavior

`banette_ensure_ready` first checks `GET /api/health`.

If Banette is not reachable, the MCP server tries these launch strategies in order:

1. `BANETTE_LAUNCH_COMMAND`
2. `open -a Banette` on macOS
3. `dist/mac/Banette.app` from the repo if available
4. `npm run dev` from the repo as a fallback
