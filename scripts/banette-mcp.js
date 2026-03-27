#!/usr/bin/env node

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const API_BASE_URL = process.env.BANETTE_API_BASE_URL || 'http://127.0.0.1:3210'
const SERVER_NAME = 'banette-mcp'
const SERVER_VERSION = '1.0.0'
const JSON_RPC_VERSION = '2.0'
const FALLBACK_PROTOCOL_VERSION = '2024-11-05'
const DEFAULT_WAIT_MS = 15000
const DEFAULT_POLL_MS = 500

const tools = [
  {
    name: 'banette_health',
    description: 'Check whether the Banette local API is reachable and return connection info.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'banette_ensure_ready',
    description: 'Ensure the Banette app is running. If the API is unreachable, try launching the app and wait until it becomes reachable.',
    inputSchema: {
      type: 'object',
      properties: {
        waitMs: { type: 'number' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'list_notes',
    description: 'List Banette notes.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'create_note',
    description: 'Create a Banette note.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        pinned: { type: 'boolean' }
      },
      required: ['title'],
      additionalProperties: false
    }
  },
  {
    name: 'update_note',
    description: 'Update a Banette note by id.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        content: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        pinned: { type: 'boolean' }
      },
      required: ['id'],
      additionalProperties: false
    }
  },
  {
    name: 'delete_note',
    description: 'Delete a Banette note by id.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' }
      },
      required: ['id'],
      additionalProperties: false
    }
  },
  {
    name: 'list_todos',
    description: 'List Banette todos.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'create_todo',
    description: 'Create a Banette todo.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        priority: { type: 'string', enum: ['haute', 'normale', 'basse'] },
        completed: { type: 'boolean' },
        tags: { type: 'array', items: { type: 'string' } },
        pinned: { type: 'boolean' }
      },
      required: ['title'],
      additionalProperties: false
    }
  },
  {
    name: 'update_todo',
    description: 'Update a Banette todo by id.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        content: { type: 'string' },
        priority: { type: 'string', enum: ['haute', 'normale', 'basse'] },
        completed: { type: 'boolean' },
        tags: { type: 'array', items: { type: 'string' } },
        pinned: { type: 'boolean' }
      },
      required: ['id'],
      additionalProperties: false
    }
  },
  {
    name: 'delete_todo',
    description: 'Delete a Banette todo by id.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' }
      },
      required: ['id'],
      additionalProperties: false
    }
  }
]

function writeMessage(message) {
  const json = JSON.stringify(message)
  const payload = `Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`
  process.stdout.write(payload)
}

function sendResult(id, result) {
  writeMessage({
    jsonrpc: JSON_RPC_VERSION,
    id,
    result
  })
}

function sendError(id, code, message, data) {
  writeMessage({
    jsonrpc: JSON_RPC_VERSION,
    id,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data })
    }
  })
}

function createToolResult(payload) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)
  return {
    content: [
      {
        type: 'text',
        text
      }
    ],
    structuredContent: typeof payload === 'string' ? { message: payload } : payload
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function apiRequest(pathname, options = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${pathname}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Banette API unreachable at ${API_BASE_URL}: ${message}`)
  }

  if (response.status === 204) {
    return { ok: true, status: 204, data: null }
  }

  let json
  try {
    json = await response.json()
  } catch {
    throw new Error(`Banette API returned invalid JSON with status ${response.status}`)
  }

  if (!response.ok) {
    throw new Error(json?.error || `Banette API error ${response.status}`)
  }

  return {
    ok: true,
    status: response.status,
    data: json.data
  }
}

async function checkHealth() {
  const result = await apiRequest('/api/health', { method: 'GET' })
  return result.data
}

function getLaunchCandidates() {
  const candidates = []
  const configured = process.env.BANETTE_LAUNCH_COMMAND
  if (configured) {
    candidates.push({
      kind: 'shell',
      command: configured,
      cwd: process.env.BANETTE_APP_CWD || process.cwd(),
      source: 'BANETTE_LAUNCH_COMMAND'
    })
  }

  if (process.platform === 'darwin') {
    candidates.push({
      kind: 'spawn',
      command: 'open',
      args: ['-a', 'Banette'],
      source: 'macOS open -a Banette'
    })
  }

  const distAppPath = path.join(process.cwd(), 'dist', 'mac', 'Banette.app')
  if (fs.existsSync(distAppPath)) {
    candidates.push({
      kind: 'spawn',
      command: 'open',
      args: [distAppPath],
      source: 'local dist/mac/Banette.app'
    })
  }

  candidates.push({
    kind: 'spawn',
    command: 'npm',
    args: ['run', 'dev'],
    cwd: process.cwd(),
    source: 'repo fallback npm run dev'
  })

  return candidates
}

function launchCandidate(candidate) {
  if (candidate.kind === 'shell') {
    const child = spawn(candidate.command, {
      cwd: candidate.cwd,
      shell: true,
      detached: true,
      stdio: 'ignore'
    })
    child.unref()
    return candidate.source
  }

  const child = spawn(candidate.command, candidate.args || [], {
    cwd: candidate.cwd,
    detached: true,
    stdio: 'ignore'
  })
  child.unref()
  return candidate.source
}

async function ensureReady(waitMs) {
  try {
    const health = await checkHealth()
    return {
      launched: false,
      ready: true,
      api: health.api || health
    }
  } catch {
    // Continue to launch attempts
  }

  const errors = []
  let launchSource = null

  for (const candidate of getLaunchCandidates()) {
    try {
      launchSource = launchCandidate(candidate)
      break
    } catch (error) {
      errors.push(`${candidate.source}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (!launchSource) {
    throw new Error(
      `Unable to launch Banette. Configure BANETTE_LAUNCH_COMMAND if needed. Attempts: ${errors.join(' | ')}`
    )
  }

  const deadline = Date.now() + waitMs
  while (Date.now() < deadline) {
    try {
      const health = await checkHealth()
      return {
        launched: true,
        ready: true,
        launchSource,
        api: health.api || health
      }
    } catch {
      await sleep(DEFAULT_POLL_MS)
    }
  }

  throw new Error(
    `Banette launch was attempted via "${launchSource}" but the API did not become reachable within ${waitMs}ms`
  )
}

function assertObject(args) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    throw new Error('Arguments must be a JSON object')
  }
}

function requireString(args, key) {
  const value = args[key]
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`"${key}" must be a non-empty string`)
  }
  return value
}

function pickFields(args, keys) {
  const payload = {}
  for (const key of keys) {
    if (key in args) {
      payload[key] = args[key]
    }
  }
  return payload
}

async function callTool(name, args) {
  assertObject(args)

  switch (name) {
    case 'banette_health': {
      const health = await checkHealth()
      return createToolResult(health)
    }
    case 'banette_ensure_ready': {
      const waitMs = typeof args.waitMs === 'number' && args.waitMs > 0 ? args.waitMs : DEFAULT_WAIT_MS
      const result = await ensureReady(waitMs)
      return createToolResult(result)
    }
    case 'list_notes': {
      const result = await apiRequest('/api/notes', { method: 'GET' })
      return createToolResult({ items: result.data })
    }
    case 'create_note': {
      const payload = pickFields(args, ['title', 'content', 'tags', 'pinned'])
      payload.title = requireString(args, 'title')
      const result = await apiRequest('/api/notes', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      return createToolResult(result.data)
    }
    case 'update_note': {
      const id = requireString(args, 'id')
      const payload = pickFields(args, ['title', 'content', 'tags', 'pinned'])
      const result = await apiRequest(`/api/notes/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      })
      return createToolResult(result.data)
    }
    case 'delete_note': {
      const id = requireString(args, 'id')
      await apiRequest(`/api/notes/${encodeURIComponent(id)}`, { method: 'DELETE' })
      return createToolResult({ deleted: true, id })
    }
    case 'list_todos': {
      const result = await apiRequest('/api/todos', { method: 'GET' })
      return createToolResult({ items: result.data })
    }
    case 'create_todo': {
      const payload = pickFields(args, ['title', 'content', 'priority', 'completed', 'tags', 'pinned'])
      payload.title = requireString(args, 'title')
      const result = await apiRequest('/api/todos', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      return createToolResult(result.data)
    }
    case 'update_todo': {
      const id = requireString(args, 'id')
      const payload = pickFields(args, ['title', 'content', 'priority', 'completed', 'tags', 'pinned'])
      const result = await apiRequest(`/api/todos/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      })
      return createToolResult(result.data)
    }
    case 'delete_todo': {
      const id = requireString(args, 'id')
      await apiRequest(`/api/todos/${encodeURIComponent(id)}`, { method: 'DELETE' })
      return createToolResult({ deleted: true, id })
    }
    default:
      throw new Error(`Unknown tool "${name}"`)
  }
}

async function handleMessage(message) {
  if (!message || typeof message !== 'object') {
    return
  }

  const { id, method, params } = message

  if (method === 'notifications/initialized') {
    return
  }

  if (method === 'initialize') {
    sendResult(id, {
      protocolVersion: params?.protocolVersion || FALLBACK_PROTOCOL_VERSION,
      capabilities: {
        tools: {}
      },
      serverInfo: {
        name: SERVER_NAME,
        version: SERVER_VERSION
      }
    })
    return
  }

  if (method === 'tools/list') {
    sendResult(id, { tools })
    return
  }

  if (method === 'tools/call') {
    try {
      const name = params?.name
      const args = params?.arguments || {}
      if (typeof name !== 'string' || name.length === 0) {
        throw new Error('Tool name is required')
      }
      const result = await callTool(name, args)
      sendResult(id, result)
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error)
      sendResult(id, {
        content: [{ type: 'text', text: messageText }],
        isError: true
      })
    }
    return
  }

  if (method === 'ping') {
    sendResult(id, {})
    return
  }

  if (id !== undefined) {
    sendError(id, -32601, `Method not found: ${method}`)
  }
}

let buffer = Buffer.alloc(0)

function processBuffer() {
  while (true) {
    const headerEnd = buffer.indexOf('\r\n\r\n')
    if (headerEnd === -1) return

    const headerText = buffer.slice(0, headerEnd).toString('utf8')
    const headers = headerText.split('\r\n')
    const contentLengthHeader = headers.find((header) => header.toLowerCase().startsWith('content-length:'))
    if (!contentLengthHeader) {
      buffer = Buffer.alloc(0)
      return
    }

    const contentLength = Number(contentLengthHeader.split(':')[1]?.trim())
    if (!Number.isFinite(contentLength) || contentLength < 0) {
      buffer = Buffer.alloc(0)
      return
    }

    const messageStart = headerEnd + 4
    const messageEnd = messageStart + contentLength
    if (buffer.length < messageEnd) return

    const body = buffer.slice(messageStart, messageEnd).toString('utf8')
    buffer = buffer.slice(messageEnd)

    try {
      const message = JSON.parse(body)
      Promise.resolve(handleMessage(message)).catch((error) => {
        const messageText = error instanceof Error ? error.message : String(error)
        if (message?.id !== undefined) {
          sendError(message.id, -32603, messageText)
        }
      })
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error)
      sendError(null, -32700, `Parse error: ${messageText}`)
    }
  }
}

process.stdin.on('data', (chunk) => {
  buffer = Buffer.concat([buffer, chunk])
  processBuffer()
})

process.stdin.on('end', () => {
  process.exit(0)
})
