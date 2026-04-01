import { useEffect, useRef, useCallback, useState } from 'react'

export function useAutoSave<T>(
  value: T,
  onSave: (value: T) => Promise<void>,
  delay: number = 800
): { isSaving: boolean; lastSaved: Date | null } {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestValueRef = useRef(value)
  const isFirstRender = useRef(true)

  useEffect(() => {
    latestValueRef.current = value
  }, [value])

  const save = useCallback(async () => {
    setIsSaving(true)
    try {
      await onSave(latestValueRef.current)
      setLastSaved(new Date())
    } finally {
      setIsSaving(false)
    }
  }, [onSave])

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { save() }, delay)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [value, delay, save])

  useEffect(() => {
    if (!lastSaved) return
    const t = setTimeout(() => setLastSaved(null), 3000)
    return () => clearTimeout(t)
  }, [lastSaved])

  return { isSaving, lastSaved }
}
