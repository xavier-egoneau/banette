import { createServer, IncomingMessage, Server, ServerResponse } from 'http'
import { AddressInfo } from 'net'
import {
  createNote, createTodo, createTimer,
  deleteNote, deleteTodo, deleteTimer,
  getCurrentStoragePath,
  getNote, getTodo, getTimer,
  listNotes, listTodos, listTimers,
  NoteFile, TodoFile, TimerFile,
  updateNote, updateTodo, updateTimer
} from './fileSystem'

type Priority = 'haute' | 'normale' | 'basse'

interface ApiInfo {
  enabled: boolean
  host: string
  port: number
  baseUrl: string
  storagePath: string
}

const API_HOST = '127.0.0.1'
const DEFAULT_API_PORT = 3210
const MAX_BODY_SIZE = 1024 * 1024
const VALID_PRIORITIES: Priority[] = ['haute', 'normale', 'basse']

let apiServer: Server | null = null
let apiInfo: ApiInfo | null = null

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  })
  res.end(JSON.stringify(payload))
}

function sendNoContent(res: ServerResponse): void {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  })
  res.end()
}

function normalizeTitle(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function normalizeContent(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((tag) => String(tag).trim())
    .filter(Boolean)
}

function normalizePinned(value: unknown): boolean {
  return Boolean(value)
}

function normalizeCompleted(value: unknown): boolean {
  return Boolean(value)
}

function normalizePriority(value: unknown, fallback: Priority = 'normale'): Priority {
  return typeof value === 'string' && VALID_PRIORITIES.includes(value as Priority)
    ? (value as Priority)
    : fallback
}

function parseId(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean)
  return parts.length === 3 ? decodeURIComponent(parts[2]) : null
}

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0

    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_SIZE) {
        reject(new Error('Payload too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })

    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({})
        return
      }

      try {
        const raw = Buffer.concat(chunks).toString('utf-8')
        resolve(JSON.parse(raw) as Record<string, unknown>)
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })

    req.on('error', reject)
  })
}

function buildApiInfo(port: number): ApiInfo {
  return {
    enabled: true,
    host: API_HOST,
    port,
    baseUrl: `http://${API_HOST}:${port}`,
    storagePath: getCurrentStoragePath()
  }
}

async function handleNotes(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<void> {
  if (pathname === '/api/notes' && req.method === 'GET') {
    sendJson(res, 200, { data: listNotes() })
    return
  }

  if (pathname === '/api/notes' && req.method === 'POST') {
    const body = await readJsonBody(req)
    const note = createNote(
      normalizeTitle(body.title, 'Nouvelle note'),
      normalizeContent(body.content)
    )
    const updates = {
      tags: normalizeTags(body.tags),
      pinned: normalizePinned(body.pinned)
    }
    const saved = updateNote(note.id, updates) ?? note
    sendJson(res, 201, { data: saved })
    return
  }

  const id = parseId(pathname)
  if (!id) {
    sendJson(res, 404, { error: 'Route introuvable' })
    return
  }

  if (req.method === 'GET') {
    const note = getNote(id)
    if (!note) {
      sendJson(res, 404, { error: 'Note introuvable' })
      return
    }
    sendJson(res, 200, { data: note })
    return
  }

  if (req.method === 'PATCH') {
    const existing = getNote(id)
    if (!existing) {
      sendJson(res, 404, { error: 'Note introuvable' })
      return
    }

    const body = await readJsonBody(req)
    const updates: Partial<Omit<NoteFile, 'id' | 'created'>> = {}
    if ('title' in body) updates.title = normalizeTitle(body.title, existing.title)
    if ('content' in body) updates.content = normalizeContent(body.content)
    if ('tags' in body) updates.tags = normalizeTags(body.tags)
    if ('pinned' in body) updates.pinned = normalizePinned(body.pinned)

    const updated = updateNote(id, updates)
    sendJson(res, 200, { data: updated })
    return
  }

  if (req.method === 'DELETE') {
    const deleted = deleteNote(id)
    if (!deleted) {
      sendJson(res, 404, { error: 'Note introuvable' })
      return
    }
    sendNoContent(res)
    return
  }

  sendJson(res, 405, { error: 'Méthode non autorisée' })
}

async function handleTodos(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<void> {
  if (pathname === '/api/todos' && req.method === 'GET') {
    sendJson(res, 200, { data: listTodos() })
    return
  }

  if (pathname === '/api/todos' && req.method === 'POST') {
    const body = await readJsonBody(req)
    const todo = createTodo(
      normalizeTitle(body.title, 'Nouvelle todo'),
      normalizeContent(body.content),
      normalizePriority(body.priority)
    )
    const updates = {
      tags: normalizeTags(body.tags),
      pinned: normalizePinned(body.pinned),
      completed: normalizeCompleted(body.completed)
    }
    const saved = updateTodo(todo.id, updates) ?? todo
    sendJson(res, 201, { data: saved })
    return
  }

  const id = parseId(pathname)
  if (!id) {
    sendJson(res, 404, { error: 'Route introuvable' })
    return
  }

  if (req.method === 'GET') {
    const todo = getTodo(id)
    if (!todo) {
      sendJson(res, 404, { error: 'Todo introuvable' })
      return
    }
    sendJson(res, 200, { data: todo })
    return
  }

  if (req.method === 'PATCH') {
    const existing = getTodo(id)
    if (!existing) {
      sendJson(res, 404, { error: 'Todo introuvable' })
      return
    }

    const body = await readJsonBody(req)
    const updates: Partial<Omit<TodoFile, 'id' | 'created'>> = {}
    if ('title' in body) updates.title = normalizeTitle(body.title, existing.title)
    if ('content' in body) updates.content = normalizeContent(body.content)
    if ('tags' in body) updates.tags = normalizeTags(body.tags)
    if ('pinned' in body) updates.pinned = normalizePinned(body.pinned)
    if ('completed' in body) updates.completed = normalizeCompleted(body.completed)
    if ('priority' in body) updates.priority = normalizePriority(body.priority, existing.priority)

    const updated = updateTodo(id, updates)
    sendJson(res, 200, { data: updated })
    return
  }

  if (req.method === 'DELETE') {
    const deleted = deleteTodo(id)
    if (!deleted) {
      sendJson(res, 404, { error: 'Todo introuvable' })
      return
    }
    sendNoContent(res)
    return
  }

  sendJson(res, 405, { error: 'Méthode non autorisée' })
}

async function handleTimers(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<void> {
  if (pathname === '/api/timers' && req.method === 'GET') {
    sendJson(res, 200, { data: listTimers() })
    return
  }

  if (pathname === '/api/timers' && req.method === 'POST') {
    const body = await readJsonBody(req)
    const timer = createTimer(normalizeTitle(body.title, 'Nouveau projet'))
    const updates = {
      tags: normalizeTags(body.tags),
      pinned: normalizePinned(body.pinned)
    }
    const saved = updateTimer(timer.id, updates) ?? timer
    sendJson(res, 201, { data: saved })
    return
  }

  const id = parseId(pathname)
  if (!id) {
    sendJson(res, 404, { error: 'Route introuvable' })
    return
  }

  if (req.method === 'GET') {
    const timer = getTimer(id)
    if (!timer) {
      sendJson(res, 404, { error: 'Timer introuvable' })
      return
    }
    sendJson(res, 200, { data: timer })
    return
  }

  if (req.method === 'PATCH') {
    const existing = getTimer(id)
    if (!existing) {
      sendJson(res, 404, { error: 'Timer introuvable' })
      return
    }
    const body = await readJsonBody(req)
    const updates: Partial<Omit<TimerFile, 'id' | 'created'>> = {}
    if ('title' in body) updates.title = normalizeTitle(body.title, existing.title)
    if ('tags' in body) updates.tags = normalizeTags(body.tags)
    if ('pinned' in body) updates.pinned = normalizePinned(body.pinned)
    if ('sessions' in body && Array.isArray(body.sessions)) updates.sessions = body.sessions as TimerFile['sessions']
    if ('running_since' in body) updates.running_since = body.running_since ? String(body.running_since) : null
    if ('total_seconds' in body && typeof body.total_seconds === 'number') updates.total_seconds = body.total_seconds
    const updated = updateTimer(id, updates)
    sendJson(res, 200, { data: updated })
    return
  }

  if (req.method === 'DELETE') {
    const deleted = deleteTimer(id)
    if (!deleted) {
      sendJson(res, 404, { error: 'Timer introuvable' })
      return
    }
    sendNoContent(res)
    return
  }

  sendJson(res, 405, { error: 'Méthode non autorisée' })
}

async function requestListener(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')
    const pathname = url.pathname.replace(/\/+$/, '') || '/'

    if (req.method === 'OPTIONS') {
      sendNoContent(res)
      return
    }

    if (pathname === '/api/health' && req.method === 'GET') {
      sendJson(res, 200, {
        data: {
          status: 'ok',
          api: getApiInfo()
        }
      })
      return
    }

    if (pathname === '/api/info' && req.method === 'GET') {
      sendJson(res, 200, { data: getApiInfo() })
      return
    }

    if (pathname === '/api/notes' || pathname.startsWith('/api/notes/')) {
      await handleNotes(req, res, pathname)
      return
    }

    if (pathname === '/api/todos' || pathname.startsWith('/api/todos/')) {
      await handleTodos(req, res, pathname)
      return
    }

    if (pathname === '/api/timers' || pathname.startsWith('/api/timers/')) {
      await handleTimers(req, res, pathname)
      return
    }

    sendJson(res, 404, { error: 'Route introuvable' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne'
    const statusCode = message === 'Payload too large' ? 413 : 400
    sendJson(res, statusCode, { error: message })
  }
}

export async function startApiServer(): Promise<ApiInfo> {
  if (apiInfo) return apiInfo

  const portFromEnv = Number(process.env.BANETTE_API_PORT)
  const port = Number.isInteger(portFromEnv) && portFromEnv > 0 ? portFromEnv : DEFAULT_API_PORT

  apiServer = createServer((req, res) => {
    void requestListener(req, res)
  })

  await new Promise<void>((resolve, reject) => {
    apiServer?.once('error', reject)
    apiServer?.listen(port, API_HOST, () => {
      apiServer?.off('error', reject)
      resolve()
    })
  })

  const address = apiServer.address() as AddressInfo | null
  apiInfo = buildApiInfo(address?.port ?? port)
  return apiInfo
}

export function getApiInfo(): ApiInfo | null {
  if (apiInfo && apiServer?.listening) {
    apiInfo = {
      ...apiInfo,
      storagePath: getCurrentStoragePath()
    }
  }
  return apiInfo
}

export async function stopApiServer(): Promise<void> {
  if (!apiServer) return

  await new Promise<void>((resolve, reject) => {
    apiServer?.close((error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })

  apiServer = null
  apiInfo = null
}
