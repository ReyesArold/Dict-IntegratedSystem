import {
  Activity,
  CarFront,
  Database,
  FolderKanban,
  GraduationCap,
  UserPlus,
} from 'lucide-react'
import type { ActivityEntity, ActivityLog } from '../../types'
import { formatDateTime, formatRelativeTime } from '../../utils/formatters'
import { cn } from '../../utils/cn'

interface ActivityFeedProps {
  activities: ActivityLog[]
}

const entityMeta: Record<
  ActivityEntity,
  {
    icon: typeof FolderKanban
    iconClass: string
    label: string
  }
> = {
  project: {
    icon: FolderKanban,
    iconClass: 'border-brand-100 bg-brand-50 text-brand-700',
    label: 'Project',
  },
  training: {
    icon: GraduationCap,
    iconClass: 'border-violet-100 bg-violet-50 text-violet-700',
    label: 'Training',
  },
  participant: {
    icon: UserPlus,
    iconClass: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    label: 'Trainee',
  },
  trip: {
    icon: CarFront,
    iconClass: 'border-cyan-100 bg-cyan-50 text-cyan-700',
    label: 'Trip',
  },
  system: {
    icon: Database,
    iconClass: 'border-slate-200 bg-slate-50 text-slate-600',
    label: 'System',
  },
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <section className="card flex h-full flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-[15px] font-bold text-ink-950">Recent Activity</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Latest changes saved on this workstation
          </p>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
          <Activity className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>

      {activities.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
            <Activity className="h-4.5 w-4.5" aria-hidden="true" />
          </span>
          <p className="mt-3 text-xs font-semibold text-slate-600">
            No recent activity
          </p>
          <p className="mt-1 text-[11px] leading-5 text-slate-400">
            Updates to projects, trainings, trainee rosters, and trips will appear here.
          </p>
        </div>
      ) : (
        <ol className="flex-1 px-5 py-4">
          {activities.map((entry, index) => {
            const meta = entityMeta[entry.entityType]
            const Icon = meta.icon
            const isLast = index === activities.length - 1

            return (
              <li key={entry.id ?? `${entry.occurredAt}-${index}`} className="relative flex gap-3">
                {!isLast ? (
                  <span
                    className="absolute top-8 bottom-0 left-[15px] w-px bg-slate-200"
                    aria-hidden="true"
                  />
                ) : null}
                <span
                  className={cn(
                    'relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                    meta.iconClass,
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <div className={cn('min-w-0 flex-1', isLast ? 'pb-1' : 'pb-4')}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold tracking-[0.08em] text-slate-400 uppercase">
                      {meta.label}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden="true" />
                    <span className="text-[9px] font-medium text-slate-400 capitalize">
                      {entry.action}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] leading-5 text-slate-700">
                    {entry.description}
                  </p>
                  <time
                    className="mt-1 block text-[10px] text-slate-400"
                    dateTime={entry.occurredAt}
                    title={formatDateTime(entry.occurredAt)}
                  >
                    {formatRelativeTime(entry.occurredAt)}
                  </time>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      <div className="mt-auto border-t border-slate-100 bg-slate-50/60 px-5 py-2.5">
        <p className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          Changes are saved automatically to your local database.
        </p>
      </div>
    </section>
  )
}
