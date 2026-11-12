import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { cn } from '../../utils/cn'
import {
  ToastContext,
  type ToastApi,
  type ToastVariant,
} from './toast-context'

interface ToastItem {
  id: number
  variant: ToastVariant
  title: string
  description?: string
}

const variantClasses: Record<ToastVariant, string> = {
  success: 'border-emerald-200',
  error: 'border-rose-200',
  info: 'border-brand-200',
}

const iconClasses: Record<ToastVariant, string> = {
  success: 'bg-emerald-50 text-emerald-600',
  error: 'bg-rose-50 text-rose-600',
  info: 'bg-brand-50 text-brand-700',
}

const iconComponents = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)
  const timers = useRef<number[]>([])

  useEffect(() => {
    const activeTimers = timers.current
    return () => {
      activeTimers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const addToast = useCallback(
    (variant: ToastVariant, title: string, description?: string) => {
      nextId.current += 1
      const id = nextId.current
      setToasts((current) => [...current.slice(-3), { id, variant, title, description }])
      const timer = window.setTimeout(() => dismiss(id), 4_500)
      timers.current.push(timer)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      success: (title, description) => addToast('success', title, description),
      error: (title, description) => addToast('error', title, description),
      info: (title, description) => addToast('info', title, description),
    }),
    [addToast],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed right-3 bottom-3 z-[100] flex w-[calc(100%-1.5rem)] max-w-sm flex-col gap-2 sm:right-5 sm:bottom-5"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const Icon = iconComponents[toast.variant]
          return (
            <div
              key={toast.id}
              role={toast.variant === 'error' ? 'alert' : 'status'}
              className={cn(
                'animate-toast-in pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-3.5 shadow-[0_16px_36px_-12px_rgb(8_31_51_/_0.35)]',
                variantClasses[toast.variant],
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  iconClasses[toast.variant],
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">
                    {toast.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="icon-btn -mt-0.5 -mr-1 h-7 w-7 shrink-0"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
