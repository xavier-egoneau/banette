import { contextBridge, ipcRenderer } from 'electron'

export type NoteFile = {
  id: string
  title: string
  created: string
  updated: string
  content: string
}

export type TodoFile = {
  id: string
  title: string
  created: string
  updated: string
  priority: 'haute' | 'normale' | 'basse'
  completed: boolean
  content: string
}

const electronAPI = {
  invoke: (channel: string, ...args: unknown[]): Promise<unknown> => {
    const allowedChannels = [
      'notes:list',
      'notes:get',
      'notes:create',
      'notes:update',
      'notes:delete',
      'notes:reorder',
      'todos:list',
      'todos:get',
      'todos:create',
      'todos:update',
      'todos:delete',
      'todos:reorder',
      'window:minimize',
      'window:maximize',
      'window:close'
    ]
    if (allowedChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args)
    }
    return Promise.reject(new Error(`Channel "${channel}" not allowed`))
  }
}

contextBridge.exposeInMainWorld('electron', electronAPI)

declare global {
  interface Window {
    electron: typeof electronAPI
  }
}
