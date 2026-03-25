import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  invoke: (channel: string, ...args: unknown[]): Promise<unknown> => {
    const allowedChannels = [
      'notes:list', 'notes:get', 'notes:create', 'notes:update', 'notes:delete', 'notes:reorder',
      'todos:list', 'todos:get', 'todos:create', 'todos:update', 'todos:delete', 'todos:reorder',
      'window:minimize', 'window:maximize', 'window:close',
      'item:export', 'item:import',
      'settings:get', 'settings:set',
      'folder:choose'
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
