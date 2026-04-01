import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

export interface WorkHoursSlot {
  enabled: boolean
  time: string  // "12:30"
}

export interface WorkHours {
  enabled: boolean
  days: string[]  // ['mon', 'tue', 'wed', 'thu', 'fri']
  lunchBreak: WorkHoursSlot
  endOfDay: WorkHoursSlot
  alertMinutes: number
}

export interface Settings {
  darkMode: boolean
  storagePath: string | null
  workHours: WorkHours
}

const DEFAULT_SETTINGS: Settings = {
  darkMode: false,
  storagePath: null,
  workHours: {
    enabled: false,
    days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    lunchBreak: { enabled: true, time: '12:30' },
    endOfDay: { enabled: true, time: '18:00' },
    alertMinutes: 15
  }
}

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

export function getSettings(): Settings {
  try {
    const raw = fs.readFileSync(getSettingsPath(), 'utf-8')
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      workHours: { ...DEFAULT_SETTINGS.workHours, ...(parsed.workHours ?? {}) }
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function setSettings(updates: Partial<Settings>): Settings {
  const current = getSettings()
  const updated = {
    ...current,
    ...updates,
    workHours: updates.workHours
      ? { ...current.workHours, ...updates.workHours }
      : current.workHours
  }
  fs.writeFileSync(getSettingsPath(), JSON.stringify(updated, null, 2), 'utf-8')
  return updated
}
