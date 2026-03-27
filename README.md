# Banette

Application de bureau pour gérer des **notes** et des **todos**, avec un éditeur WYSIWYG et un stockage local en Markdown.

---

## Fonctionnalités

### Notes & Todos
- Création, édition et suppression
- Éditeur de texte enrichi (WYSIWYG) — **gras**, *italique*, ~~barré~~, titres H1/H2, listes, blocs de code avec coloration syntaxique, citations, listes de tâches
- Auto-save 800 ms — indicateur "Enregistrement…" / "Sauvegardé"
- **Todos** : priorité haute / normale / basse, marquage complété/en cours

### Organisation
- **Tags** : ajout de tags par chips (Enter ou virgule), filtre par tag dans la liste
- **Épingler** : épingler une note ou todo pour la garder en tête de liste
- **Tri** : manuel (drag & drop), par date de modification, par priorité (todos)
- **Recherche full-text** : cherche dans le titre et dans le contenu

### Interface
- Sidebar navigation **Todos** / **Notes**
- Raccourci `Ctrl+N` pour créer, `Suppr` / `Backspace` pour supprimer l'item sélectionné
- **Raccourci global `Cmd+Shift+B`** (ou `Ctrl+Shift+B`) pour ouvrir Banette depuis n'importe quelle app
- **Mode aperçu** : bascule l'éditeur en lecture seule (bouton 👁 / ✏️)
- **Export .md** : exporte la note courante vers un fichier Markdown via boîte de dialogue système
- Icône tray — l'app se minimise dans la barre système au lieu de se fermer
- Fenêtre sans bordure, esthétique bloc-notes (fond jaune, lignes de papier)

### Stockage
- Fichiers locaux dans `Documents/Banette/` — aucune donnée envoyée sur internet
- Format : Markdown avec frontmatter YAML
- API HTTP locale en lecture/écriture sur `127.0.0.1:3210` pour automatisation par une IA ou des scripts

```markdown
---
id: 3f2a1b...
title: Ma première note
created: 2025-01-15T10:00:00.000Z
updated: 2025-01-15T10:05:00.000Z
tags: [travail, idées]
pinned: false
---

Contenu de la note en **Markdown**.
```

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Runtime desktop | Electron 41 |
| Bundler | electron-vite |
| Frontend | React 18 + TypeScript |
| Styles | TailwindCSS v3 |
| Éditeur | TipTap 2 + tiptap-markdown |
| Coloration syntaxique | lowlight + highlight.js |
| Drag & drop | @dnd-kit |
| Icônes | FontAwesome 6 |
| Parsing Markdown | gray-matter |
| IPC | contextBridge Electron |
| API locale | HTTP Node.js sur `127.0.0.1` |

---

## Installation & développement

### Prérequis

- [Node.js](https://nodejs.org/) v18 ou supérieur
- npm v9 ou supérieur

### Cloner et installer

```bash
git clone <url-du-repo>
cd banette
npm install
```

### Lancer en mode développement

```bash
npm run dev
```

Lance l'application Electron avec hot-reload via electron-vite.

L’API locale démarre automatiquement avec l’application sur `http://127.0.0.1:3210`.
Le port peut être surchargé via la variable d’environnement `BANETTE_API_PORT`.

### Build de production

```bash
npm run build
```

Compile les sources dans `out/`.

### Lancer le serveur MCP

```bash
npm run mcp
```

Ce serveur MCP fonctionne en `stdio` et est destiné à être lancé par un client compatible MCP, pas à rester exposé sur un port.

### Packager l'installateur

```bash
npm run package
```

Génère un installateur dans `dist/`.

---

## Structure du projet

```
banette/
├── electron/
│   ├── main.ts          # Process principal (fenêtre, tray, IPC, raccourci global)
│   ├── preload.ts       # Bridge sécurisé renderer ↔ main (contextBridge)
│   └── fileSystem.ts    # Lecture/écriture des fichiers Markdown
├── src/
│   ├── components/
│   │   ├── Sidebar.tsx           # Navigation Todos / Notes
│   │   ├── ItemList.tsx          # Liste avec recherche, tri, filtre par tag
│   │   ├── ItemDetail.tsx        # Vue détail : éditeur, tags, pin, aperçu, export
│   │   ├── Editor.tsx            # Éditeur TipTap + toolbar
│   │   ├── CodeBlockComponent.tsx# Bloc de code avec sélecteur de langage
│   │   ├── SortableItem.tsx      # Item de liste draggable (pin, tags, priorité)
│   │   ├── SearchBar.tsx         # Barre de recherche
│   │   └── DeleteModal.tsx       # Modale de confirmation suppression
│   ├── hooks/
│   │   └── useAutoSave.ts        # Hook debounce 800ms pour l'auto-save
│   ├── types/
│   │   ├── index.ts              # Types Note, Todo, Priority…
│   │   └── electron.d.ts         # Déclaration window.electron pour TypeScript
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css                 # Styles ProseMirror + effet lignes de papier
├── electron.vite.config.ts
├── electron-builder.yml
├── tailwind.config.js
└── package.json
```

---

## Données utilisateur

```
Documents/Banette/
├── notes/
│   ├── <uuid>.md
│   └── ...
└── todos/
    ├── <uuid>.md
    └── ...
```

Fichiers Markdown standard, lisibles et modifiables avec n'importe quel éditeur de texte.

---

## API locale

L’application expose une API HTTP locale pensée pour l’automatisation. Elle est accessible uniquement en local sur `127.0.0.1`.

### Santé et infos

- `GET /api/health`
- `GET /api/info`

Exemple :

```bash
curl http://127.0.0.1:3210/api/health
```

### Notes

- `GET /api/notes`
- `POST /api/notes`
- `GET /api/notes/:id`
- `PATCH /api/notes/:id`
- `DELETE /api/notes/:id`

Créer une note :

```bash
curl -X POST http://127.0.0.1:3210/api/notes \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Idées sprint",
    "content": "- préparer la démo",
    "tags": ["travail", "sprint"],
    "pinned": true
  }'
```

Modifier une note :

```bash
curl -X PATCH http://127.0.0.1:3210/api/notes/<id> \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Idées sprint v2",
    "content": "- préparer la démo\n- écrire le changelog"
  }'
```

### Todos

- `GET /api/todos`
- `POST /api/todos`
- `GET /api/todos/:id`
- `PATCH /api/todos/:id`
- `DELETE /api/todos/:id`

Créer une todo :

```bash
curl -X POST http://127.0.0.1:3210/api/todos \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Finaliser la release",
    "content": "Vérifier la checklist",
    "priority": "haute",
    "completed": false,
    "tags": ["release"]
  }'
```

Modifier une todo :

```bash
curl -X PATCH http://127.0.0.1:3210/api/todos/<id> \
  -H "Content-Type: application/json" \
  -d '{
    "completed": true,
    "priority": "basse"
  }'
```

### Formats JSON

Les réponses de lecture utilisent le format :

```json
{
  "data": {}
}
```

Les erreurs utilisent le format :

```json
{
  "error": "Message"
}
```

### Champs acceptés

- Note : `title`, `content`, `tags`, `pinned`
- Todo : `title`, `content`, `priority`, `completed`, `tags`, `pinned`
- Priorités valides : `haute`, `normale`, `basse`

---

## MCP local

Un serveur MCP local est fourni pour permettre à un client compatible MCP de piloter Banette sans accès direct au système de fichiers.

### Outil fourni

- Commande : `npm run mcp`
- Mode : `stdio`
- Dépendance : nécessite que Banette soit ouverte pour que l’API locale `http://127.0.0.1:3210` réponde

### Outils MCP exposés

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

### Exemple de configuration MCP

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

Si tu utilises un autre port pour l’API Banette, ajoute `BANETTE_API_BASE_URL` côté client MCP.

### Lancement automatique de l’app

Le serveur MCP peut tenter de lancer Banette si l’API locale ne répond pas encore.

Ordre de tentative :

- `BANETTE_LAUNCH_COMMAND` si fourni
- `open -a Banette` sur macOS
- `dist/mac/Banette.app` si présent dans le repo
- `npm run dev` comme fallback depuis le repo

Variables utiles :

- `BANETTE_API_BASE_URL`
- `BANETTE_LAUNCH_COMMAND`
- `BANETTE_APP_CWD`

Exemple de config MCP avec lancement explicite :

```json
{
  "mcpServers": {
    "banette": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/Users/xavieregoneau/projets/banette",
      "env": {
        "BANETTE_LAUNCH_COMMAND": "open -a Banette"
      }
    }
  }
}
```
