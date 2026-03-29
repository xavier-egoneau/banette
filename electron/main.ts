import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell, dialog, globalShortcut } from 'electron'
import * as fs from 'fs'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import {
  listNotes, getNote, createNote, updateNote, deleteNote, reorderNotes,
  listTodos, getTodo, createTodo, updateTodo, deleteTodo, reorderTodos,
  getNotePath, getTodoPath, getCurrentStoragePath, importMarkdownFiles
} from './fileSystem'
import { getSettings, setSettings } from './settings'
import { getApiInfo, startApiServer, stopApiServer, restartApiServer } from './apiServer'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function showMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (!mainWindow.isVisible()) mainWindow.show()
  mainWindow.focus()
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

  mainWindow.on('close', () => {
    mainWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  setTimeout(() => {
    showMainWindow()
  }, 1500)
}

function createTray(): void {
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Ouvrir Banette',
      click: () => { showMainWindow() }
    },
    { type: 'separator' },
    { label: 'Quitter', click: () => { app.exit(0) } }
  ])

  tray.setToolTip('Banette')
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide()
    } else {
      showMainWindow()
    }
  })
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

  ipcMain.handle('settings:set', async (_e, updates: { darkMode?: boolean; storagePath?: string | null; apiPort?: number | null }) => {
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
  ipcMain.handle('window:close', () => {
    mainWindow?.close()
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.banette.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
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

  registerIpcHandlers()
  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  void stopApiServer().catch((error) => {
    console.error('[Banette API] failed to stop cleanly', error)
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  mainWindow?.removeAllListeners('close')
})
