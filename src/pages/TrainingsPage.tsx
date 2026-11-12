import {
  CalendarDays,
  CheckCircle2,
  Clock,
  GraduationCap,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { TrainingStatusBadge } from '../components/ui/StatusBadge'
import { useToast } from '../components/ui/toast-context'
import { TrainingFormModal } from '../components/trainings/TrainingFormModal'
import { deleteTrainingWithRoster } from '../db/trainingActions'
import { api } from '../services/api'
import type { Participant, Training } from '../services/api'
import {
  TRAINING_STATUSES,
  type TrainingStatus,
} from '../types'
import {
  formatDate,
  formatNumber,
  percentage,
  todayIsoDate,
} from '../utils/formatters'

export function TrainingsPage() {
  const toast = useToast()
  const [trainings, setTrainings] = useState<Training[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | TrainingStatus>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editingTraining, setEditingTraining] = useState<Training | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Training | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([api.trainings.list(), api.participants.list()])
      .then(([t, p]) => {
        if (!active) return
        setTrainings(t)
        setParticipants(p)
      })
      .catch((error) => {
        console.error('DICT Abra could not load trainings:', error)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const participantCounts = useMemo(() => {
    const counts = new Map<
      number,
      { total: number; male: number; female: number; certified: number }
    >()
    participants?.forEach((participant) => {
      const current = counts.get(participant.trainingId) ?? {
        total: 0,
        male: 0,
        female: 0,
        certified: 0,
      }
      current.total += 1
      if (participant.gender === 'Male') current.male += 1
      if (participant.gender === 'Female') current.female += 1
      if (participant.attendanceStatus === 'Completed / Certified') {
        current.certified += 1
      }
      counts.set(participant.trainingId, current)
    })
    return counts
  }, [participants])

  const filteredTrainings = useMemo(() => {
    if (!trainings) return []
    const query = search.trim().toLowerCase()

    return trainings
      .filter((training) => {
        const matchesSearch =
          !query ||
          [training.title, training.venue, training.trainer, training.status]
            .join(' ')
            .toLowerCase()
            .includes(query)
        const matchesStatus =
          statusFilter === 'all' || training.status === statusFilter
        return matchesSearch && matchesStatus
      })
      .sort((a, b) => {
        const upcomingA = a.date >= todayIsoDate() ? 0 : 1
        const upcomingB = b.date >= todayIsoDate() ? 0 : 1
        if (upcomingA !== upcomingB) return upcomingA - upcomingB
        return upcomingA === 0
          ? a.date.localeCompare(b.date)
          : b.date.localeCompare(a.date)
      })
  }, [trainings, search, statusFilter])

  const completedCount =
    trainings?.filter((training) => training.status === 'Completed').length ?? 0
  const upcomingCount =
    trainings?.filter(
      (training) =>
        ['Upcoming', 'Ongoing'].includes(training.status) &&
        training.date >= todayIsoDate(),
    ).length ?? 0
  const totalRegistrations = participants?.length ?? 0
  const hasActiveFilters = search.trim().length > 0 || statusFilter !== 'all'

  function openCreateForm() {
    setEditingTraining(null)
    setFormOpen(true)
  }

  function openEditForm(training: Training) {
    setEditingTraining(training)
    setFormOpen(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const removed = await deleteTrainingWithRoster(deleteTarget)
      toast.success(
        'Training deleted',
        removed > 0
          ? `${deleteTarget.title} and ${removed} trainee records were removed.`
          : `${deleteTarget.title} was removed.`,
      )
      setTrainings((current) =>
        current.filter((training) => training.id !== deleteTarget.id),
      )
      setParticipants((current) =>
        current.filter((participant) => participant.trainingId !== deleteTarget.id),
      )
      setDeleteTarget(null)
    } catch (error) {
      toast.error(
        'Training could not be deleted',
        error instanceof Error ? error.message : 'Please try again.',
      )
    } finally {
      setDeleting(false)
    }
  }

  const loading = isLoading

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Capacity building"
        title="Training Management"
        description="Plan digital literacy and upskilling sessions, manage trainer details, and maintain gender-disaggregated trainee rosters for every DICT Abra program."
        actions={
          <Button
            onClick={openCreateForm}
            icon={<Plus className="h-4 w-4" aria-hidden="true" />}
          >
            Schedule training
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
              Total sessions
            </p>
            <p className="text-xl font-bold text-ink-950">
              {formatNumber(trainings?.length ?? 0)}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
              Completed
            </p>
            <p className="text-xl font-bold text-ink-950">
              {formatNumber(completedCount)}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-100 text-gold-600">
            <Users className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
              Trainee records
            </p>
            <p className="text-xl font-bold text-ink-950">
              {formatNumber(totalRegistrations)}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
              Upcoming / ongoing
            </p>
            <p className="text-xl font-bold text-ink-950">
              {formatNumber(upcomingCount)}
            </p>
          </div>
        </div>
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search program, venue, or trainer…"
                className="field-input pl-10"
                aria-label="Search training sessions"
              />
            </div>
            <select
              className="field-select w-full sm:w-[170px]"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as 'all' | TrainingStatus)
              }
              aria-label="Filter trainings by status"
            >
              <option value="all">All statuses</option>
              {TRAINING_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            Showing{' '}
            <span className="font-bold text-slate-700">
              {filteredTrainings.length}
            </span>{' '}
            of {formatNumber(trainings?.length ?? 0)} sessions
          </p>
        </div>

        {loading ? (
          <div className="space-y-3 p-5" aria-label="Loading training sessions">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : filteredTrainings.length === 0 ? (
          <EmptyState
            icon={hasActiveFilters ? Search : GraduationCap}
            title={
              hasActiveFilters
                ? 'No training sessions match these filters'
                : 'No training sessions yet'
            }
            description={
              hasActiveFilters
                ? 'Try a different keyword or clear the status filter to see more sessions.'
                : 'Schedule the first training session and start building its trainee roster.'
            }
            action={
              hasActiveFilters ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch('')
                    setStatusFilter('all')
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button
                  onClick={openCreateForm}
                  icon={<Plus className="h-4 w-4" aria-hidden="true" />}
                >
                  Schedule first training
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="scrollbar-thin hidden overflow-x-auto md:block">
              <table className="data-table min-w-[980px]">
                <thead>
                  <tr>
                    <th scope="col">Course / Program</th>
                    <th scope="col">Schedule</th>
                    <th scope="col">Venue / LGU</th>
                    <th scope="col">Trainer / Speaker</th>
                    <th scope="col">Trainee Roster</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="w-28 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrainings.map((training) => {
                    const counts = participantCounts.get(training.id) ?? {
                      total: 0,
                      male: 0,
                      female: 0,
                      certified: 0,
                    }
                    return (
                      <tr key={training.id}>
                        <td className="max-w-[280px]">
                          <Link
                            to={`/trainings/${training.id}`}
                            className="line-clamp-2 text-[13px] leading-5 font-semibold text-ink-950 transition hover:text-brand-700"
                          >
                            {training.title}
                          </Link>
                          <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            {training.durationHours} hours
                          </p>
                        </td>
                        <td>
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap text-slate-700">
                            <CalendarDays
                              className="h-3.5 w-3.5 text-slate-400"
                              aria-hidden="true"
                            />
                            {formatDate(training.date)}
                          </span>
                        </td>
                        <td className="max-w-[190px]">
                          <span className="line-clamp-2 text-xs leading-5 text-slate-600">
                            {training.venue}
                          </span>
                        </td>
                        <td>
                          <span className="inline-flex items-start gap-1.5 text-xs text-slate-600">
                            <UserRound
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400"
                              aria-hidden="true"
                            />
                            {training.trainer}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-ink-900">
                              {formatNumber(counts.total)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {counts.male}M / {counts.female}F
                            </span>
                          </div>
                          <p className="mt-0.5 text-[10px] text-slate-400">
                            {counts.certified} certified
                          </p>
                        </td>
                        <td>
                          <TrainingStatusBadge status={training.status} />
                        </td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <Link
                              to={`/trainings/${training.id}`}
                              className="icon-btn"
                              aria-label={`Manage roster for ${training.title}`}
                              title="Manage roster"
                            >
                              <Users className="h-3.5 w-3.5" aria-hidden="true" />
                            </Link>
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => openEditForm(training)}
                              aria-label={`Edit ${training.title}`}
                              title="Edit training"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="icon-btn hover:bg-rose-50 hover:text-rose-600"
                              onClick={() => setDeleteTarget(training)}
                              aria-label={`Delete ${training.title}`}
                              title="Delete training"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 md:hidden">
              {filteredTrainings.map((training) => {
                const counts = participantCounts.get(training.id) ?? {
                  total: 0,
                  male: 0,
                  female: 0,
                  certified: 0,
                }
                const completion = percentage(counts.certified, counts.total)
                return (
                  <article
                    key={training.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        to={`/trainings/${training.id}`}
                        className="min-w-0 text-sm leading-5 font-bold text-ink-950"
                      >
                        {training.title}
                      </Link>
                      <TrainingStatusBadge status={training.status} />
                    </div>

                    <div className="mt-3 space-y-1.5 text-[11px] text-slate-500">
                      <p className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                        {formatDate(training.date)} · {training.durationHours} hours
                      </p>
                      <p className="flex items-start gap-1.5">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                        {training.venue}
                      </p>
                      <p className="flex items-start gap-1.5">
                        <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                        {training.trainer}
                      </p>
                    </div>

                    <div className="mt-3 rounded-lg bg-slate-50 p-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-500">
                          {formatNumber(counts.total)} trainees
                        </span>
                        <span className="text-slate-400">
                          {counts.male}M / {counts.female}F
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${completion}%` }}
                        />
                      </div>
                      <p className="mt-1.5 text-[10px] text-slate-400">
                        {counts.certified} completed / certified
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openEditForm(training)}
                        icon={<Pencil className="h-3.5 w-3.5" aria-hidden="true" />}
                      >
                        Edit
                      </Button>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="icon-btn hover:bg-rose-50 hover:text-rose-600"
                          onClick={() => setDeleteTarget(training)}
                          aria-label={`Delete ${training.title}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <Link
                          to={`/trainings/${training.id}`}
                          className="btn btn-primary min-h-9 px-3 py-1.5 text-xs"
                        >
                          <Users className="h-3.5 w-3.5" aria-hidden="true" />
                          Manage roster
                        </Link>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </section>

      {formOpen ? (
        <TrainingFormModal
          training={editingTraining}
          onClose={() => {
            setFormOpen(false)
            setEditingTraining(null)
            // Refresh so newly created or edited sessions appear.
            Promise.all([api.trainings.list(), api.participants.list()])
              .then(([t, p]) => {
                setTrainings(t)
                setParticipants(p)
              })
              .catch(() => {})
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this training session?"
        description={
          deleteTarget
            ? `“${deleteTarget.title}” and all ${
                participantCounts.get(deleteTarget.id)?.total ?? 0
              } linked trainee records will be permanently removed from this device. This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete training"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  )
}
