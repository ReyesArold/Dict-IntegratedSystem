import { ArrowUpRight, CalendarDays, MapPin, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  TRAINING_STATUSES,
  type Participant,
  type Training,
} from '../../types'
import {
  formatDate,
  formatNumber,
  percentage,
  todayIsoDate,
} from '../../utils/formatters'
import { trainingStatusBars } from '../../utils/status'

interface TrainingStatusChartProps {
  trainings: Training[]
  participants: Participant[]
}

export function TrainingStatusChart({
  trainings,
  participants,
}: TrainingStatusChartProps) {
  const total = trainings.length
  const counts = Object.fromEntries(
    TRAINING_STATUSES.map((status) => [
      status,
      trainings.filter((training) => training.status === status).length,
    ]),
  ) as Record<(typeof TRAINING_STATUSES)[number], number>

  const countsByStatus = TRAINING_STATUSES.map((status) => ({
    status,
    count: counts[status],
  }))

  const male = participants.filter(
    (participant) => participant.gender === 'Male',
  ).length
  const female = participants.filter(
    (participant) => participant.gender === 'Female',
  ).length
  const totalTrainees = participants.length

  const nextSession = [...trainings]
    .filter(
      (training) =>
        ['Upcoming', 'Ongoing'].includes(training.status) &&
        training.date >= todayIsoDate(),
    )
    .sort((a, b) => a.date.localeCompare(b.date))[0]

  return (
    <section className="card overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-[15px] font-bold text-ink-950">
            Training Delivery Snapshot
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Session status and Gender &amp; Development reach
          </p>
        </div>
        <Link
          to="/trainings"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-700 transition hover:bg-brand-50"
        >
          View all
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid gap-6 px-5 py-5 sm:grid-cols-[1.2fr_0.8fr] sm:px-6">
        <div>
          <div className="space-y-3.5">
            {countsByStatus.map(({ status, count }) => (
              <div key={status}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600">{status}</span>
                  <span className="font-bold text-ink-950">
                    {formatNumber(count)}
                    <span className="ml-1.5 font-medium text-slate-400">
                      {percentage(count, total)}%
                    </span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${trainingStatusBars[status]}`}
                    style={{ width: `${percentage(count, total)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {nextSession ? (
            <div className="mt-5 rounded-xl border border-brand-100 bg-brand-50/60 p-3.5">
              <div className="flex items-center gap-1.5 text-[9px] font-bold tracking-[0.1em] text-brand-700 uppercase">
                <CalendarDays className="h-3 w-3" aria-hidden="true" />
                Next session
              </div>
              <Link
                to={`/trainings/${nextSession.id}`}
                className="mt-1.5 line-clamp-2 text-xs font-bold text-ink-900 hover:text-brand-700"
              >
                {nextSession.title}
              </Link>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-slate-500">
                <span>{formatDate(nextSession.date)}</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  <span className="line-clamp-1">{nextSession.venue}</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-slate-200 px-3.5 py-3 text-xs text-slate-500">
              No upcoming sessions are currently scheduled.
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-ink-700 shadow-xs">
              <Users className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
                Trainee reach
              </p>
              <p className="text-lg leading-none font-bold text-ink-950">
                {formatNumber(totalTrainees)}
              </p>
            </div>
          </div>

          <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
            <div
              className="h-full bg-brand-500"
              style={{ width: `${percentage(male, totalTrainees)}%` }}
              title={`${male} male trainees`}
            />
            <div
              className="h-full bg-gold-400"
              style={{ width: `${percentage(female, totalTrainees)}%` }}
              title={`${female} female trainees`}
            />
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden="true" />
                Male
              </span>
              <span className="font-bold text-ink-900">
                {formatNumber(male)}
                <span className="ml-1 font-medium text-slate-400">
                  {percentage(male, totalTrainees)}%
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
                Female
              </span>
              <span className="font-bold text-ink-900">
                {formatNumber(female)}
                <span className="ml-1 font-medium text-slate-400">
                  {percentage(female, totalTrainees)}%
                </span>
              </span>
            </div>
          </div>

          <p className="mt-4 border-t border-dashed border-slate-200 pt-3 text-[10px] leading-4 text-slate-400">
            Gender-disaggregated data supports DICT GAD reports.
          </p>
        </div>
      </div>
    </section>
  )
}
