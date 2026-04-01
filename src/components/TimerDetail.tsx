import { useState, useEffect, useCallback, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faThumbtack, faTrash, faPlay, faStop, faXmark, faGear } from '@fortawesome/free-solid-svg-icons'
import { TimerProject, TimerSession } from '../types'
import { DeleteModal } from './DeleteModal'
import { useAutoSave } from '../hooks/useAutoSave'
import { useTagEditor } from '../hooks/useTagEditor'
import { formatDate, formatSeconds } from '../utils/format'

interface TimerDetailProps {
  item: TimerProject
  onBack: () => void
  onDeleted: () => void
  onSaved?: () => void
  onOpenSettings?: () => void
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const parts = []
  if (h > 0) parts.push(String(h).padStart(2, '0'))
  parts.push(String(m).padStart(2, '0'))
  parts.push(String(s).padStart(2, '0'))
  return parts.join(':')
}

export function TimerDetail({ item, onBack, onDeleted, onSaved, onOpenSettings }: TimerDetailProps): JSX.Element {
  const [title, setTitle] = useState(item.title)
  const [pinned, setPinned] = useState(item.pinned ?? false)
  const [sessions, setSessions] = useState<TimerSession[]>(item.sessions ?? [])
  const [runningSince, setRunningSince] = useState<string | null>(item.running_since)
  const [elapsed, setElapsed] = useState(0)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)
  const [workHoursEnabled, setWorkHoursEnabled] = useState(true)
  const titleRef = useRef<HTMLInputElement>(null)

  const { tags, tagInput, setTagInput, addTag, removeTag, resetTags } = useTagEditor(item.tags ?? [])

  useEffect(() => {
    setTitle(item.title)
    resetTags(item.tags ?? [])
    setPinned(item.pinned ?? false)
    setSessions(item.sessions ?? [])
    setRunningSince(item.running_since)
    requestAnimationFrame(() => {
      titleRef.current?.focus()
      titleRef.current?.select()
    })
  }, [item.id])

  // Check work hours config whenever timer is active
  useEffect(() => {
    if (!runningSince) return
    window.electron.invoke('settings:get').then((s) => {
      const settings = s as { workHours?: { enabled: boolean } }
      setWorkHoursEnabled(settings.workHours?.enabled ?? false)
    })
  }, [runningSince])

  // Live timer counter
  useEffect(() => {
    if (!runningSince) {
      setElapsed(0)
      return
    }
    const update = (): void => {
      setElapsed(Math.floor((Date.now() - new Date(runningSince).getTime()) / 1000))
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [runningSince])

  const saveMetadata = useCallback(
    async (data: { title: string; tags: string[]; pinned: boolean }) => {
      await window.electron.invoke('timers:update', item.id, {
        title: data.title,
        tags: data.tags,
        pinned: data.pinned
      })
      onSaved?.()
    },
    [item.id, onSaved]
  )

  const { isSaving, lastSaved } = useAutoSave({ title, tags, pinned }, saveMetadata)

  const handleStart = async (): Promise<void> => {
    const now = new Date().toISOString()
    await window.electron.invoke('timers:update', item.id, { running_since: now })
    setRunningSince(now)
  }

  const handleStop = async (): Promise<void> => {
    if (!runningSince) return
    const elapsedSeconds = Math.floor((Date.now() - new Date(runningSince).getTime()) / 1000)
    if (elapsedSeconds < 1) return
    const today = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    const newSession: TimerSession = {
      id: crypto.randomUUID(),
      date: today,
      seconds: elapsedSeconds
    }
    const newSessions = [...sessions, newSession]
    const newTotal = newSessions.reduce((sum, s) => sum + s.seconds, 0)
    await window.electron.invoke('timers:update', item.id, {
      sessions: newSessions,
      running_since: null,
      total_seconds: newTotal
    })
    setSessions(newSessions)
    setRunningSince(null)
    onSaved?.()
  }

  const handleSessionChange = async (id: string, field: 'hours' | 'minutes', value: number): Promise<void> => {
    const updated = sessions.map((s) => {
      if (s.id !== id) return s
      const h = field === 'hours' ? Math.max(0, value) : Math.floor(s.seconds / 3600)
      const m = field === 'minutes' ? Math.min(59, Math.max(0, value)) : Math.floor((s.seconds % 3600) / 60)
      const newSeconds = h * 3600 + m * 60
      if (newSeconds === 0) return s  // Prevent 0-second sessions
      return { ...s, seconds: newSeconds }
    })
    const newTotal = updated.reduce((sum, s) => sum + s.seconds, 0)
    setSessions(updated)
    await window.electron.invoke('timers:update', item.id, { sessions: updated, total_seconds: newTotal })
    onSaved?.()
  }

  const handleDeleteSession = async (id: string): Promise<void> => {
    const updated = sessions.filter((s) => s.id !== id)
    const newTotal = updated.reduce((sum, s) => sum + s.seconds, 0)
    setSessions(updated)
    await window.electron.invoke('timers:update', item.id, { sessions: updated, total_seconds: newTotal })
    onSaved?.()
  }

  const handleDelete = async (): Promise<void> => {
    await window.electron.invoke('timers:delete', item.id)
    setShowDeleteModal(false)
    onDeleted()
  }

  const totalSeconds = sessions.reduce((sum, s) => sum + s.seconds, 0)

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-paper-border drag-region">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-ink hover:text-ink-dark font-ui transition-colors no-drag"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
          <span>Retour</span>
        </button>

        <div className="flex items-center gap-1 no-drag">
          {isSaving ? (
            <span className="text-xs text-ink-light font-ui opacity-70 mr-1">Enregistrement…</span>
          ) : lastSaved ? (
            <span className="text-xs text-ink-light font-ui opacity-70 mr-1">Sauvegardé</span>
          ) : null}

          <button
            onClick={() => setPinned((p) => !p)}
            className={`p-1.5 rounded transition-colors ${
              pinned ? 'text-amber-500 hover:text-amber-600' : 'text-ink-light hover:text-ink'
            }`}
            title={pinned ? 'Désépingler' : 'Épingler'}
          >
            <FontAwesomeIcon icon={faThumbtack} className="text-xs" />
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-ui transition-colors px-2 py-1 rounded hover:bg-red-50 ml-1"
          >
            <FontAwesomeIcon icon={faTrash} className="text-xs" />
            <span>Supprimer</span>
          </button>
        </div>
      </div>

      {/* Title + tags */}
      <div className="px-4 pt-4 pb-3 border-b border-paper-border">
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nom du projet"
          className="w-full text-xl font-semibold text-ink-dark bg-transparent border-none outline-none font-content placeholder-ink-light/40"
        />

        <div className="flex flex-wrap items-center gap-1 mt-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-paper-border text-ink-dark text-xs font-ui rounded-full"
            >
              #{tag}
              <button
                onClick={() => removeTag(tag)}
                className="hover:text-red-500 transition-colors leading-none"
              >
                ×
              </button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                addTag(tagInput)
              }
              if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
                removeTag(tags[tags.length - 1])
              }
            }}
            placeholder={tags.length === 0 ? 'Ajouter un tag…' : ''}
            className="text-xs font-ui bg-transparent outline-none text-ink placeholder-ink-light/40 min-w-[100px]"
          />
        </div>
      </div>

      {/* Timer control */}
      <div className="px-4 py-6 border-b border-paper-border flex flex-col items-center gap-4">
        {runningSince ? (
          <>
            <span className="text-3xl font-mono text-ink-dark tracking-widest tabular-nums">
              {formatElapsed(elapsed)}
            </span>
            <button
              onClick={handleStop}
              className="flex items-center gap-2 px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-ui font-medium rounded-lg transition-colors"
            >
              <FontAwesomeIcon icon={faStop} />
              <span>Arrêter</span>
            </button>
          </>
        ) : (
          <button
            onClick={handleStart}
            className="flex items-center gap-2 px-6 py-2.5 bg-ink hover:bg-ink-dark text-paper-light font-ui font-medium rounded-lg transition-colors"
          >
            <FontAwesomeIcon icon={faPlay} />
            <span>Démarrer</span>
          </button>
        )}
      </div>

      {/* Work hours nudge banner */}
      {runningSince && !workHoursEnabled && (
        <div className="mx-4 mt-3 mb-1 flex items-center gap-3 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg">
          <FontAwesomeIcon icon={faGear} className="text-amber-500 flex-shrink-0 text-sm" />
          <p className="text-xs font-ui text-amber-800 dark:text-amber-300 flex-1 leading-relaxed">
            Configure tes heures de travail pour recevoir des alertes avant de partir.
          </p>
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="flex-shrink-0 text-xs font-ui font-medium text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 underline underline-offset-2 transition-colors"
            >
              Configurer
            </button>
          )}
        </div>
      )}

      {/* Sessions */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {sessions.length === 0 ? (
          <p className="text-sm text-ink-light font-ui text-center py-8 opacity-60">
            Aucune session enregistrée
          </p>
        ) : (
          <>
            <div>
              {sessions.map((session) => {
                const h = Math.floor(session.seconds / 3600)
                const m = Math.floor((session.seconds % 3600) / 60)
                return (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 py-2.5 border-b border-paper-line/50"
                  >
                    <span className="text-sm font-ui text-ink-light w-28 flex-shrink-0">
                      {session.date}
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={h}
                      onChange={(e) =>
                        handleSessionChange(session.id, 'hours', parseInt(e.target.value) || 0)
                      }
                      className="w-14 text-sm font-ui text-ink-dark bg-paper-border/50 border border-paper-border rounded px-2 py-1 text-center outline-none focus:border-ink-light"
                    />
                    <span className="text-xs text-ink-light font-ui">h</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={m}
                      onChange={(e) =>
                        handleSessionChange(session.id, 'minutes', parseInt(e.target.value) || 0)
                      }
                      className="w-14 text-sm font-ui text-ink-dark bg-paper-border/50 border border-paper-border rounded px-2 py-1 text-center outline-none focus:border-ink-light"
                    />
                    <span className="text-xs text-ink-light font-ui">min</span>
                    <button
                      onClick={() => setSessionToDelete(session.id)}
                      className="ml-auto text-ink-light hover:text-red-500 transition-colors p-1"
                      title="Supprimer la session"
                    >
                      <FontAwesomeIcon icon={faXmark} className="text-xs" />
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-paper-border flex items-center justify-between">
              <span className="text-sm font-ui font-semibold text-ink-dark">Total</span>
              <span className="text-sm font-ui font-semibold text-ink-dark">
                {formatSeconds(totalSeconds)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-paper-border bg-paper-dark/30">
        <p className="text-xs text-ink-light font-ui">Créé le {formatDate(item.created)}</p>
      </div>

      <DeleteModal
        isOpen={showDeleteModal}
        title={title}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />

      <DeleteModal
        isOpen={sessionToDelete !== null}
        title="cette session"
        onConfirm={async () => {
          if (sessionToDelete) await handleDeleteSession(sessionToDelete)
          setSessionToDelete(null)
        }}
        onCancel={() => setSessionToDelete(null)}
      />
    </div>
  )
}
