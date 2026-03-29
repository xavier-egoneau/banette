import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

export interface Settings {
  darkMode: boolean
  storagePath: string | null
  apiPort: number | null
}

const DEFAULT_SETTINGS: Settings = {
  darkMode: false,
  storagePath: null,
  apiPort: null
}

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

export function getSettings(): Settings {
  try {
    const raw = fs.readFileSync(getSettingsPath(), 'utf-8')
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function setSettings(updates: Partial<Settings>): Settings {
  const current = getSettings()
  const updated = { ...current, ...updates }
  fs.writeFileSync(getSettingsPath(), JSON.stringify(updated, null, 2), 'utf-8')
  return updated
}
