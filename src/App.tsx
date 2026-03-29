import { useState, useRef, useCallback, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { ItemList } from './components/ItemList'
import { ItemDetail } from './components/ItemDetail'
import { SettingsPanel } from './components/SettingsPanel'
import { Note, Todo, ItemType, AnyItem } from './types'

type View = 'list' | 'detail'

export function App(): JSX.Element {
  const [activeSection, setActiveSection] = useState<ItemType>('notes')
  const [view, setView] = useState<View>('list')
  const [selectedItem, setSelectedItem] = useState<AnyItem | null>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const refreshListRef = useRef<(() => void) | null>(null)

  // Load settings on startup
  useEffect(() => {
    window.electron.invoke('settings:get').then((s) => {
      const settings = s as { darkMode: boolean; storagePath: string; apiPort: number | null }
      if (settings.darkMode) {
        setDarkMode(true)
        document.documentElement.classList.add('dark')
      }
    })
  }, [])

  const handleToggleDarkMode = useCallback(async () => {
    const next = !darkMode
    setDarkMode(next)
    document.documentElement.classList.toggle('dark', next)
    await window.electron.invoke('settings:set', { darkMode: next })
  }, [darkMode])

  const handleSectionChange = (section: ItemType) => {
    setActiveSection(section)
    setView('list')
    setSelectedItem(null)
  }

  const handleSelectItem = (item: AnyItem) => {
    setSelectedItem(item)
    setView('detail')
  }

  const handleBack = () => {
    setView('list')
    setSelectedItem(null)
    refreshListRef.current?.()
  }

  const handleDeleted = () => {
    setView('list')
    setSelectedItem(null)
    refreshListRef.current?.()
  }

  const handleSaved = useCallback(() => {
    refreshListRef.current?.()
  }, [])

  const setRefresh = useCallback((fn: () => void) => {
    refreshListRef.current = fn
  }, [])

  const handleImported = useCallback(() => {
    refreshListRef.current?.()
  }, [])

  return (
    <div className="flex h-screen bg-paper-light overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-8 drag-region z-10 pointer-events-none" />

      <Sidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        darkMode={darkMode}
        onToggleDarkMode={handleToggleDarkMode}
        onOpenSettings={() => setShowSettings(true)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Window controls */}
        <div className="flex items-center justify-end px-3 py-1.5 gap-1.5 bg-paper-light border-b border-paper-border drag-region">
          <button onClick={() => window.electron.invoke('window:minimize')} className="w-3 h-3 rounded-full bg-yellow-400 hover:bg-yellow-500 transition-colors no-drag" title="Réduire" />
          <button onClick={() => window.electron.invoke('window:maximize')} className="w-3 h-3 rounded-full bg-green-400 hover:bg-green-500 transition-colors no-drag" title="Agrandir" />
          <button onClick={() => window.electron.invoke('window:close')} className="w-3 h-3 rounded-full bg-red-400 hover:bg-red-500 transition-colors no-drag" title="Fermer" />
        </div>

        <div className="flex-1 overflow-hidden">
          {view === 'list' && (
            <ItemList
              type={activeSection}
              onSelectItem={handleSelectItem}
              onRefreshRef={setRefresh}
              onImported={handleImported}
            />
          )}
          {view === 'detail' && selectedItem && (
            <ItemDetail
              item={selectedItem as Note | Todo}
              type={activeSection}
              onBack={handleBack}
              onDeleted={handleDeleted}
              onSaved={handleSaved}
            />
          )}
        </div>
      </div>

      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onStorageChanged={() => refreshListRef.current?.()}
        />
      )}
    </div>
  )
}
