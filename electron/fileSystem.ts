import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import matter from 'gray-matter'
import { v4 as uuidv4 } from 'uuid'
import { getSettings } from './settings'

export interface NoteFile {
  id: string
  title: string
  created: string
  updated: string
  order: number
  content: string
  tags: string[]
  pinned: boolean
}

export interface TodoFile {
  id: string
  title: string
  created: string
  updated: string
  order: number
  priority: 'haute' | 'normale' | 'basse'
  completed: boolean
  content: string
  tags: string[]
  pinned: boolean
}

function getBasePath(): string {
  const { storagePath } = getSettings()
  return storagePath ?? path.join(app.getPath('documents'), 'Banette')
}

function getNotesDir(): string {
  return path.join(getBasePath(), 'notes')
}

function getTodosDir(): string {
  return path.join(getBasePath(), 'todos')
}

function ensureDirectories(): void {
  const dirs = [getBasePath(), getNotesDir(), getTodosDir()]
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }
}

function readMarkdownFile(filePath: string): matter.GrayMatterFile<string> {
  const raw = fs.readFileSync(filePath, 'utf-8')
  return matter(raw)
}

function writeMarkdownFile(filePath: string, data: Record<string, unknown>, content: string): void {
  const fileContent = matter.stringify(content, data)
  fs.writeFileSync(filePath, fileContent, 'utf-8')
}

export function parseTags(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(String).filter(Boolean)
}

function sortByPinnedThenOrder<T extends { pinned: boolean; order: number; updated: string }>(items: T[]): T[] {
  return items.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return a.order - b.order || new Date(b.updated).getTime() - new Date(a.updated).getTime()
  })
}

// Path helpers for export
export function getNotePath(id: string): string {
  return path.join(getNotesDir(), `${id}.md`)
}

export function getTodoPath(id: string): string {
  return path.join(getTodosDir(), `${id}.md`)
}

export function getCurrentStoragePath(): string {
  return getBasePath()
}

// Notes

export function listNotes(): NoteFile[] {
  ensureDirectories()
  const dir = getNotesDir()
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'))

  const notes: NoteFile[] = []
  for (const file of files) {
    try {
      const filePath = path.join(dir, file)
      const parsed = readMarkdownFile(filePath)
      const data = parsed.data as Record<string, unknown>
      notes.push({
        id: String(data.id ?? ''),
        title: String(data.title ?? ''),
        created: String(data.created ?? ''),
        updated: String(data.updated ?? ''),
        order: typeof data.order === 'number' ? data.order : Infinity,
        content: parsed.content.trim(),
        tags: parseTags(data.tags),
        pinned: Boolean(data.pinned ?? false)
      })
    } catch {
      // Skip corrupted files silently
    }
  }

  return sortByPinnedThenOrder(notes)
}

export function getNote(id: string): NoteFile | null {
  ensureDirectories()
  const filePath = getNotePath(id)
  if (!fs.existsSync(filePath)) return null
  try {
    const parsed = readMarkdownFile(filePath)
    const data = parsed.data as Record<string, unknown>
    return {
      id: String(data.id ?? ''),
      title: String(data.title ?? ''),
      created: String(data.created ?? ''),
      updated: String(data.updated ?? ''),
      order: typeof data.order === 'number' ? data.order : Infinity,
      content: parsed.content.trim(),
      tags: parseTags(data.tags),
      pinned: Boolean(data.pinned ?? false)
    }
  } catch {
    return null
  }
}

export function createNote(title: string, content: string = ''): NoteFile {
  ensureDirectories()
  const id = uuidv4()
  const now = new Date().toISOString()
  const order = 0
  const note: NoteFile = { id, title, created: now, updated: now, order, content, tags: [], pinned: false }
  writeMarkdownFile(getNotePath(id), { id, title, created: now, updated: now, order, tags: [], pinned: false }, content)
  return note
}

export function updateNote(id: string, updates: Partial<Omit<NoteFile, 'id' | 'created'>>): NoteFile | null {
  ensureDirectories()
  const existing = getNote(id)
  if (!existing) return null
  const now = new Date().toISOString()
  const updated: NoteFile = { ...existing, ...updates, id, updated: now }
  writeMarkdownFile(
    getNotePath(id),
    { id, title: updated.title, created: updated.created, updated: now, order: updated.order, tags: updated.tags, pinned: updated.pinned },
    updated.content
  )
  return updated
}

export function reorderNotes(orderedIds: string[]): void {
  ensureDirectories()
  for (const [index, id] of orderedIds.entries()) {
    const filePath = getNotePath(id)
    if (!fs.existsSync(filePath)) continue
    try {
      const parsed = readMarkdownFile(filePath)
      writeMarkdownFile(filePath, { ...parsed.data, order: index }, parsed.content)
    } catch {
      // Skip
    }
  }
}

export function deleteNote(id: string): boolean {
  ensureDirectories()
  const filePath = getNotePath(id)
  if (!fs.existsSync(filePath)) return false
  fs.unlinkSync(filePath)
  return true
}

// Todos

export function listTodos(): TodoFile[] {
  ensureDirectories()
  const dir = getTodosDir()
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'))

  const todos: TodoFile[] = []
  for (const file of files) {
    try {
      const filePath = path.join(dir, file)
      const parsed = readMarkdownFile(filePath)
      const data = parsed.data as Record<string, unknown>
      todos.push({
        id: String(data.id ?? ''),
        title: String(data.title ?? ''),
        created: String(data.created ?? ''),
        updated: String(data.updated ?? ''),
        order: typeof data.order === 'number' ? data.order : Infinity,
        priority: (data.priority as 'haute' | 'normale' | 'basse') ?? 'normale',
        completed: Boolean(data.completed ?? false),
        content: parsed.content.trim(),
        tags: parseTags(data.tags),
        pinned: Boolean(data.pinned ?? false)
      })
    } catch {
      // Skip corrupted files silently
    }
  }

  return sortByPinnedThenOrder(todos)
}

export function getTodo(id: string): TodoFile | null {
  ensureDirectories()
  const filePath = getTodoPath(id)
  if (!fs.existsSync(filePath)) return null
  try {
    const parsed = readMarkdownFile(filePath)
    const data = parsed.data as Record<string, unknown>
    return {
      id: String(data.id ?? ''),
      title: String(data.title ?? ''),
      created: String(data.created ?? ''),
      updated: String(data.updated ?? ''),
      order: typeof data.order === 'number' ? data.order : Infinity,
      priority: (data.priority as 'haute' | 'normale' | 'basse') ?? 'normale',
      completed: Boolean(data.completed ?? false),
      content: parsed.content.trim(),
      tags: parseTags(data.tags),
      pinned: Boolean(data.pinned ?? false)
    }
  } catch {
    return null
  }
}

export function createTodo(
  title: string,
  content: string = '',
  priority: 'haute' | 'normale' | 'basse' = 'normale'
): TodoFile {
  ensureDirectories()
  const id = uuidv4()
  const now = new Date().toISOString()
  const order = 0
  const todo: TodoFile = { id, title, created: now, updated: now, order, priority, completed: false, content, tags: [], pinned: false }
  writeMarkdownFile(
    getTodoPath(id),
    { id, title, created: now, updated: now, order, priority, completed: false, tags: [], pinned: false },
    content
  )
  return todo
}

export function updateTodo(id: string, updates: Partial<Omit<TodoFile, 'id' | 'created'>>): TodoFile | null {
  ensureDirectories()
  const existing = getTodo(id)
  if (!existing) return null
  const now = new Date().toISOString()
  const updated: TodoFile = { ...existing, ...updates, id, updated: now }
  writeMarkdownFile(
    getTodoPath(id),
    {
      id, title: updated.title, created: updated.created, updated: now,
      order: updated.order, priority: updated.priority, completed: updated.completed,
      tags: updated.tags, pinned: updated.pinned
    },
    updated.content
  )
  return updated
}

export function reorderTodos(orderedIds: string[]): void {
  ensureDirectories()
  for (const [index, id] of orderedIds.entries()) {
    const filePath = getTodoPath(id)
    if (!fs.existsSync(filePath)) continue
    try {
      const parsed = readMarkdownFile(filePath)
      writeMarkdownFile(filePath, { ...parsed.data, order: index }, parsed.content)
    } catch {
      // Skip
    }
  }
}

export function deleteTodo(id: string): boolean {
  ensureDirectories()
  const filePath = getTodoPath(id)
  if (!fs.existsSync(filePath)) return false
  fs.unlinkSync(filePath)
  return true
}

// Import

export function importMarkdownFiles(filePaths: string[]): (NoteFile | TodoFile)[] {
  ensureDirectories()
  const imported: (NoteFile | TodoFile)[] = []

  for (const filePath of filePaths) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const parsed = matter(raw)
      const data = parsed.data as Record<string, unknown>
      const title = String(data.title ?? path.basename(filePath, '.md'))
      const content = parsed.content.trim()
      const tags = parseTags(data.tags)
      const hasTodoFields = 'priority' in data || 'completed' in data

      if (hasTodoFields) {
        const priority = (['haute', 'normale', 'basse'].includes(String(data.priority))
          ? data.priority
          : 'normale') as 'haute' | 'normale' | 'basse'
        const todo = createTodo(title, content, priority)
        updateTodo(todo.id, { tags, completed: Boolean(data.completed ?? false) })
        imported.push({ ...todo, tags, completed: Boolean(data.completed ?? false) })
      } else {
        const note = createNote(title, content)
        if (tags.length) updateNote(note.id, { tags })
        imported.push({ ...note, tags })
      }
    } catch {
      // Skip unparseable files
    }
  }

  return imported
}
