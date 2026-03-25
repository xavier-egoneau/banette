import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell, dialog, globalShortcut } from 'electron'
import * as fs from 'fs'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import {
  listNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  reorderNotes,
  listTodos,
  getTodo,
  createTodo,
  updateTodo,
  deleteTodo,
  reorderTodos,
  getNotePath,
  getTodoPath
} from './fileSystem'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

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
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    event.preventDefault()
    mainWindow?.hide()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createTray(): void {
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Ouvrir Banette',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      }
    },
    { type: 'separator' },
    {
      label: 'Quitter',
      click: () => {
        app.exit(0)
      }
    }
  ])

  tray.setToolTip('Banette')
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow?.show()
      mainWindow?.focus()
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
  ipcMain.handle('notes:get', (_event, id: string) => wrapHandler(() => getNote(id)))
  ipcMain.handle('notes:create', (_event, title: string, content: string) =>
    wrapHandler(() => createNote(title, content))
  )
  ipcMain.handle('notes:update', (_event, id: string, updates: Parameters<typeof updateNote>[1]) =>
    wrapHandler(() => updateNote(id, updates))
  )
  ipcMain.handle('notes:delete', (_event, id: string) => wrapHandler(() => deleteNote(id)))
  ipcMain.handle('notes:reorder', (_event, orderedIds: string[]) =>
    wrapHandler(() => reorderNotes(orderedIds))
  )

  // Todos
  ipcMain.handle('todos:list', () => wrapHandler(() => listTodos()))
  ipcMain.handle('todos:get', (_event, id: string) => wrapHandler(() => getTodo(id)))
  ipcMain.handle(
    'todos:create',
    (_event, title: string, content: string, priority: 'haute' | 'normale' | 'basse') =>
      wrapHandler(() => createTodo(title, content, priority))
  )
  ipcMain.handle('todos:update', (_event, id: string, updates: Parameters<typeof updateTodo>[1]) =>
    wrapHandler(() => updateTodo(id, updates))
  )
  ipcMain.handle('todos:delete', (_event, id: string) => wrapHandler(() => deleteTodo(id)))
  ipcMain.handle('todos:reorder', (_event, orderedIds: string[]) =>
    wrapHandler(() => reorderTodos(orderedIds))
  )

  // Export
  ipcMain.handle('item:export', async (_event, type: 'notes' | 'todos', id: string) => {
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

  // Window controls
  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.handle('window:close', () => mainWindow?.hide())
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.banette.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Global shortcut to show/focus the app from anywhere
  globalShortcut.register('CommandOrControl+Shift+B', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.focus()
    } else {
      mainWindow?.show()
      mainWindow?.focus()
    }
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
})

app.on('window-all-closed', () => {
  // On macOS, keep app running in tray
  if (process.platform !== 'darwin') {
    // Do nothing - we manage this via tray
  }
})

// Allow proper quit via tray menu
app.on('before-quit', () => {
  mainWindow?.removeAllListeners('close')
})
