import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faFolder, faRotateLeft } from '@fortawesome/free-solid-svg-icons'
import type { BanetteApiInfo } from '../types/electron'

interface WorkHoursSlot {
  enabled: boolean
  time: string
}

interface WorkHours {
  enabled: boolean
  days: string[]
  lunchBreak: WorkHoursSlot
  endOfDay: WorkHoursSlot
  alertMinutes: number
}

interface SettingsPanelProps {
  onClose: () => void
  onStorageChanged: () => void
}

const DAYS = [
  { key: 'mon', label: 'L' },
  { key: 'tue', label: 'M' },
  { key: 'wed', label: 'M' },
  { key: 'thu', label: 'J' },
  { key: 'fri', label: 'V' },
  { key: 'sat', label: 'S' },
  { key: 'sun', label: 'D' }
]

const DEFAULT_WORK_HOURS: WorkHours = {
  enabled: false,
  days: ['mon', 'tue', 'wed', 'thu', 'fri'],
  lunchBreak: { enabled: true, time: '12:30' },
  endOfDay: { enabled: true, time: '18:00' },
  alertMinutes: 15
}

export function SettingsPanel({ onClose, onStorageChanged }: SettingsPanelProps): JSX.Element {
  const [storagePath, setStoragePath] = useState<string>('')
  const [apiPortInput, setApiPortInput] = useState<string>('')
  const [apiInfo, setApiInfo] = useState<BanetteApiInfo | null>(null)
  const [savedSection, setSavedSection] = useState<'storage' | 'api' | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [workHours, setWorkHours] = useState<WorkHours>(DEFAULT_WORK_HOURS)

  useEffect(() => {
    window.electron.invoke('settings:get').then((s) => {
      const settings = s as { storagePath: string; apiPort: number | null; workHours?: WorkHours }
      setStoragePath(settings.storagePath ?? '')
      setApiPortInput(String(settings.apiPort ?? ''))
      if (settings.workHours) {
        setWorkHours({ ...DEFAULT_WORK_HOURS, ...settings.workHours })
      }
    })
    window.electron.invoke('api:get-info').then((result) => {
      setApiInfo((result as BanetteApiInfo | null) ?? null)
    })
  }, [])

  const markSaved = (section: 'storage' | 'api') => {
    setSavedSection(section)
    setTimeout(() => setSavedSection(null), 2500)
  }

  const handleChooseFolder = async (): Promise<void> => {
    const chosen = await window.electron.invoke('folder:choose') as string | null
    if (!chosen) return
    setStoragePath(chosen)
    await window.electron.invoke('settings:set', { storagePath: chosen })
    markSaved('storage')
    onStorageChanged()
  }

  const handleReset = async (): Promise<void> => {
    await window.electron.invoke('settings:set', { storagePath: null })
    const s = await window.electron.invoke('settings:get') as { storagePath: string; apiPort: number | null }
    setStoragePath(s.storagePath ?? '')
    markSaved('storage')
    onStorageChanged()
  }

  const handleSaveApiPort = async () => {
    const trimmed = apiPortInput.trim()
    const parsed = trimmed === '' ? null : Number(trimmed)

    if (trimmed !== '' && (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535)) {
      setApiError('Entre un port valide entre 1 et 65535, ou laisse vide pour le port par défaut.')
      return
    }

    setApiError(null)
    const result = await window.electron.invoke('settings:set', { apiPort: parsed }) as {
      error?: string
      api?: BanetteApiInfo
    }

    if (result?.error) {
      setApiError(result.error)
      return
    }

    const settings = await window.electron.invoke('settings:get') as { apiPort: number | null }
    setApiPortInput(String(settings.apiPort ?? ''))

    if (result?.api) {
      setApiInfo(result.api)
    } else {
      const info = await window.electron.invoke('api:get-info') as BanetteApiInfo | null
      setApiInfo(info)
    }

    markSaved('api')
  }

  const handleResetApiPort = async () => {
    setApiPortInput('')
    setApiError(null)
    const result = await window.electron.invoke('settings:set', { apiPort: null }) as {
      error?: string
      api?: BanetteApiInfo
    }

    if (result?.error) {
      setApiError(result.error)
      return
    }

    const info = result?.api ?? await window.electron.invoke('api:get-info') as BanetteApiInfo | null
    setApiInfo(info)
    markSaved('api')
  }

  const saveWorkHours = async (updated: WorkHours): Promise<void> => {
    setWorkHours(updated)
    await window.electron.invoke('settings:set', { workHours: updated })
  }

  const toggleDay = (day: string): void => {
    const days = workHours.days.includes(day)
      ? workHours.days.filter((d) => d !== day)
      : [...workHours.days, day]
    saveWorkHours({ ...workHours, days })
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-paper-light border border-paper-border rounded-xl shadow-2xl w-[480px] max-w-[90vw] p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-ink-dark font-ui">Paramètres</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-light hover:text-ink hover:bg-paper-border/50 transition-colors"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* Storage section */}
        <div>
          <h3 className="text-xs font-semibold text-ink-light uppercase tracking-wider font-ui mb-3">
            Dossier de stockage
          </h3>

          <div className="bg-paper-dark border border-paper-border rounded-lg px-3 py-2 mb-3">
            <p className="text-xs font-ui text-ink-light mb-0.5">Emplacement actuel</p>
            <p className="text-sm font-ui text-ink-dark break-all">{storagePath || '—'}</p>
          </div>

          <p className="text-xs text-ink-light font-ui mb-4 leading-relaxed">
            Les fichiers existants ne seront pas déplacés automatiquement. Copiez-les manuellement dans le nouveau dossier si nécessaire.
          </p>

          <div className="flex gap-2">
            <button
              onClick={handleChooseFolder}
              className="flex items-center gap-2 px-3 py-2 bg-ink text-paper-light text-sm font-ui rounded-lg hover:bg-ink-dark transition-colors"
            >
              <FontAwesomeIcon icon={faFolder} className="text-xs" />
              Changer le dossier
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-2 border border-paper-border text-ink text-sm font-ui rounded-lg hover:bg-paper-border/50 transition-colors"
              title="Revenir au dossier par défaut (Documents/Banette)"
            >
              <FontAwesomeIcon icon={faRotateLeft} className="text-xs" />
              Par défaut
            </button>

            {savedSection === 'storage' && (
              <span className="flex items-center text-xs text-ink-light font-ui ml-1">
                Sauvegardé
              </span>
            )}
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-xs font-semibold text-ink-light uppercase tracking-wider font-ui mb-3">
            API locale
          </h3>

          <div className="bg-paper-dark border border-paper-border rounded-lg px-3 py-2 mb-3">
            <p className="text-xs font-ui text-ink-light mb-0.5">URL actuelle</p>
            <p className="text-sm font-ui text-ink-dark break-all">{apiInfo?.baseUrl ?? '—'}</p>
            {apiInfo?.usingFallbackPort && (
              <p className="text-xs font-ui text-amber-700 mt-1">
                Le port préféré {apiInfo.preferredPort} était occupé. Banette a basculé sur {apiInfo.port}.
              </p>
            )}
          </div>

          <label className="block text-xs text-ink-light font-ui mb-1">
            Port préféré
          </label>
          <input
            type="number"
            min="1"
            max="65535"
            value={apiPortInput}
            onChange={(e) => setApiPortInput(e.target.value)}
            placeholder="3210"
            className="w-full bg-paper-dark border border-paper-border rounded-lg px-3 py-2 text-sm font-ui text-ink-dark outline-none focus:border-ink-light"
          />

          <p className="text-xs text-ink-light font-ui mt-2 leading-relaxed">
            Si ce port est déjà utilisé, Banette choisira automatiquement le prochain port libre.
            Laisse vide pour revenir au port par défaut `3210`.
          </p>

          {apiError && (
            <p className="text-xs text-red-600 font-ui mt-2">{apiError}</p>
          )}

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSaveApiPort}
              className="px-3 py-2 bg-ink text-paper-light text-sm font-ui rounded-lg hover:bg-ink-dark transition-colors"
            >
              Enregistrer le port
            </button>

            <button
              onClick={handleResetApiPort}
              className="flex items-center gap-2 px-3 py-2 border border-paper-border text-ink text-sm font-ui rounded-lg hover:bg-paper-border/50 transition-colors"
              title="Revenir au port par défaut"
            >
              <FontAwesomeIcon icon={faRotateLeft} className="text-xs" />
              Port par défaut
            </button>

            {savedSection === 'api' && (
              <span className="flex items-center text-xs text-ink-light font-ui ml-1">
                Sauvegardé
              </span>
            )}
          </div>
        </div>

        <div className="border-t border-paper-border my-6" />

        {/* Work hours section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-ink-light uppercase tracking-wider font-ui">
              Alertes heures de travail
            </h3>
            <button
              onClick={() => saveWorkHours({ ...workHours, enabled: !workHours.enabled })}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                workHours.enabled ? 'bg-ink' : 'bg-paper-border'
              }`}
              title={workHours.enabled ? 'Désactiver' : 'Activer'}
            >
              <span
                className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
                style={{ left: workHours.enabled ? '22px' : '2px' }}
              />
            </button>
          </div>

          <div className={workHours.enabled ? '' : 'opacity-40 pointer-events-none'}>
            {/* Days */}
            <div className="mb-4">
              <p className="text-xs text-ink-light font-ui mb-2">Jours de travail</p>
              <div className="flex gap-1.5">
                {DAYS.map((d) => (
                  <button
                    key={d.key}
                    onClick={() => toggleDay(d.key)}
                    className={`w-8 h-8 rounded-lg text-xs font-ui font-medium transition-colors ${
                      workHours.days.includes(d.key)
                        ? 'bg-ink text-paper-light'
                        : 'bg-paper-border text-ink hover:bg-paper-border/70'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Slots */}
            <div className="space-y-3 mb-4">
              {[
                { key: 'lunchBreak' as const, label: 'Pause déjeuner' },
                { key: 'endOfDay' as const, label: 'Fin de journée' }
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      saveWorkHours({
                        ...workHours,
                        [key]: { ...workHours[key], enabled: !workHours[key].enabled }
                      })
                    }
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      workHours[key].enabled
                        ? 'bg-ink border-ink'
                        : 'border-paper-border hover:border-ink-light'
                    }`}
                  >
                    {workHours[key].enabled && (
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                        <path d="M10 3L5 8.5 2 5.5l-1 1 4 4 6-7z" />
                      </svg>
                    )}
                  </button>
                  <span className="text-sm font-ui text-ink w-32">{label}</span>
                  <input
                    type="time"
                    value={workHours[key].time}
                    onChange={(e) =>
                      saveWorkHours({
                        ...workHours,
                        [key]: { ...workHours[key], time: e.target.value }
                      })
                    }
                    className="text-sm font-ui text-ink-dark bg-paper-border/50 border border-paper-border rounded px-2 py-1 outline-none focus:border-ink-light"
                  />
                </div>
              ))}
            </div>

            {/* Alert minutes */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-ui text-ink">Alerte</span>
              <input
                type="number"
                min={1}
                max={60}
                value={workHours.alertMinutes}
                onChange={(e) =>
                  saveWorkHours({
                    ...workHours,
                    alertMinutes: Math.min(60, Math.max(1, parseInt(e.target.value) || 15))
                  })
                }
                className="w-14 text-sm font-ui text-ink-dark bg-paper-border/50 border border-paper-border rounded px-2 py-1 text-center outline-none focus:border-ink-light"
              />
              <span className="text-sm font-ui text-ink">min avant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
