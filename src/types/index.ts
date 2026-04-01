export type Priority = 'haute' | 'normale' | 'basse'

export interface Note {
  id: string
  title: string
  created: string
  updated: string
  content: string
  tags: string[]
  pinned: boolean
}

export interface Todo {
  id: string
  title: string
  created: string
  updated: string
  priority: Priority
  completed: boolean
  content: string
  tags: string[]
  pinned: boolean
}

export interface TimerSession {
  id: string
  date: string     // "30/01/2026"
  seconds: number
}

export interface TimerProject {
  id: string
  title: string
  created: string
  updated: string
  content: string
  tags: string[]
  pinned: boolean
  sessions: TimerSession[]
  running_since: string | null
  total_seconds: number
}

export type ItemType = 'notes' | 'todos' | 'timers'

export type AnyItem = Note | Todo | TimerProject

export function isTodo(item: AnyItem): item is Todo {
  return 'priority' in item
}

export function isTimerProject(item: AnyItem): item is TimerProject {
  return 'sessions' in item
}
