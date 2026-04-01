# Banette

Application de bureau pour gérer des **notes**, des **todos** et des **projets timer**, avec stockage local en Markdown, éditeur riche pour les contenus texte et API HTTP locale pour l'automatisation.

---

## Installation rapide

### Prérequis

- [Node.js](https://nodejs.org/) v18 ou supérieur
- npm v9 ou supérieur

### Installer les dépendances

```bash
npm install
```

### Lancer l'app en développement

```bash
npm run dev
```

### Packager l'application

```bash
npm run package
```

Les artefacts sont générés dans `dist/`.

---

## Fonctionnalités

### Notes & Todos

- Création, édition et suppression
- Éditeur WYSIWYG pour les notes et todos: **gras**, *italique*, ~~barré~~, titres H1/H2, listes, citations, listes de tâches, blocs de code avec coloration syntaxique
- Auto-save avec debounce de 800 ms et indicateur d'état
- Todos avec priorité `haute` / `normale` / `basse` et statut terminé / en cours
- Export Markdown de la note courante
- Import de fichiers `.md` dans les sections notes et todos

### Timers

- Section dédiée `Timers` dans la sidebar
- Création de projets timer
- Démarrage / arrêt d'un chrono par projet
- Enregistrement automatique des sessions passées
- Édition manuelle des heures et minutes de chaque session
- Suppression d'une session individuelle
- Total cumulé par projet
- Tags, épinglage, recherche et tri manuel / par date comme sur les autres items

### Organisation

- Tags avec saisie rapide par `Enter` ou virgule
- Filtre par tag dans la liste
- Recherche plein texte sur le titre et le contenu
- Épinglage des items importants
- Tri manuel par drag & drop
- Tri par date de modification
- Tri par priorité pour les todos

### Interface

- Navigation latérale `Todos` / `Notes` / `Timers`
- Raccourci `Ctrl+N` / `Cmd+N` pour créer un item dans la section courante
- `Suppr` / `Backspace` pour supprimer l'item sélectionné
- Raccourci global `Ctrl+Shift+B` / `Cmd+Shift+B` pour rouvrir Banette
- Mode aperçu pour les notes et todos
- Fenêtre sans bordure avec minimisation en tray
- Mode sombre
- Panneau de paramètres pour le dossier de stockage, le port API local et les alertes d'heures de travail

### Alertes d'heures de travail

- Configuration des jours de travail
- Alertes optionnelles avant la pause déjeuner et avant la fin de journée
- Nombre de minutes d'anticipation configurable
- Les alertes ne s'appliquent que lorsqu'un timer tourne

### Stockage

- Données stockées localement dans `Documents/Banette/` par défaut
- Dossier de stockage configurable depuis l'application
- Format Markdown + frontmatter YAML
- Aucune donnée envoyée sur internet par défaut
- API HTTP locale en lecture / écriture sur `127.0.0.1`

Exemple de note:

```markdown
---
id: 3f2a1b...
title: Ma première note
created: 2025-01-15T10:00:00.000Z
updated: 2025-01-15T10:05:00.000Z
order: 0
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
| Icônes | FontAwesome |
| Parsing Markdown | gray-matter |
| IPC | contextBridge Electron |
| API locale | HTTP Node.js sur `127.0.0.1` |

---

## Développement

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

L'application Electron démarre avec hot reload via `electron-vite`.

L'API locale démarre automatiquement sur `http://127.0.0.1:3210` par défaut.
Le port préféré peut être configuré dans les paramètres ou surchargé avec `BANETTE_API_PORT`.
Si le port demandé est occupé, Banette bascule automatiquement sur le prochain port libre.

Script utile:

```bash
npm run dev:3211
```

Ce script démarre Banette avec un port API préféré à `3211`.

### Build de production

```bash
npm run build
```

Compile les sources dans `out/`.

### Lancer le serveur MCP

```bash
npm run mcp
```

Le serveur MCP fonctionne en `stdio` et doit être lancé par un client compatible MCP.

### Packager l'installateur

```bash
npm run package
```

Génère les artefacts dans `dist/`.

### Installer localement sous Linux

Après génération de l'AppImage:

```bash
chmod +x scripts/install-linux-appimage.sh
./scripts/install-linux-appimage.sh
```

Le script copie l'AppImage dans `~/.local/bin`, installe l'icône dans `~/.local/share/icons` et crée un fichier `.desktop` dans `~/.local/share/applications`.

---

## Structure du projet

```text
banette/
├── electron/
│   ├── main.ts           # Fenêtre, tray, IPC, raccourci global, alertes timer
│   ├── preload.ts        # Bridge sécurisé renderer ↔ main
│   ├── fileSystem.ts     # Lecture/écriture des notes, todos et timers en Markdown
│   ├── apiServer.ts      # API HTTP locale
│   └── settings.ts       # Persistance des paramètres utilisateur
├── scripts/
│   ├── banette-mcp.js    # Serveur MCP stdio
│   └── install-linux-appimage.sh
├── src/
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── ItemList.tsx
│   │   ├── ItemDetail.tsx
│   │   ├── TimerDetail.tsx
│   │   ├── SettingsPanel.tsx
│   │   ├── Editor.tsx
│   │   ├── SortableItem.tsx
│   │   ├── SearchBar.tsx
│   │   ├── DeleteModal.tsx
│   │   └── CodeBlockComponent.tsx
│   ├── hooks/
│   │   ├── useAutoSave.ts
│   │   └── useTagEditor.ts
│   ├── types/
│   │   ├── index.ts
│   │   └── electron.d.ts
│   ├── utils/
│   │   └── format.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── electron.vite.config.ts
├── electron-builder.yml
├── tailwind.config.js
└── package.json
```

---

## Données utilisateur

Structure par défaut:

```text
Documents/Banette/
├── notes/
│   ├── <uuid>.md
│   └── ...
├── todos/
│   ├── <uuid>.md
│   └── ...
└── timers/
    ├── <uuid>.md
    └── ...
```

Les fichiers restent lisibles et modifiables avec n'importe quel éditeur texte.

---

## API locale

L'application expose une API HTTP locale pour l'automatisation. Elle n'écoute que sur `127.0.0.1`.

### Santé et infos

- `GET /api/health`
- `GET /api/info`

Exemple:

```bash
curl http://127.0.0.1:3210/api/health
```

### Notes

- `GET /api/notes`
- `POST /api/notes`
- `GET /api/notes/:id`
- `PATCH /api/notes/:id`
- `DELETE /api/notes/:id`

Créer une note:

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

Modifier une note:

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

Créer une todo:

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

Modifier une todo:

```bash
curl -X PATCH http://127.0.0.1:3210/api/todos/<id> \
  -H "Content-Type: application/json" \
  -d '{
    "completed": true,
    "priority": "basse"
  }'
```

### Timers

- `GET /api/timers`
- `POST /api/timers`
- `GET /api/timers/:id`
- `PATCH /api/timers/:id`
- `DELETE /api/timers/:id`

Créer un projet timer:

```bash
curl -X POST http://127.0.0.1:3210/api/timers \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Client A",
    "tags": ["facturation", "avril"],
    "pinned": true
  }'
```

Mettre à jour un timer:

```bash
curl -X PATCH http://127.0.0.1:3210/api/timers/<id> \
  -H "Content-Type: application/json" \
  -d '{
    "running_since": null,
    "total_seconds": 5400,
    "sessions": [
      { "id": "session-1", "date": "02/04/2026", "seconds": 5400 }
    ]
  }'
```

### Formats JSON

Les réponses de lecture utilisent le format:

```json
{
  "data": {}
}
```

Les erreurs utilisent le format:

```json
{
  "error": "Message"
}
```

### Champs acceptés

- Note: `title`, `content`, `tags`, `pinned`
- Todo: `title`, `content`, `priority`, `completed`, `tags`, `pinned`
- Timer: `title`, `tags`, `pinned`, `sessions`, `running_since`, `total_seconds`
- Priorités valides: `haute`, `normale`, `basse`

---

## MCP local

Un serveur MCP local permet à un client compatible MCP de piloter Banette sans accès direct au système de fichiers.

### Outil fourni

- Commande: `npm run mcp`
- Mode: `stdio`
- Dépendance: Banette doit être ouverte pour que l'API locale réponde

### Outils MCP exposés

Actuellement, le MCP couvre les **notes** et **todos**. Les **timers** restent disponibles via l'API locale HTTP, mais ne sont pas encore exposés comme outils MCP.

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

### Intégration Claude Code / Cowork via plugin

Le fichier `banette.plugin` embarque un `.mcp.json` qui enregistre automatiquement le serveur MCP auprès de Claude Code:

```json
{
  "mcpServers": {
    "banette": {
      "type": "stdio",
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/scripts/banette-mcp.js"],
      "env": {
        "BANETTE_API_BASE_URL": "http://127.0.0.1:3210"
      }
    }
  }
}
```

Prérequis:

1. Installer `banette.plugin` dans Claude Code.
2. Garder Banette ouverte, via l'app packagée ou `npm run dev`.
3. Redémarrer Claude Code après installation du plugin.

Vérification rapide:

```bash
curl http://127.0.0.1:3210/api/health
```

### Intégration Claude Code sans plugin

Exemple de `.mcp.json` à la racine d'un projet:

```json
{
  "mcpServers": {
    "banette": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/chemin/vers/banette"
    }
  }
}
```

Si Banette écoute sur un autre port, définir `BANETTE_API_BASE_URL` côté client MCP.

### Lancement automatique de l'app

Le serveur MCP peut tenter de lancer Banette si l'API locale ne répond pas encore.

Ordre de tentative:

- `BANETTE_LAUNCH_COMMAND` si fourni
- `open -a Banette` sur macOS
- `dist/mac/Banette.app` si présent
- `npm run dev` comme fallback depuis le repo

Variables utiles:

- `BANETTE_API_BASE_URL`
- `BANETTE_LAUNCH_COMMAND`
- `BANETTE_APP_CWD`

### Fallback: écriture directe dans les fichiers

Si le MCP n'est pas disponible, il reste possible d'interagir directement avec les fichiers Markdown dans le dossier de stockage retourné par `/api/health`.

Format d'un fichier todo:

```markdown
---
id: <uuid-v4>
title: Titre de la todo
created: '2026-03-27T00:00:00.000Z'
updated: '2026-03-27T00:00:00.000Z'
order: 0
priority: normale
completed: false
tags: []
pinned: false
---

Contenu optionnel en Markdown.
```

Format d'un fichier note:

```markdown
---
id: <uuid-v4>
title: Titre de la note
created: '2026-03-27T00:00:00.000Z'
updated: '2026-03-27T00:00:00.000Z'
order: 0
tags: []
pinned: false
---

Contenu en **Markdown**.
```

Format d'un fichier timer:

```markdown
---
id: <uuid-v4>
title: Nom du projet
created: '2026-03-27T00:00:00.000Z'
updated: '2026-03-27T00:00:00.000Z'
order: 0
tags: []
pinned: false
sessions:
  - id: <uuid-v4>
    date: '02/04/2026'
    seconds: 5400
running_since: null
total_seconds: 5400
---
```

Chaque fichier est nommé `<uuid>.md` et placé dans `notes/`, `todos/` ou `timers/`.
