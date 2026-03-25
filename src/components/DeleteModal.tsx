interface DeleteModalProps {
  isOpen: boolean
  title: string
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteModal({ isOpen, title, onConfirm, onCancel }: DeleteModalProps): JSX.Element | null {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-ink-dark/20 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-paper-light border border-paper-border rounded-xl shadow-lg p-6 max-w-sm w-full mx-4">
        <h2 className="text-ink-dark font-semibold text-base mb-2 font-ui">
          Supprimer cet élément ?
        </h2>
        <p className="text-ink text-sm mb-5 font-ui">
          <span className="font-medium">"{title}"</span> sera supprimé définitivement.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-ui text-ink border border-paper-border rounded-lg hover:bg-paper-dark transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-ui text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}
