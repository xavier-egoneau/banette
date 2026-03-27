# Banette Local API Reference

Base URL by default: `http://127.0.0.1:3210`

If the app was started with `BANETTE_API_PORT`, use that port instead.

## Health

```bash
curl http://127.0.0.1:3210/api/health
```

Example response:

```json
{
  "data": {
    "status": "ok",
    "api": {
      "enabled": true,
      "host": "127.0.0.1",
      "port": 3210,
      "baseUrl": "http://127.0.0.1:3210",
      "storagePath": "/Users/.../Documents/Banette"
    }
  }
}
```

## List notes

```bash
curl http://127.0.0.1:3210/api/notes
```

## Create note

```bash
curl -X POST http://127.0.0.1:3210/api/notes \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Nouvelle note",
    "content": "Contenu Markdown",
    "tags": ["perso"],
    "pinned": false
  }'
```

## Update note

```bash
curl -X PATCH http://127.0.0.1:3210/api/notes/<id> \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Titre modifié",
    "content": "Contenu modifié",
    "tags": ["perso", "archive"],
    "pinned": true
  }'
```

## Delete note

```bash
curl -X DELETE http://127.0.0.1:3210/api/notes/<id>
```

## List todos

```bash
curl http://127.0.0.1:3210/api/todos
```

## Create todo

```bash
curl -X POST http://127.0.0.1:3210/api/todos \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Nouvelle todo",
    "content": "Contenu Markdown",
    "priority": "normale",
    "completed": false,
    "tags": ["travail"],
    "pinned": false
  }'
```

## Update todo

```bash
curl -X PATCH http://127.0.0.1:3210/api/todos/<id> \
  -H "Content-Type: application/json" \
  -d '{
    "completed": true,
    "priority": "haute"
  }'
```

## Delete todo

```bash
curl -X DELETE http://127.0.0.1:3210/api/todos/<id>
```

## Notes for agents

- Read before deleting if the user names an item loosely and several records may match.
- Keep `tags` as an array of strings.
- Prefer partial `PATCH` payloads instead of rewriting every field.
- Avoid direct filesystem edits unless explicitly requested.
