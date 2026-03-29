import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faFolder, faRotateLeft } from '@fortawesome/free-solid-svg-icons'
import type { BanetteApiInfo } from '../types/electron'

interface SettingsPanelProps {
  onClose: () => void
  onStorageChanged: () => void
}

export function SettingsPanel({ onClose, onStorageChanged }: SettingsPanelProps): JSX.Element {
  const [storagePath, setStoragePath] = useState<string>('')
  const [apiPortInput, setApiPortInput] = useState<string>('')
  const [apiInfo, setApiInfo] = useState<BanetteApiInfo | null>(null)
  const [savedSection, setSavedSection] = useState<'storage' | 'api' | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  useEffect(() => {
    window.electron.invoke('settings:get').then((s) => {
      const settings = s as { storagePath: string; apiPort: number | null }
      setStoragePath(settings.storagePath ?? '')
      setApiPortInput(String(settings.apiPort ?? ''))
    })
    window.electron.invoke('api:get-info').then((result) => {
      setApiInfo((result as BanetteApiInfo | null) ?? null)
    })
  }, [])

  const markSaved = (section: 'storage' | 'api') => {
    setSavedSection(section)
    setTimeout(() => setSavedSection(null), 2500)
  }

  const handleChooseFolder = async () => {
    const chosen = await window.electron.invoke('folder:choose') as string | null
    if (!chosen) return
    setStoragePath(chosen)
    await window.electron.invoke('settings:set', { storagePath: chosen })
    markSaved('storage')
    onStorageChanged()
  }

  const handleReset = async () => {
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
      </div>
    </div>
  )
}
