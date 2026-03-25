import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import matter from 'gray-matter'
import { v4 as uuidv4 } from 'uuid'

export interface NoteFile {
  id: string
  title: string
  created: string
  updated: string
  order: number
  content: string
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
}

function getBasePath(): string {
  return path.join(app.getPath('documents'), 'Banette')
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

// Notes

export function listNotes(): NoteFile[] {
  ensureDirectories()
  const dir = getNotesDir()
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'))

  const notes = files.map((file) => {
    const filePath = path.join(dir, file)
    const parsed = readMarkdownFile(filePath)
    const data = parsed.data as Record<string, unknown>
    return {
      id: String(data.id ?? ''),
      title: String(data.title ?? ''),
      created: String(data.created ?? ''),
      updated: String(data.updated ?? ''),
      order: typeof data.order === 'number' ? data.order : Infinity,
      content: parsed.content.trim()
    } as NoteFile
  })

  return notes.sort((a, b) => a.order - b.order || new Date(b.updated).getTime() - new Date(a.updated).getTime())
}

export function getNote(id: string): NoteFile | null {
  ensureDirectories()
  const dir = getNotesDir()
  const filePath = path.join(dir, `${id}.md`)
  if (!fs.existsSync(filePath)) return null
  const parsed = readMarkdownFile(filePath)
  const data = parsed.data as Record<string, unknown>
  return {
    id: String(data.id ?? ''),
    title: String(data.title ?? ''),
    created: String(data.created ?? ''),
    updated: String(data.updated ?? ''),
    order: typeof data.order === 'number' ? data.order : Infinity,
    content: parsed.content.trim()
  }
}

export function createNote(title: string, content: string = ''): NoteFile {
  ensureDirectories()
  const id = uuidv4()
  const now = new Date().toISOString()
  const order = 0
  const note: NoteFile = { id, title, created: now, updated: now, order, content }
  const filePath = path.join(getNotesDir(), `${id}.md`)
  writeMarkdownFile(filePath, { id, title, created: now, updated: now, order }, content)
  return note
}

export function updateNote(id: string, updates: Partial<Omit<NoteFile, 'id' | 'created'>>): NoteFile | null {
  ensureDirectories()
  const existing = getNote(id)
  if (!existing) return null
  const now = new Date().toISOString()
  const updated: NoteFile = {
    ...existing,
    ...updates,
    id,
    updated: now
  }
  const filePath = path.join(getNotesDir(), `${id}.md`)
  writeMarkdownFile(
    filePath,
    { id, title: updated.title, created: updated.created, updated: now, order: updated.order },
    updated.content
  )
  return updated
}

export function reorderNotes(orderedIds: string[]): void {
  ensureDirectories()
  orderedIds.forEach((id, index) => {
    const filePath = path.join(getNotesDir(), `${id}.md`)
    if (!fs.existsSync(filePath)) return
    const parsed = readMarkdownFile(filePath)
    writeMarkdownFile(filePath, { ...parsed.data, order: index }, parsed.content)
  })
}

export function deleteNote(id: string): boolean {
  ensureDirectories()
  const filePath = path.join(getNotesDir(), `${id}.md`)
  if (!fs.existsSync(filePath)) return false
  fs.unlinkSync(filePath)
  return true
}

// Todos

export function listTodos(): TodoFile[] {
  ensureDirectories()
  const dir = getTodosDir()
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'))

  const todos = files.map((file) => {
    const filePath = path.join(dir, file)
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
      content: parsed.content.trim()
    } as TodoFile
  })

  return todos.sort((a, b) => a.order - b.order || new Date(b.updated).getTime() - new Date(a.updated).getTime())
}

export function getTodo(id: string): TodoFile | null {
  ensureDirectories()
  const dir = getTodosDir()
  const filePath = path.join(dir, `${id}.md`)
  if (!fs.existsSync(filePath)) return null
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
    content: parsed.content.trim()
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
  const todo: TodoFile = { id, title, created: now, updated: now, order, priority, completed: false, content }
  const filePath = path.join(getTodosDir(), `${id}.md`)
  writeMarkdownFile(
    filePath,
    { id, title, created: now, updated: now, order, priority, completed: false },
    content
  )
  return todo
}

export function updateTodo(
  id: string,
  updates: Partial<Omit<TodoFile, 'id' | 'created'>>
): TodoFile | null {
  ensureDirectories()
  const existing = getTodo(id)
  if (!existing) return null
  const now = new Date().toISOString()
  const updated: TodoFile = {
    ...existing,
    ...updates,
    id,
    updated: now
  }
  const filePath = path.join(getTodosDir(), `${id}.md`)
  writeMarkdownFile(
    filePath,
    {
      id,
      title: updated.title,
      created: updated.created,
      updated: now,
      order: updated.order,
      priority: updated.priority,
      completed: updated.completed
    },
    updated.content
  )
  return updated
}

export function reorderTodos(orderedIds: string[]): void {
  ensureDirectories()
  orderedIds.forEach((id, index) => {
    const filePath = path.join(getTodosDir(), `${id}.md`)
    if (!fs.existsSync(filePath)) return
    const parsed = readMarkdownFile(filePath)
    writeMarkdownFile(filePath, { ...parsed.data, order: index }, parsed.content)
  })
}

export function deleteTodo(id: string): boolean {
  ensureDirectories()
  const filePath = path.join(getTodosDir(), `${id}.md`)
  if (!fs.existsSync(filePath)) return false
  fs.unlinkSync(filePath)
  return true
}
