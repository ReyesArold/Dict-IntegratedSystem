import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ParticipantFormModal } from '../components/trainings/ParticipantFormModal'
import { TrainingFormModal } from '../components/trainings/TrainingFormModal'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import {
  AttendanceBadge,
  TrainingStatusBadge,
} from '../components/ui/StatusBadge'
import { useToast } from '../components/ui/toast-context'
import { recordActivity } from '../db/activities'
import { deleteTrainingWithRoster } from '../db/trainingActions'
import { api } from '../services/api'
import {
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
  type Participant,
  type Training,
} from '../types'
import {
  formatDate,
  formatNumber,
  percentage,
} from '../utils/formatters'
import { cn } from '../utils/cn'
import { attendanceStyles } from '../utils/status'
import { exportAttendanceExcel } from '../utils/excelReports'
import { exportAttendancePdf } from '../utils/pdfReports'

export function TrainingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | AttendanceStatus>(
    'all',
  )
  const [trainingFormOpen, setTrainingFormOpen] = useState(false)
  const [participantFormOpen, setParticipantFormOpen] = useState(false)
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(
    null,
  )
  const [deleteTarget, setDeleteTarget] = useState<Participant | null>(null)
  const [deletingParticipant, setDeletingParticipant] = useState(false)
  const [deleteTrainingOpen, setDeleteTrainingOpen] = useState(false)
  const [deletingTraining, setDeletingTraining] = useState(false)
  const [updatingAttendanceId, setUpdatingAttendanceId] = useState<number | null>(
    null,
  )
  const [record, setRecord] = useState<{
    training: Training | null
    participants: Participant[]
  } | null>(null)
  const [loading, setLoading] = useState(Boolean(id))

  useEffect(() => {
    if (!id) return
    const numericId = Number(id)
    let active = true
    Promise.all([
      api.trainings.get(numericId),
      api.participants.list(numericId),
    ])
      .then(([training, participants]) => {
        if (!active) return
        setRecord({ training, participants })
      })
      .catch(() => {
        if (active) setRecord({ training: null, participants: [] })
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  const filteredParticipants = useMemo(() => {
    if (!record) return []
    const query = search.trim().toLowerCase()
    return record.participants
      .filter((participant) => {
        const matchesSearch =
          !query ||
          [
            participant.fullName,
            participant.email,
            participant.contactNumber,
            participant.sector,
            participant.gender,
          ]
            .join(' ')
            .toLowerCase()
            .includes(query)
        const matchesAttendance =
          attendanceFilter === 'all' ||
          participant.attendanceStatus === attendanceFilter
        return matchesSearch && matchesAttendance
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
  }, [record, search, attendanceFilter])

  if (loading) {
    return (
      <div className="animate-pulse space-y-5" aria-label="Loading training">
        <div className="h-8 w-36 rounded-lg bg-white/70" />
        <div className="card h-52" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="card h-24" />
          ))}
        </div>
        <div className="card h-80" />
      </div>
    )
  }

  if (!record || !record.training) {
    return (
      <div className="space-y-5">
        <Link
          to="/trainings"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-ink-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to training management
        </Link>
        <div className="card">
          <EmptyState
            icon={GraduationCap}
            title="Training session not found"
            description="This session may have been deleted, or the link is no longer valid."
            action={
              <Link to="/trainings" className="btn btn-primary">
                View training sessions
              </Link>
            }
          />
        </div>
      </div>
    )
  }

  const training = record.training
  const participants = record.participants
  const male = participants.filter(
    (participant) => participant.gender === 'Male',
  ).length
  const female = participants.filter(
    (participant) => participant.gender === 'Female',
  ).length
  const certified = participants.filter(
    (participant) => participant.attendanceStatus === 'Completed / Certified',
  ).length
  function openAddParticipant() {
    setEditingParticipant(null)
    setParticipantFormOpen(true)
  }

  function openEditParticipant(participant: Participant) {
    setEditingParticipant(participant)
    setParticipantFormOpen(true)
  }

  async function handleAttendanceChange(
    participant: Participant,
    status: AttendanceStatus,
  ) {
    if (participant.attendanceStatus === status) return
    setUpdatingAttendanceId(participant.id)
    try {
      await api.participants.update(participant.id, {
        attendanceStatus: status,
        updatedAt: new Date().toISOString(),
      })
      setRecord((current) =>
        current
          ? {
              ...current,
              participants: current.participants.map((item) =>
                item.id === participant.id
                  ? { ...item, attendanceStatus: status }
                  : item,
              ),
            }
          : current,
      )
      await recordActivity(
        'participant',
        'updated',
        `${participant.fullName}'s attendance for ${training.title} was updated to ${status}.`,
        String(participant.id),
      )
      toast.success(
        'Attendance updated',
        `${participant.fullName} is now marked as ${status}.`,
      )
    } catch (error) {
      toast.error(
        'Attendance could not be updated',
        error instanceof Error ? error.message : 'Please try again.',
      )
    } finally {
      setUpdatingAttendanceId(null)
    }
  }

  async function handleDeleteParticipant() {
    if (!deleteTarget) return
    setDeletingParticipant(true)
    try {
      await api.participants.delete(deleteTarget.id)
      await recordActivity(
        'participant',
        'deleted',
        `${deleteTarget.fullName} was removed from the ${training.title} roster.`,
      )
      setRecord((current) =>
        current
          ? {
              ...current,
              participants: current.participants.filter(
                (item) => item.id !== deleteTarget.id,
              ),
            }
          : current,
      )
      toast.success('Trainee removed', `${deleteTarget.fullName} was removed from the roster.`)
      setDeleteTarget(null)
    } catch (error) {
      toast.error(
        'Trainee could not be removed',
        error instanceof Error ? error.message : 'Please try again.',
      )
    } finally {
      setDeletingParticipant(false)
    }
  }

  async function handleDeleteTraining() {
    setDeletingTraining(true)
    try {
      const removed = await deleteTrainingWithRoster(training)
      toast.success(
        'Training deleted',
        removed > 0
          ? `${training.title} and ${removed} trainee records were removed.`
          : `${training.title} was removed.`,
      )
      navigate('/trainings', { replace: true })
    } catch (error) {
      toast.error(
        'Training could not be deleted',
        error instanceof Error ? error.message : 'Please try again.',
      )
      setDeletingTraining(false)
      setDeleteTrainingOpen(false)
    }
  }

  function handleExportPdf() {
    try {
      exportAttendancePdf([training], participants, training)
      toast.success('PDF report generated', 'The trainee attendance PDF has been downloaded.')
    } catch (error) {
      toast.error(
        'PDF export failed',
        error instanceof Error ? error.message : 'Please try again.',
      )
    }
  }

  function handleExportExcel() {
    try {
      exportAttendanceExcel([training], participants, training)
      toast.success(
        'Excel report generated',
        'The trainee attendance workbook has been downloaded.',
      )
    } catch (error) {
      toast.error(
        'Excel export failed',
        error instanceof Error ? error.message : 'Please try again.',
      )
    }
  }

  return (
    <div className="space-y-5">
      <Link
        to="/trainings"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to training management
      </Link>

      <section className="relative overflow-hidden rounded-2xl bg-ink-950 px-5 py-6 text-white shadow-[var(--shadow-float)] sm:px-7">
        <div
          className="pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full bg-brand-500/15 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-gold-400/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <TrainingStatusBadge status={training.status} />
              <span className="text-[10px] font-semibold tracking-[0.12em] text-ink-200 uppercase">
                Training session
              </span>
            </div>
            <h1 className="mt-3 font-display text-[24px] leading-tight font-bold tracking-[-0.025em] text-white sm:text-[29px]">
              {training.title}
            </h1>

            <div className="mt-5 grid gap-2.5 text-xs text-ink-100 sm:grid-cols-2 lg:grid-cols-4">
              <span className="inline-flex items-start gap-2">
                <CalendarDays
                  className="mt-0.5 h-4 w-4 shrink-0 text-gold-300"
                  aria-hidden="true"
                />
                {formatDate(training.date)}
              </span>
              <span className="inline-flex items-start gap-2">
                <Clock
                  className="mt-0.5 h-4 w-4 shrink-0 text-gold-300"
                  aria-hidden="true"
                />
                {training.durationHours} hours
              </span>
              <span className="inline-flex items-start gap-2">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-gold-300"
                  aria-hidden="true"
                />
                {training.venue}
              </span>
              <span className="inline-flex items-start gap-2">
                <UserRound
                  className="mt-0.5 h-4 w-4 shrink-0 text-gold-300"
                  aria-hidden="true"
                />
                {training.trainer}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Button
              variant="gold"
              onClick={openAddParticipant}
              icon={<Plus className="h-4 w-4" aria-hidden="true" />}
            >
              Add trainee
            </Button>
            <Button
              variant="secondary"
              onClick={() => setTrainingFormOpen(true)}
              icon={<Pencil className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Edit
            </Button>
            <button
              type="button"
              onClick={() => setDeleteTrainingOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-ink-100 transition hover:border-rose-300/30 hover:bg-rose-500/15 hover:text-rose-200"
              aria-label="Delete training session"
              title="Delete training session"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Users className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
              Roster
            </p>
            <p className="text-xl font-bold text-ink-950">
              {formatNumber(participants.length)}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
              Male
            </p>
            <p className="text-xl font-bold text-ink-950">{formatNumber(male)}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-100 text-gold-600">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
              Female
            </p>
            <p className="text-xl font-bold text-ink-950">
              {formatNumber(female)}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
              Certified
            </p>
            <p className="text-xl font-bold text-ink-950">
              {formatNumber(certified)}
              <span className="ml-1.5 text-[10px] font-semibold text-slate-400">
                {percentage(certified, participants.length)}%
              </span>
            </p>
          </div>
        </div>
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-[15px] font-bold text-ink-950">
                Participant Roster
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Track enrollment, attendance, and certification for this session.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportExcel}
                disabled={participants.length === 0}
                icon={<FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                Excel
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportPdf}
                disabled={participants.length === 0}
                icon={<FileText className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                PDF
              </Button>
              <Button
                size="sm"
                onClick={openAddParticipant}
                icon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                Add trainee
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="field-input pl-10"
                placeholder="Search trainee, sector, email, or contact…"
                aria-label="Search roster"
              />
            </div>
            <select
              className="field-select w-full sm:w-[190px]"
              value={attendanceFilter}
              onChange={(event) =>
                setAttendanceFilter(event.target.value as 'all' | AttendanceStatus)
              }
              aria-label="Filter roster by attendance status"
            >
              <option value="all">All attendance</option>
              {ATTENDANCE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-2.5 text-[11px] text-slate-500">
            Showing {filteredParticipants.length} of {participants.length} trainees
          </p>
        </div>

        {participants.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No trainees enrolled yet"
            description="Build this session's roster by adding trainee profiles. Attendance and certification can be updated at any time."
            action={
              <Button
                onClick={openAddParticipant}
                icon={<Plus className="h-4 w-4" aria-hidden="true" />}
              >
                Add first trainee
              </Button>
            }
          />
        ) : filteredParticipants.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No trainees match the current filters"
            description="Try another keyword or attendance status, or clear the filters to show the full roster."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('')
                  setAttendanceFilter('all')
                }}
              >
                Clear filters
              </Button>
            }
            compact
          />
        ) : (
          <>
            <div className="scrollbar-thin hidden overflow-x-auto md:block">
              <table className="data-table min-w-[880px]">
                <thead>
                  <tr>
                    <th scope="col">Trainee</th>
                    <th scope="col">Gender</th>
                    <th scope="col">Sector</th>
                    <th scope="col">Contact</th>
                    <th scope="col">Attendance</th>
                    <th scope="col" className="w-24 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.map((participant) => (
                    <tr key={participant.id}>
                      <td className="max-w-[260px]">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-50 text-[10px] font-bold text-ink-800">
                            {initials(participant.fullName)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold text-ink-950">
                              {participant.fullName}
                            </p>
                            <p className="mt-0.5 truncate text-[10.5px] text-slate-400">
                              {participant.email || 'No email provided'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-xs text-slate-600">
                          {participant.gender}
                        </span>
                      </td>
                      <td>
                        <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold whitespace-nowrap text-slate-600">
                          {participant.sector}
                        </span>
                      </td>
                      <td>
                        <div className="space-y-0.5 text-[10.5px] text-slate-500">
                          <p className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-slate-400" aria-hidden="true" />
                            {participant.contactNumber || '—'}
                          </p>
                          {participant.email ? (
                            <p className="flex items-center gap-1.5">
                              <Mail className="h-3 w-3 text-slate-400" aria-hidden="true" />
                              <span className="max-w-[190px] truncate">
                                {participant.email}
                              </span>
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <select
                          value={participant.attendanceStatus}
                          onChange={(event) =>
                            void handleAttendanceChange(
                              participant,
                              event.target.value as AttendanceStatus,
                            )
                          }
                          disabled={updatingAttendanceId === participant.id}
                          className={cn(
                            'rounded-lg border px-2 py-1.5 text-[10.5px] font-semibold focus:ring-2 focus:ring-brand-500/20 focus:outline-none',
                            attendanceStyles[participant.attendanceStatus],
                          )}
                          aria-label={`Attendance status for ${participant.fullName}`}
                        >
                          {ATTENDANCE_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => openEditParticipant(participant)}
                            aria-label={`Edit ${participant.fullName}`}
                            title="Edit trainee"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="icon-btn hover:bg-rose-50 hover:text-rose-600"
                            onClick={() => setDeleteTarget(participant)}
                            aria-label={`Remove ${participant.fullName} from roster`}
                            title="Remove trainee"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 md:hidden">
              {filteredParticipants.map((participant) => (
                <article
                  key={participant.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-50 text-[11px] font-bold text-ink-800">
                        {initials(participant.fullName)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-ink-950">
                          {participant.fullName}
                        </p>
                        <p className="mt-0.5 text-[10.5px] text-slate-400">
                          {participant.gender} · {participant.sector}
                        </p>
                      </div>
                    </div>
                    <AttendanceBadge
                      status={participant.attendanceStatus}
                      compact
                    />
                  </div>

                  <div className="mt-3 space-y-1 text-[11px] text-slate-500">
                    {participant.email ? (
                      <p className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-slate-400" aria-hidden="true" />
                        <span className="truncate">{participant.email}</span>
                      </p>
                    ) : null}
                    {participant.contactNumber ? (
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-slate-400" aria-hidden="true" />
                        {participant.contactNumber}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <select
                      value={participant.attendanceStatus}
                      onChange={(event) =>
                        void handleAttendanceChange(
                          participant,
                          event.target.value as AttendanceStatus,
                        )
                      }
                      disabled={updatingAttendanceId === participant.id}
                      className={cn(
                        'rounded-lg border px-2 py-1.5 text-[10.5px] font-semibold focus:ring-2 focus:ring-brand-500/20 focus:outline-none',
                        attendanceStyles[participant.attendanceStatus],
                      )}
                      aria-label={`Attendance status for ${participant.fullName}`}
                    >
                      {ATTENDANCE_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => openEditParticipant(participant)}
                        aria-label={`Edit ${participant.fullName}`}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="icon-btn hover:bg-rose-50 hover:text-rose-600"
                        onClick={() => setDeleteTarget(participant)}
                        aria-label={`Remove ${participant.fullName}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {trainingFormOpen ? (
        <TrainingFormModal
          training={training}
          onClose={() => {
            setTrainingFormOpen(false)
            if (id) {
              api.trainings
                .get(Number(id))
                .then((t) => {
                  setRecord((current) =>
                    current ? { ...current, training: t } : current,
                  )
                })
                .catch(() => {})
            }
          }}
        />
      ) : null}

      {participantFormOpen ? (
        <ParticipantFormModal
          trainingId={training.id}
          trainingTitle={training.title}
          participant={editingParticipant}
          onClose={() => {
            setParticipantFormOpen(false)
            setEditingParticipant(null)
            if (id) {
              api.participants
                .list(Number(id))
                .then((participants) => {
                  setRecord((current) =>
                    current ? { ...current, participants } : current,
                  )
                })
                .catch(() => {})
            }
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove trainee from roster?"
        description={
          deleteTarget
            ? `${deleteTarget.fullName} will be removed from this training roster. This action cannot be undone.`
            : ''
        }
        confirmLabel="Remove trainee"
        onConfirm={handleDeleteParticipant}
        onCancel={() => setDeleteTarget(null)}
        loading={deletingParticipant}
      />

      <ConfirmDialog
        open={deleteTrainingOpen}
        title="Delete this training session?"
        description={`“${training.title}” and all ${participants.length} linked trainee records will be permanently removed from this device. This action cannot be undone.`}
        confirmLabel="Delete training"
        onConfirm={handleDeleteTraining}
        onCancel={() => setDeleteTrainingOpen(false)}
        loading={deletingTraining}
      />
    </div>
  )
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}
