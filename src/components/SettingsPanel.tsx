import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faFolder, faRotateLeft } from '@fortawesome/free-solid-svg-icons'

interface SettingsPanelProps {
  onClose: () => void
  onStorageChanged: () => void
}

export function SettingsPanel({ onClose, onStorageChanged }: SettingsPanelProps): JSX.Element {
  const [storagePath, setStoragePath] = useState<string>('')
  const [defaultPath, setDefaultPath] = useState<string>('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.electron.invoke('settings:get').then((s) => {
      const settings = s as { storagePath: string }
      setStoragePath(settings.storagePath ?? '')
      setDefaultPath(settings.storagePath ?? '')
    })
  }, [])

  const handleChooseFolder = async () => {
    const chosen = await window.electron.invoke('folder:choose') as string | null
    if (!chosen) return
    setStoragePath(chosen)
    await window.electron.invoke('settings:set', { storagePath: chosen })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    onStorageChanged()
  }

  const handleReset = async () => {
    await window.electron.invoke('settings:set', { storagePath: null })
    const s = await window.electron.invoke('settings:get') as { storagePath: string }
    setStoragePath(s.storagePath ?? '')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    onStorageChanged()
  }

  const isCustomPath = storagePath !== defaultPath || storagePath !== ''

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-paper-light border border-paper-border rounded-xl shadow-2xl w-[480px] max-w-[90vw] p-6"
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
      </div>
    </div>
  )
}
