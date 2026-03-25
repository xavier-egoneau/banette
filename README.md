# Banette

Application de bureau Windows pour gérer des **notes** et des **todos**, avec un éditeur WYSIWYG et un stockage local en Markdown.

---

## Fonctionnalités

### Notes
- Création, édition et suppression de notes
- Éditeur de texte enrichi (WYSIWYG) — ce que tu vois est ce qui est sauvegardé
- Mise en forme : **gras**, *italique*, ~~barré~~, titres, listes, blocs de code, citations, listes de tâches
- Auto-save : les modifications sont sauvegardées automatiquement après 800 ms d'inactivité
- Date de création affichée en bas de chaque note (format français)

### Todos
- Création, édition et suppression de tâches
- Marquage **complété / en cours** depuis la liste ou depuis le détail
- **Priorités** : haute (rouge), normale (orange), basse (vert)
- Éditeur de texte enrichi pour la description de chaque todo
- Auto-save identique aux notes

### Interface
- Sidebar avec navigation **Todos** / **Notes**
- Liste des items avec recherche en temps réel
- Vue détail au clic sur un item
- Raccourci clavier `Ctrl+N` pour créer un item
- Touche `Suppr` ou `Backspace` sur un item sélectionné pour le supprimer
- **Icône dans la barre des tâches (tray)** : l'application se minimise dans le tray au lieu de se fermer, et reste accessible via un clic ou le menu contextuel
- Fenêtre sans bordure, style bloc-notes sur fond jaune avec lignes de papier

### Stockage
- Tous les fichiers sont sauvegardés localement dans `Documents/Banette/`
  - `Documents/Banette/notes/` — un fichier `.md` par note
  - `Documents/Banette/todos/` — un fichier `.md` par todo
- Format : Markdown avec frontmatter YAML (métadonnées + contenu lisible)
- Aucune donnée n'est envoyée sur internet

Exemple de fichier généré :

```markdown
---
id: 3f2a1b...
title: Ma première note
created: 2025-01-15T10:00:00.000Z
updated: 2025-01-15T10:05:00.000Z
---

Contenu de la note en **Markdown**.
```

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Runtime desktop | Electron 28 |
| Bundler | electron-vite |
| Frontend | React 18 + TypeScript |
| Styles | TailwindCSS v3 |
| Éditeur | TipTap 2 + tiptap-markdown |
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

Compile les sources dans `out/` (main, preload, renderer).

### Packager l'installateur Windows

```bash
npm run package
```

Génère un installateur `.exe` (NSIS) dans `dist/`. Le fichier produit est nommé `banette-<version>-setup.exe`.

---

## Structure du projet

```
banette/
├── electron/
│   ├── main.ts          # Process principal Electron (fenêtre, tray, IPC handlers)
│   ├── preload.ts       # Bridge sécurisé renderer ↔ main (contextBridge)
│   └── fileSystem.ts    # Lecture/écriture des fichiers Markdown
├── src/
│   ├── components/
│   │   ├── Sidebar.tsx      # Navigation Todos / Notes
│   │   ├── ItemList.tsx     # Liste des items avec recherche
│   │   ├── ItemDetail.tsx   # Vue détail + éditeur
│   │   ├── Editor.tsx       # Éditeur TipTap
│   │   ├── SearchBar.tsx    # Barre de recherche
│   │   └── DeleteModal.tsx  # Modale de confirmation suppression
│   ├── hooks/
│   │   └── useAutoSave.ts   # Hook debounce 800ms pour l'auto-save
│   ├── types/
│   │   ├── index.ts         # Types Note, Todo, Priority…
│   │   └── electron.d.ts    # Déclaration window.electron pour TypeScript
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css            # Styles ProseMirror + effet lignes de papier
├── electron.vite.config.ts
├── electron-builder.yml
├── tailwind.config.js
└── package.json
```

---

## Données utilisateur

Les fichiers sont stockés dans le dossier Documents de l'utilisateur Windows :

```
C:\Users\<nom>\Documents\Banette\
├── notes\
│   ├── <uuid>.md
│   └── ...
└── todos\
    ├── <uuid>.md
    └── ...
```

Ces fichiers sont du Markdown standard, lisibles et modifiables avec n'importe quel éditeur de texte.
