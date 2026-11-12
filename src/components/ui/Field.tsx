import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface FieldProps {
  label: string
  htmlFor: string
  children: ReactNode
  required?: boolean
  error?: string
  hint?: string
  className?: string
}

export function Field({
  label,
  htmlFor,
  children,
  required = false,
  error,
  hint,
  className,
}: FieldProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="ml-1 text-rose-500" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p className="field-error" id={`${htmlFor}-error`} role="alert">
          <span
            className="mt-1 h-1 w-1 shrink-0 rounded-full bg-rose-500"
            aria-hidden="true"
          />
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint" id={`${htmlFor}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}
