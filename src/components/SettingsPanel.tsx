import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faFolder, faRotateLeft } from '@fortawesome/free-solid-svg-icons'

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
  const [defaultPath, setDefaultPath] = useState<string>('')
  const [saved, setSaved] = useState(false)
  const [workHours, setWorkHours] = useState<WorkHours>(DEFAULT_WORK_HOURS)

  useEffect(() => {
    window.electron.invoke('settings:get').then((s) => {
      const settings = s as { storagePath: string; workHours?: WorkHours }
      setStoragePath(settings.storagePath ?? '')
      setDefaultPath(settings.storagePath ?? '')
      if (settings.workHours) {
        setWorkHours({ ...DEFAULT_WORK_HOURS, ...settings.workHours })
      }
    })
  }, [])

  const handleChooseFolder = async (): Promise<void> => {
    const chosen = await window.electron.invoke('folder:choose') as string | null
    if (!chosen) return
    setStoragePath(chosen)
    await window.electron.invoke('settings:set', { storagePath: chosen })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    onStorageChanged()
  }

  const handleReset = async (): Promise<void> => {
    await window.electron.invoke('settings:set', { storagePath: null })
    const s = await window.electron.invoke('settings:get') as { storagePath: string }
    setStoragePath(s.storagePath ?? '')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    onStorageChanged()
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

            {saved && (
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
