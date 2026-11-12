import { CalendarDays, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { useToast } from '../ui/toast-context'
import { api } from '../../services/api'
import {
  SCHEDULE_CATEGORIES,
  SCHEDULE_STATUSES,
  type Schedule,
  type ScheduleCategory,
  type ScheduleStatus,
} from '../../types'

interface ScheduleFormModalProps {
  open: boolean
  onClose: () => void
  initialDate?: string
  schedule?: Schedule
}

const CATEGORY_COLORS: Record<ScheduleCategory, string> = {
  'Programs & Activities': '#3b82f6',
  Meetings: '#8b5cf6',
  'Training & Seminar': '#10b981',
  'Official Travel / Trips': '#f97316',
  'Stakeholder Consultation': '#ef4444',
  'Project Implementation': '#374151',
}

function toDateTimeLocal(value: string | undefined, fallbackDate?: string): string {
  if (value) return value.slice(0, 16)
  if (fallbackDate) return `${fallbackDate}T09:00`
  return ''
}

export function ScheduleFormModal({
  open,
  onClose,
  initialDate,
  schedule,
}: ScheduleFormModalProps) {
  const toast = useToast()
  const isEditing = Boolean(schedule?.id)

  const [title, setTitle] = useState(() => (schedule ? schedule.title : ''))
  const [category, setCategory] = useState<ScheduleCategory>(
    () => (schedule ? schedule.category : 'Training & Seminar'),
  )
  const [startDate, setStartDate] = useState(() =>
    toDateTimeLocal(schedule?.startDate, schedule ? undefined : initialDate),
  )
  const [endDate, setEndDate] = useState(() =>
    toDateTimeLocal(schedule?.endDate, schedule ? undefined : initialDate),
  )
  const [location, setLocation] = useState(() => (schedule ? schedule.location : ''))
  const [focalPerson, setFocalPerson] = useState(() =>
    schedule ? schedule.focalPerson : '',
  )
  const [description, setDescription] = useState(() =>
    schedule ? schedule.description : '',
  )
  const [status, setStatus] = useState<ScheduleStatus>(
    () => (schedule ? schedule.status : 'Scheduled'),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Event title is required.')
      return
    }
    if (!startDate || !endDate) {
      setError('Start and end date/time are required.')
      return
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError('End date must be after the start date.')
      return
    }

    setSaving(true)
    setError(null)
    const now = new Date().toISOString()

    try {
      const payload = {
        title: trimmedTitle,
        category,
        startDate,
        endDate,
        location: location.trim(),
        focalPerson: focalPerson.trim(),
        description: description.trim(),
        status,
        updatedAt: now,
      }

      if (isEditing && schedule?.id) {
        await api.schedules.update(schedule.id, payload)
        toast.success('Schedule updated', `"${trimmedTitle}" was updated.`)
      } else {
        await api.schedules.create({ ...payload, createdAt: now })
        toast.success('Schedule added', `"${trimmedTitle}" was added to the calendar.`)
      }
      onClose()
    } catch (cause) {
      console.error('DICT Abra could not save the schedule:', cause)
      setError('The schedule could not be saved. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit schedule' : 'Add schedule'}
      description="Create or update a calendar event for DICT Abra activities."
      size="lg"
      icon={<CalendarDays className="h-5 w-5" />}
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-[11.5px] font-medium text-rose-700"
          >
            <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{error}</p>
          </div>
        ) : null}

        <Field label="Title" htmlFor="schedule-title" required>
          <input
            id="schedule-title"
            className="field-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Faculty Meeting"
            disabled={saving}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" htmlFor="schedule-category" required>
            <select
              id="schedule-category"
              className="field-select"
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as ScheduleCategory)
              }
              disabled={saving}
            >
              {SCHEDULE_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status" htmlFor="schedule-status" required>
            <select
              id="schedule-status"
              className="field-select"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as ScheduleStatus)
              }
              disabled={saving}
            >
              {SCHEDULE_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start date & time" htmlFor="schedule-start" required>
            <input
              id="schedule-start"
              type="datetime-local"
              className="field-input"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              disabled={saving}
            />
          </Field>

          <Field label="End date & time" htmlFor="schedule-end" required>
            <input
              id="schedule-end"
              type="datetime-local"
              className="field-input"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              disabled={saving}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location" htmlFor="schedule-location">
            <input
              id="schedule-location"
              className="field-input"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Venue or municipality"
              disabled={saving}
            />
          </Field>

          <Field label="Focal person" htmlFor="schedule-focal">
            <input
              id="schedule-focal"
              className="field-input"
              value={focalPerson}
              onChange={(event) => setFocalPerson(event.target.value)}
              placeholder="Organizer / trainer / driver"
              disabled={saving}
            />
          </Field>
        </div>

        <Field label="Description" htmlFor="schedule-description">
          <textarea
            id="schedule-description"
            className="field-textarea"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Notes or summary of the activity"
            disabled={saving}
          />
        </Field>

        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: CATEGORY_COLORS[category] }}
            aria-hidden="true"
          />
          <span>
            Color code for <strong>{category}</strong> is applied automatically.
          </span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {isEditing ? 'Save changes' : 'Add schedule'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
