import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'

type ToastKind = 'info' | 'success' | 'error'

type Toast = {
  id: string
  kind: ToastKind
  message: string
}

type ToastContextValue = {
  push: (kind: ToastKind, message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>')
  }
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, kind, message }])
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4500)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const Icon = toast.kind === 'success' ? CheckCircle2 : toast.kind === 'error' ? AlertTriangle : Info
  const color =
    toast.kind === 'success'
      ? 'border-[--color-jade]/40 text-[--color-jade]'
      : toast.kind === 'error'
        ? 'border-[--color-vermilion]/40 text-[--color-vermilion]'
        : 'border-[--color-ink]/15 text-[--color-ink]'

  return (
    <div
      role="status"
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-white px-4 py-3 shadow-md ${color}`}
    >
      <Icon size={18} className="mt-0.5 flex-none" />
      <p className="flex-1 text-sm text-[--color-ink]">{toast.message}</p>
      <button
        onClick={onDismiss}
        aria-label="dismiss"
        className="-mr-1 -mt-1 flex h-6 w-6 items-center justify-center rounded text-[--color-mist-400] hover:bg-[--color-mist-100]"
      >
        <X size={14} />
      </button>
    </div>
  )
}
