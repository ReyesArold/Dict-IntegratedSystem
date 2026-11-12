import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PROJECT_STATUSES, type Project } from '../../types'
import { formatNumber, formatPesoCompact, percentage } from '../../utils/formatters'
import { projectStatusHex } from '../../utils/status'

interface ProjectStatusChartProps {
  projects: Project[]
}

const RADIUS = 15.9155

export function ProjectStatusChart({ projects }: ProjectStatusChartProps) {
  const total = projects.length
  const counts = Object.fromEntries(
    PROJECT_STATUSES.map((status) => [
      status,
      projects.filter((project) => project.status === status).length,
    ]),
  ) as Record<(typeof PROJECT_STATUSES)[number], number>

  const totalBudget = projects.reduce((sum, project) => sum + project.budget, 0)
  const percentages = PROJECT_STATUSES.map((status) =>
    total ? (counts[status] / total) * 100 : 0,
  )
  const segments = PROJECT_STATUSES.map((status, index) => ({
    status,
    count: counts[status],
    percentage: percentages[index],
    offset: percentages
      .slice(0, index)
      .reduce((sum, value) => sum + value, 0),
  }))

  return (
    <section className="card overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-[15px] font-bold text-ink-950">
            Project Status Distribution
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Portfolio health across all monitored projects
          </p>
        </div>
        <Link
          to="/projects"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-700 transition hover:bg-brand-50"
        >
          View all
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid gap-6 px-5 py-5 sm:grid-cols-[180px_1fr] sm:items-center sm:px-6">
        <div className="relative mx-auto h-[168px] w-[168px]">
          <svg
            viewBox="0 0 42 42"
            className="h-full w-full -rotate-90"
            role="img"
            aria-label={`Project status distribution for ${total} projects`}
          >
            <circle
              cx="21"
              cy="21"
              r={RADIUS}
              fill="none"
              stroke="#F1F5F9"
              strokeWidth="5.5"
            />
            {total === 0 ? null : (
              <>
                {segments.map((segment) =>
                  segment.count > 0 ? (
                    <circle
                      key={segment.status}
                      cx="21"
                      cy="21"
                      r={RADIUS}
                      fill="none"
                      stroke={projectStatusHex[segment.status]}
                      strokeWidth="5.5"
                      strokeDasharray={`${Math.max(segment.percentage - 0.7, 0)} ${100 - Math.max(segment.percentage - 0.7, 0)}`}
                      strokeDashoffset={-segment.offset}
                    />
                  ) : null,
                )}
              </>
            )}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl font-bold tracking-[-0.04em] text-ink-950">
              {formatNumber(total)}
            </span>
            <span className="mt-0.5 text-[9px] font-bold tracking-[0.14em] text-slate-400 uppercase">
              Projects
            </span>
          </div>
        </div>

        <div>
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {PROJECT_STATUSES.map((status) => {
              const count = counts[status]
              return (
                <div key={status} className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                    style={{ backgroundColor: projectStatusHex[status] }}
                    aria-hidden="true"
                  />
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium text-slate-600">
                      {status}
                    </span>
                    <span className="text-xs font-bold text-ink-950">
                      {formatNumber(count)}
                      <span className="ml-1 font-medium text-slate-400">
                        {percentage(count, total)}%
                      </span>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-5 flex items-end justify-between gap-4 border-t border-dashed border-slate-200 pt-4">
            <div>
              <p className="text-[10px] font-bold tracking-[0.1em] text-slate-400 uppercase">
                Portfolio allocation
              </p>
              <p className="mt-1 text-lg font-bold tracking-[-0.02em] text-ink-950">
                {formatPesoCompact(totalBudget)}
              </p>
            </div>
            <p className="text-right text-[11px] leading-5 text-slate-500">
              {counts.Completed} completed
              <br />
              {counts['In Progress']} in progress
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
