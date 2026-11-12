import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

type KpiAccent = 'brand' | 'cyan' | 'gold' | 'emerald' | 'navy'

interface KpiCardProps {
  label: string
  value: string
  icon: LucideIcon
  accent: KpiAccent
  description: ReactNode
  children?: ReactNode
}

const accentClasses: Record<
  KpiAccent,
  { bar: string; icon: string; dot: string }
> = {
  brand: {
    bar: 'bg-brand-500',
    icon: 'bg-brand-50 text-brand-700',
    dot: 'bg-brand-500',
  },
  cyan: {
    bar: 'bg-cyan-500',
    icon: 'bg-cyan-50 text-cyan-700',
    dot: 'bg-cyan-500',
  },
  gold: {
    bar: 'bg-gold-400',
    icon: 'bg-gold-100 text-gold-600',
    dot: 'bg-gold-400',
  },
  emerald: {
    bar: 'bg-emerald-500',
    icon: 'bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  navy: {
    bar: 'bg-ink-800',
    icon: 'bg-ink-50 text-ink-800',
    dot: 'bg-ink-800',
  },
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
  description,
  children,
}: KpiCardProps) {
  const classes = accentClasses[accent]

  return (
    <article className="card relative overflow-hidden p-4 sm:p-5">
      <span
        className={cn('absolute inset-x-0 top-0 h-[2.5px]', classes.bar)}
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-3">
        <p className="pt-0.5 text-[10px] font-bold tracking-[0.11em] text-slate-500 uppercase">
          {label}
        </p>
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
            classes.icon,
          )}
        >
          <Icon className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2.5 font-display text-[30px] leading-none font-bold tracking-[-0.04em] text-ink-950">
        {value}
      </p>
      <div className="mt-2 text-[11px] leading-5 text-slate-500">{description}</div>
      {children}
    </article>
  )
}
