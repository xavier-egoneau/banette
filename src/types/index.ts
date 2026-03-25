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

export type ItemType = 'notes' | 'todos'

export type AnyItem = Note | Todo

export function isTodo(item: AnyItem): item is Todo {
  return 'priority' in item
}
