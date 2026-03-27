---
name: banette-api
description: Use when the user wants an AI to create, update, delete, or inspect Banette notes and todos through the app's local HTTP API. Applies to local automation, agent actions, and scripted manipulation of Banette data.
---

# Banette API Skill

Use this skill when you need to manipulate the Banette desktop app data without touching Markdown files directly.

## What this skill controls

- Notes CRUD through the local HTTP API
- Todos CRUD through the local HTTP API
- API health checks before acting

## Workflow

1. Confirm the Banette app is running.
2. Check `GET /api/health` on `http://127.0.0.1:3210` unless the user provided another port.
3. Use the HTTP API for create, update, delete, or read operations.
4. Prefer reading the current item before a destructive update when the request is ambiguous.
5. Do not edit Markdown files directly unless the user explicitly asks for file-level work.

## Routes

- `GET /api/health`
- `GET /api/info`
- `GET /api/notes`
- `POST /api/notes`
- `GET /api/notes/:id`
- `PATCH /api/notes/:id`
- `DELETE /api/notes/:id`
- `GET /api/todos`
- `POST /api/todos`
- `GET /api/todos/:id`
- `PATCH /api/todos/:id`
- `DELETE /api/todos/:id`

## Payloads

- Notes accept: `title`, `content`, `tags`, `pinned`
- Todos accept: `title`, `content`, `priority`, `completed`, `tags`, `pinned`
- Valid `priority`: `haute`, `normale`, `basse`

## Response shape

- Success responses return `{ "data": ... }`
- Errors return `{ "error": "..." }`
- Successful deletes return HTTP `204`

## When you need details

Read `.codex/skills/banette-api/references/api.md` for examples and exact request bodies.
