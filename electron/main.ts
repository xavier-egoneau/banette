import { app, BrowserWindow, ipcMain, Notification, shell, dialog, globalShortcut } from 'electron'
import * as fs from 'fs'
import { join } from 'path'

// Linux: chrome-sandbox requires setuid root — disable OS sandbox to allow running without it
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox')
}

import {
  listNotes, getNote, createNote, updateNote, deleteNote, reorderNotes,
  listTodos, getTodo, createTodo, updateTodo, deleteTodo, reorderTodos,
  listTimers, getTimer, createTimer, updateTimer, deleteTimer, reorderTimers,
  getNotePath, getTodoPath, getCurrentStoragePath, importMarkdownFiles,
  stopAllRunningTimers
} from './fileSystem'
import { getSettings, setSettings } from './settings'
import { getApiInfo, startApiServer, stopApiServer, restartApiServer } from './apiServer'

let mainWindow: BrowserWindow | null = null

// Track which alert slots have already fired today to avoid repeating every minute
const notifiedSlots = new Set<string>()

function showMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (!mainWindow.isVisible()) mainWindow.show()
  mainWindow.focus()
}

function getWindowIconPath(): string | undefined {
  if (process.platform === 'linux') {
    return app.isPackaged
      ? join(process.resourcesPath, 'icon.png')
      : join(__dirname, '../../build/icon.png')
  }

  if (process.platform === 'win32') {
    return app.isPackaged
      ? join(process.resourcesPath, 'icon.ico')
      : join(__dirname, '../../build/icon.ico')
  }

  return undefined
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 700,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    resizable: true,
    frame: false,
    transparent: false,
    show: false,
    autoHideMenuBar: true,
    center: true,
    backgroundColor: '#FFF8E7',
    icon: getWindowIconPath(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    showMainWindow()
  })

  mainWindow.webContents.on('did-finish-load', () => {
    showMainWindow()
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[Banette Window] renderer process gone', details)
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('[Banette Window] failed to load', { errorCode, errorDescription, validatedURL })
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  setTimeout(() => {
    showMainWindow()
  }, 1500)
}

function pruneNotifiedSlots(): void {
  const today = new Date().toISOString().split('T')[0]
  for (const key of notifiedSlots) {
    if (!key.startsWith(today)) notifiedSlots.delete(key)
  }
}

function checkWorkHoursAlerts(): void {
  pruneNotifiedSlots()
  const { workHours } = getSettings()
  if (!workHours.enabled) return

  const timers = listTimers()
  const running = timers.filter((t) => t.running_since)
  if (running.length === 0) return

  const now = new Date()
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  const today = dayNames[now.getDay()]
  if (!workHours.days.includes(today)) return

  const todayStr = now.toISOString().split('T')[0]
  const alertMs = (workHours.alertMinutes ?? 15) * 60 * 1000

  const slots = [
    { key: 'lunch', slot: workHours.lunchBreak, label: 'pause déjeuner' },
    { key: 'end', slot: workHours.endOfDay, label: 'fin de journée' }
  ].filter(({ slot }) => slot.enabled && slot.time)

  for (const { key, slot, label } of slots) {
    const [h, m] = slot.time.split(':').map(Number)
    const slotDate = new Date(now)
    slotDate.setHours(h, m, 0, 0)

    const diffMs = slotDate.getTime() - now.getTime()
    const notifKey = `${todayStr}-${key}`

    if (diffMs >= 0 && diffMs <= alertMs && !notifiedSlots.has(notifKey)) {
      notifiedSlots.add(notifKey)

      const diffMin = Math.round(diffMs / 60000)
      const names = running.map((t) => `"${t.title}"`).join(', ')
      const timeStr = diffMin <= 1 ? 'maintenant' : `dans ${diffMin} min`

      const notification = new Notification({
        title: 'Banette — Timer en cours',
        body: `${names} tourne encore. ${label} ${timeStr}.`,
        silent: false
      })

      notification.on('click', () => {
        mainWindow?.show()
        mainWindow?.focus()
      })

      notification.show()
    }
  }
}

function wrapHandler<T>(fn: () => T): T | { error: string } {
  try {
    return fn()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[IPC Error]', message)
    return { error: message }
  }
}

function registerIpcHandlers(): void {
  // Notes
  ipcMain.handle('notes:list', () => wrapHandler(() => listNotes()))
  ipcMain.handle('notes:get', (_e, id: string) => wrapHandler(() => getNote(id)))
  ipcMain.handle('notes:create', (_e, title: string, content: string) => wrapHandler(() => createNote(title, content)))
  ipcMain.handle('notes:update', (_e, id: string, updates: Parameters<typeof updateNote>[1]) => wrapHandler(() => updateNote(id, updates)))
  ipcMain.handle('notes:delete', (_e, id: string) => wrapHandler(() => deleteNote(id)))
  ipcMain.handle('notes:reorder', (_e, ids: string[]) => wrapHandler(() => reorderNotes(ids)))

  // Todos
  ipcMain.handle('todos:list', () => wrapHandler(() => listTodos()))
  ipcMain.handle('todos:get', (_e, id: string) => wrapHandler(() => getTodo(id)))
  ipcMain.handle('todos:create', (_e, title: string, content: string, priority: 'haute' | 'normale' | 'basse') => wrapHandler(() => createTodo(title, content, priority)))
  ipcMain.handle('todos:update', (_e, id: string, updates: Parameters<typeof updateTodo>[1]) => wrapHandler(() => updateTodo(id, updates)))
  ipcMain.handle('todos:delete', (_e, id: string) => wrapHandler(() => deleteTodo(id)))
  ipcMain.handle('todos:reorder', (_e, ids: string[]) => wrapHandler(() => reorderTodos(ids)))

  // Timers
  ipcMain.handle('timers:list', () => wrapHandler(() => listTimers()))
  ipcMain.handle('timers:get', (_e, id: string) => wrapHandler(() => getTimer(id)))
  ipcMain.handle('timers:create', (_e, title: string) => wrapHandler(() => createTimer(title)))
  ipcMain.handle('timers:update', (_e, id: string, updates: Parameters<typeof updateTimer>[1]) => wrapHandler(() => updateTimer(id, updates)))
  ipcMain.handle('timers:delete', (_e, id: string) => wrapHandler(() => deleteTimer(id)))
  ipcMain.handle('timers:reorder', (_e, ids: string[]) => wrapHandler(() => reorderTimers(ids)))

  // Export
  ipcMain.handle('item:export', async (_e, type: 'notes' | 'todos', id: string) => {
    try {
      const item = type === 'notes' ? getNote(id) : getTodo(id)
      if (!item) return { error: 'Introuvable' }
      const sourcePath = type === 'notes' ? getNotePath(id) : getTodoPath(id)
      const result = await dialog.showSaveDialog(mainWindow!, {
        title: 'Exporter',
        defaultPath: `${item.title || 'sans-titre'}.md`,
        filters: [{ name: 'Markdown', extensions: ['md'] }]
      })
      if (!result.canceled && result.filePath) {
        fs.copyFileSync(sourcePath, result.filePath)
        return { success: true }
      }
      return { success: false }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  // Import
  ipcMain.handle('item:import', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow!, {
        title: 'Importer des fichiers Markdown',
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Markdown', extensions: ['md'] }]
      })
      if (result.canceled || result.filePaths.length === 0) return []
      return importMarkdownFiles(result.filePaths)
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  // Settings
  ipcMain.handle('settings:get', () => wrapHandler(() => ({
    ...getSettings(),
    storagePath: getCurrentStoragePath()
  })))

  ipcMain.handle('settings:set', async (_e, updates: Parameters<typeof setSettings>[0]) => {
    try {
      const previous = getSettings()
      const next = setSettings(updates)

      if (updates.apiPort !== undefined && updates.apiPort !== previous.apiPort) {
        const api = await restartApiServer()
        return { ...next, api }
      }

      return next
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[IPC Error]', message)
      return { error: message }
    }
  })

  ipcMain.handle('api:get-info', () => wrapHandler(() => getApiInfo()))

  // Folder chooser
  ipcMain.handle('folder:choose', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Choisir le dossier de stockage',
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled) return null
    return result.filePaths[0]
  })

  // Window controls
  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:maximize', () => {
    if (process.platform === 'darwin') {
      mainWindow?.setFullScreen(!mainWindow.isFullScreen())
    } else {
      if (mainWindow?.isMaximized()) mainWindow.unmaximize()
      else mainWindow?.maximize()
    }
  })
  ipcMain.handle('window:close', () => mainWindow?.close())
}

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId(app.isPackaged ? 'com.banette.app' : process.execPath)
  }

  app.on('browser-window-created', (_, window) => {
    window.webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown') {
        if (app.isPackaged) {
          if (input.code === 'KeyR' && (input.control || input.meta)) event.preventDefault()
          if (input.code === 'KeyI' && (input.alt && input.meta || input.control && input.shift)) event.preventDefault()
        } else {
          if (input.code === 'F12') {
            if (window.webContents.isDevToolsOpened()) window.webContents.closeDevTools()
            else window.webContents.openDevTools({ mode: 'undocked' })
          }
        }
      }
    })
  })

  globalShortcut.register('CommandOrControl+Shift+B', () => {
    showMainWindow()
  })

  void startApiServer()
    .then((info) => {
      const suffix = info.usingFallbackPort ? ` (fallback from ${info.preferredPort})` : ''
      console.log(`[Banette API] listening on ${info.baseUrl}${suffix}`)
    })
    .catch((error) => {
      console.error('[Banette API] failed to start', error)
    })

  // Check work hours alerts every minute (only fires if a timer is running)
  setInterval(checkWorkHoursAlerts, 60 * 1000)

  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  stopAllRunningTimers()
  void stopApiServer().catch((error) => {
    console.error('[Banette API] failed to stop cleanly', error)
  })
})
