import { useEffect, useRef, useCallback } from 'react'

export function useAutoSave<T>(
  value: T,
  onSave: (value: T) => Promise<void>,
  delay: number = 800
): { isSaving: boolean } {
  const isSavingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestValueRef = useRef(value)
  const isFirstRender = useRef(true)

  useEffect(() => {
    latestValueRef.current = value
  }, [value])

  const save = useCallback(async () => {
    isSavingRef.current = true
    try {
      await onSave(latestValueRef.current)
    } finally {
      isSavingRef.current = false
    }
  }, [onSave])

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      save()
    }, delay)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [value, delay, save])

  return { isSaving: isSavingRef.current }
}
