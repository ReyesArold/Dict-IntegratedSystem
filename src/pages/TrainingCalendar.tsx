import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Printer,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { useToast } from '../components/ui/toast-context'
import { api } from '../services/api'
import { ScheduleDetailModal } from '../components/calendar/ScheduleDetailModal'
import { ScheduleFormModal } from '../components/calendar/ScheduleFormModal'
import type {
  CalendarEvent,
  Schedule,
  ScheduleCategory,
  Training,
  Trip,
  Project,
} from '../types'

const CATEGORY_COLORS: Record<ScheduleCategory, string> = {
  'Programs & Activities': '#3b82f6',
  Meetings: '#8b5cf6',
  'Training & Seminar': '#10b981',
  'Official Travel / Trips': '#f97316',
  'Stakeholder Consultation': '#ef4444',
  'Project Implementation': '#374151',
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const SCOPE_OPTIONS = [
  'DICT Abra Master Calendar',
  'Training Only',
  'Trips Only',
] as const

type Scope = (typeof SCOPE_OPTIONS)[number]

function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildEvents(
  schedules: Schedule[] | undefined,
  trainings: Training[] | undefined,
  trips: Trip[] | undefined,
  projects: Project[] | undefined,
): CalendarEvent[] {
  const events: CalendarEvent[] = []

  for (const schedule of schedules ?? []) {
    events.push({
      id: `schedule-${schedule.id}`,
      title: schedule.title,
      category: schedule.category,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      location: schedule.location,
      focalPerson: schedule.focalPerson,
      description: schedule.description,
      status: schedule.status,
      source: 'schedule',
      scheduleId: schedule.id,
    })
  }

  for (const training of trainings ?? []) {
    if (!training.date) continue
    events.push({
      id: `training-${training.id}`,
      title: training.title,
      category: 'Training & Seminar',
      startDate: `${training.date}T09:00`,
      endDate: `${training.date}T17:00`,
      location: training.venue,
      focalPerson: training.trainer,
      description: `Training session (${training.status}).`,
      status: training.status,
      source: 'training',
    })
  }

  for (const trip of trips ?? []) {
    if (!trip.departureDate) continue
    events.push({
      id: `trip-${trip.id}`,
      title: trip.tripTitle,
      category: 'Official Travel / Trips',
      startDate: trip.departureDate,
      endDate: trip.returnDate || trip.departureDate,
      location: trip.destination,
      focalPerson: trip.driverName,
      description: trip.purpose,
      status: trip.status,
      source: 'trip',
    })
  }

  for (const project of projects ?? []) {
    if (!project.targetCompletionDate) continue
    events.push({
      id: `project-${project.id}`,
      title: `${project.name} (deadline)`,
      category: 'Project Implementation',
      startDate: `${project.targetCompletionDate}T09:00`,
      endDate: `${project.targetCompletionDate}T09:00`,
      location: project.municipality,
      focalPerson: project.leader,
      description: `Target completion date for ${project.name}.`,
      status: project.status,
      source: 'project',
    })
  }

  return events
}

function applyScope(events: CalendarEvent[], scope: Scope): CalendarEvent[] {
  if (scope === 'Training Only') {
    return events.filter((event) => event.category === 'Training & Seminar')
  }
  if (scope === 'Trips Only') {
    return events.filter(
      (event) => event.category === 'Official Travel / Trips',
    )
  }
  return events
}

function getMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const startWeekday = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = []

  for (let index = 0; index < startWeekday; index += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function TrainingCalendar() {
  const toast = useToast()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [trainings, setTrainings] = useState<Training[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [projects, setProjects] = useState<Project[]>([])

  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())

  useEffect(() => {
    let active = true
    Promise.all([
      api.schedules.list(),
      api.trainings.list(),
      api.trips.list(),
      api.projects.list(),
    ])
      .then(([s, t, tr, p]) => {
        if (!active) return
        setSchedules(s)
        setTrainings(t)
        setTrips(tr)
        setProjects(p)
      })
      .catch((error) => {
        console.error('DICT Abra could not load calendar data:', error)
      })
    return () => {
      active = false
    }
  }, [])
  const [month, setMonth] = useState(today.getMonth())
  const [scope, setScope] = useState<Scope>('DICT Abra Master Calendar')
  const [formOpen, setFormOpen] = useState(false)
  const [formInitialDate, setFormInitialDate] = useState<string | undefined>(
    undefined,
  )
  const [editingSchedule, setEditingSchedule] = useState<Schedule | undefined>(
    undefined,
  )
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const allEvents = useMemo(
    () => buildEvents(schedules, trainings, trips, projects),
    [schedules, trainings, trips, projects],
  )

  const filteredEvents = useMemo(
    () => applyScope(allEvents, scope),
    [allEvents, scope],
  )

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of filteredEvents) {
      const day = event.startDate.slice(0, 10)
      if (!map.has(day)) map.set(day, [])
      map.get(day)!.push(event)
    }
    return map
  }, [filteredEvents])

  const grid = useMemo(() => getMonthGrid(year, month), [year, month])

  function goToPreviousMonth() {
    if (month === 0) {
      setMonth(11)
      setYear((current) => current - 1)
    } else {
      setMonth((current) => current - 1)
    }
  }

  function goToNextMonth() {
    if (month === 11) {
      setMonth(0)
      setYear((current) => current + 1)
    } else {
      setMonth((current) => current + 1)
    }
  }

  function goToToday() {
    const now = new Date()
    setYear(now.getFullYear())
    setMonth(now.getMonth())
  }

  function openAddForDate(dateString?: string) {
    setEditingSchedule(undefined)
    setFormInitialDate(dateString)
    setFormOpen(true)
  }

  function openEditForEvent(event: CalendarEvent) {
    if (event.source !== 'schedule' || !event.scheduleId) {
      toast.info(
        'Read-only event',
        'Events imported from trainings, trips, or projects can only be edited in their own module.',
      )
      return
    }
    const schedule = (schedules ?? []).find(
      (item) => item.id === event.scheduleId,
    )
    if (!schedule) return
    setEditingSchedule(schedule)
    setFormInitialDate(undefined)
    setFormOpen(true)
  }

  async function handleDeleteEvent() {
    if (!detailEvent || detailEvent.source !== 'schedule' || !detailEvent.scheduleId) {
      return
    }
    setDeleting(true)
    try {
      await api.schedules.delete(detailEvent.scheduleId)
      setSchedules((current) =>
        current.filter((schedule) => schedule.id !== detailEvent.scheduleId),
      )
      toast.success('Schedule deleted', `"${detailEvent.title}" was removed.`)
      setDetailOpen(false)
      setDetailEvent(null)
      setDeleteConfirmOpen(false)
    } catch (cause) {
      console.error('DICT Abra could not delete the schedule:', cause)
      toast.error('Delete failed', 'The schedule could not be deleted.')
    } finally {
      setDeleting(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  const isToday = (date: Date) =>
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Training & activities calendar"
        title="Provincial Calendar"
        description="Monthly view of DICT Abra trainings, meetings, official travel, and project deadlines. All events are stored locally and work offline."
        actions={
          <>
            <select
              className="field-select w-auto"
              value={scope}
              onChange={(event) => setScope(event.target.value as Scope)}
              aria-label="Calendar scope"
            >
              {SCOPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrint}
              icon={<Printer className="h-4 w-4" aria-hidden="true" />}
            >
              Print
            </Button>
            <Button
              size="sm"
              onClick={() => openAddForDate(toIsoDate(today))}
              icon={<Plus className="h-4 w-4" aria-hidden="true" />}
            >
              Add Schedule
            </Button>
          </>
        }
      />

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="icon-btn"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <h2 className="min-w-[180px] text-center font-display text-lg font-bold tracking-[-0.02em] text-ink-950">
              {MONTHS[month]} {year}
            </h2>
            <button
              type="button"
              onClick={goToNextMonth}
              className="icon-btn"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <Button variant="ghost" size="sm" onClick={goToToday}>
              Today
            </Button>
          </div>

          <p className="text-[11px] text-slate-500">
            {filteredEvents.length} event
            {filteredEvents.length === 1 ? '' : 's'} in view
          </p>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/70">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="px-2 py-2 text-center text-[10px] font-bold tracking-[0.1em] text-slate-500 uppercase"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {grid.map((date, index) => {
            if (!date) {
              return (
                <div
                  key={`blank-${index}`}
                  className="min-h-[112px] border-b border-r border-slate-100 bg-slate-50/40"
                />
              )
            }

            const dateString = toIsoDate(date)
            const dayEvents = eventsByDay.get(dateString) ?? []
            const visibleEvents = dayEvents.slice(0, 3)
            const extraCount = dayEvents.length - visibleEvents.length

            return (
              <div
                key={dateString}
                className="group min-h-[112px] border-b border-r border-slate-100 p-1.5 transition hover:bg-slate-50/60"
              >
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => openAddForDate(dateString)}
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
                      isToday(date)
                        ? 'bg-ink-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    aria-label={`Add schedule on ${dateString}`}
                    title="Add schedule"
                  >
                    {date.getDate()}
                  </button>
                  {dayEvents.length > 0 ? (
                    <span className="text-[9px] font-semibold text-slate-400">
                      {dayEvents.length}
                    </span>
                  ) : null}
                </div>

                <div className="mt-1 space-y-1">
                  {visibleEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => {
                        setDetailEvent(event)
                        setDetailOpen(true)
                      }}
                      className="flex w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-left text-[10px] font-semibold text-white transition hover:opacity-90"
                      style={{ backgroundColor: CATEGORY_COLORS[event.category] }}
                      title={`${event.title} — ${event.startDate.slice(11, 16)}`}
                    >
                      <span className="truncate">
                        {event.startDate.slice(11, 16)} {event.title}
                      </span>
                    </button>
                  ))}
                  {extraCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        const first = dayEvents[visibleEvents.length]
                        if (first) {
                          setDetailEvent(first)
                          setDetailOpen(true)
                        }
                      }}
                      className="text-[9px] font-bold text-brand-700 hover:underline"
                    >
                      +{extraCount} more
                    </button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="card px-5 py-4">
        <p className="mb-2 text-[10px] font-bold tracking-[0.1em] text-slate-500 uppercase">
          Category legend
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {(Object.keys(CATEGORY_COLORS) as ScheduleCategory[]).map(
            (category) => (
              <span
                key={category}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[category] }}
                  aria-hidden="true"
                />
                {category}
              </span>
            ),
          )}
        </div>
      </section>

      <ScheduleFormModal
        key={formOpen ? (editingSchedule?.id ?? formInitialDate ?? 'new') : 'closed'}
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditingSchedule(undefined)
          // Refresh schedules so newly created or edited events appear.
          api.schedules
            .list()
            .then((data) => setSchedules(data))
            .catch(() => {})
        }}
        initialDate={formInitialDate}
        schedule={editingSchedule}
      />

      <ScheduleDetailModal
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false)
          setDetailEvent(null)
        }}
        event={detailEvent}
        onEdit={() => {
          setDetailOpen(false)
          openEditForEvent(detailEvent!)
        }}
        onDelete={() => setDeleteConfirmOpen(true)}
      />

      <Modal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete schedule?"
        description={
          detailEvent
            ? `Remove "${detailEvent.title}" from the calendar. This cannot be undone.`
            : ''
        }
        size="sm"
        icon={<X className="h-5 w-5" />}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              onClick={handleDeleteEvent}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          The event will be permanently removed from this device.
        </p>
      </Modal>
    </div>
  )
}
