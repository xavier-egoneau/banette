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

### Build de production

```bash
npm run build
```

Compile les sources dans `out/`.

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
