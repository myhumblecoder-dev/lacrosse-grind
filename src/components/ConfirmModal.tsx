"use client"

interface ConfirmModalProps {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  /** The action cannot proceed; the destructive button is withheld. */
  blocked?: boolean
  /** Why it cannot proceed — shown in place of `message`. */
  blockedMessage?: string
  /** Optional way forward offered instead of confirming. */
  altLabel?: string
  onAlt?: () => void
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
  blocked = false,
  blockedMessage,
  altLabel,
  onAlt,
}: ConfirmModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
        {blocked ? (
          <p data-testid="confirm-blocked" className="mt-2 text-sm text-amber-300">
            {blockedMessage}
          </p>
        ) : (
          message && <p className="mt-2 text-sm text-zinc-400">{message}</p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            Cancel
          </button>
          {blocked
            ? altLabel && (
                <button
                  data-testid="confirm-alt"
                  onClick={onAlt}
                  className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-600"
                >
                  {altLabel}
                </button>
              )
            : (
                <button
                  onClick={onConfirm}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
                >
                  {confirmLabel}
                </button>
              )}
        </div>
      </div>
    </div>
  )
}
