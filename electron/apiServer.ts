import { createServer, IncomingMessage, Server, ServerResponse } from 'http'
import { AddressInfo } from 'net'
import {
  createNote,
  createTodo,
  deleteNote,
  deleteTodo,
  getCurrentStoragePath,
  getNote,
  getTodo,
  listNotes,
  listTodos,
  NoteFile,
  TodoFile,
  updateNote,
  updateTodo
} from './fileSystem'
import { getSettings } from './settings'

type Priority = 'haute' | 'normale' | 'basse'

interface ApiInfo {
  enabled: boolean
  host: string
  port: number
  baseUrl: string
  storagePath: string
  preferredPort: number
  usingFallbackPort: boolean
}

const API_HOST = '127.0.0.1'
const DEFAULT_API_PORT = 3210
const MAX_BODY_SIZE = 1024 * 1024
const VALID_PRIORITIES: Priority[] = ['haute', 'normale', 'basse']

let apiServer: Server | null = null
let apiInfo: ApiInfo | null = null

function normalizePort(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 65535
    ? value
    : null
}

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

function getPreferredPort(): number {
  const portFromEnv = normalizePort(Number(process.env.BANETTE_API_PORT))
  if (portFromEnv) return portFromEnv

  const portFromSettings = normalizePort(getSettings().apiPort)
  return portFromSettings ?? DEFAULT_API_PORT
}

function buildApiInfo(port: number, preferredPort: number): ApiInfo {
  return {
    enabled: true,
    host: API_HOST,
    port,
    baseUrl: `http://${API_HOST}:${port}`,
    storagePath: getCurrentStoragePath(),
    preferredPort,
    usingFallbackPort: port !== preferredPort
  }
}

async function listenWithFallback(server: Server, preferredPort: number): Promise<number> {
  let portToTry = preferredPort

  for (let attempts = 0; attempts < 10; attempts += 1) {
    try {
      await new Promise<void>((resolve, reject) => {
        const handleError = (error: Error & { code?: string }) => {
          server.off('listening', handleListening)
          reject(error)
        }
        const handleListening = () => {
          server.off('error', handleError)
          resolve()
        }

        server.once('error', handleError)
        server.once('listening', handleListening)
        server.listen(portToTry, API_HOST)
      })
      return portToTry
    } catch (error) {
      const err = error as Error & { code?: string }
      if (err.code !== 'EADDRINUSE') throw err
      portToTry += 1
    }
  }

  await new Promise<void>((resolve, reject) => {
    const handleError = (error: Error) => {
      server.off('listening', handleListening)
      reject(error)
    }
    const handleListening = () => {
      server.off('error', handleError)
      resolve()
    }

    server.once('error', handleError)
    server.once('listening', handleListening)
    server.listen(0, API_HOST)
  })

  const address = server.address() as AddressInfo | null
  return address?.port ?? preferredPort
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

    sendJson(res, 404, { error: 'Route introuvable' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne'
    const statusCode = message === 'Payload too large' ? 413 : 400
    sendJson(res, statusCode, { error: message })
  }
}

export async function startApiServer(): Promise<ApiInfo> {
  if (apiInfo) return apiInfo

  const preferredPort = getPreferredPort()

  apiServer = createServer((req, res) => {
    void requestListener(req, res)
  })

  const actualPort = await listenWithFallback(apiServer, preferredPort)
  const address = apiServer.address() as AddressInfo | null
  apiInfo = buildApiInfo(address?.port ?? actualPort, preferredPort)
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
        if ((error as NodeJS.ErrnoException).code === 'ERR_SERVER_NOT_RUNNING') {
          resolve()
          return
        }
        reject(error)
        return
      }
      resolve()
    })
  })

  apiServer = null
  apiInfo = null
}

export async function restartApiServer(): Promise<ApiInfo> {
  if (apiServer) {
    await stopApiServer()
  }
  return startApiServer()
}
