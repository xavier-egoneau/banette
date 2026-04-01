import { useState } from 'react'

export function useTagEditor(initialTags: string[]): {
  tags: string[]
  setTags: React.Dispatch<React.SetStateAction<string[]>>
  tagInput: string
  setTagInput: React.Dispatch<React.SetStateAction<string>>
  addTag: (raw: string) => void
  removeTag: (tag: string) => void
  resetTags: (newTags: string[]) => void
} {
  const [tags, setTags] = useState<string[]>(initialTags)
  const [tagInput, setTagInput] = useState('')

  const addTag = (raw: string): void => {
    const tag = raw.toLowerCase().replace(/[^a-z0-9-_]/g, '').trim()
    if (tag && !tags.includes(tag)) setTags((prev) => [...prev, tag])
    setTagInput('')
  }

  const removeTag = (tag: string): void => setTags((prev) => prev.filter((t) => t !== tag))

  const resetTags = (newTags: string[]): void => {
    setTags(newTags)
    setTagInput('')
  }

  return { tags, setTags, tagInput, setTagInput, addTag, removeTag, resetTags }
}
