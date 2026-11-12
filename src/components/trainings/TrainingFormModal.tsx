import { Save } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { recordActivity } from '../../db/activities'
import { api } from '../../services/api'
import {
  TRAINING_STATUSES,
  type Training,
  type TrainingStatus,
} from '../../types'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { useToast } from '../ui/toast-context'

interface TrainingFormModalProps {
  training?: Training | null
  onClose: () => void
}

interface TrainingFormState {
  title: string
  date: string
  durationHours: string
  venue: string
  trainer: string
  status: TrainingStatus
}

type TrainingFormErrors = Partial<Record<keyof TrainingFormState, string>>

export function TrainingFormModal({
  training,
  onClose,
}: TrainingFormModalProps) {
  const toast = useToast()
  const formId = useId()
  const fieldId = useId()
  const isEditing = Boolean(training)

  const [form, setForm] = useState<TrainingFormState>({
    title: training?.title ?? '',
    date: training?.date ?? '',
    durationHours: training ? String(training.durationHours) : '',
    venue: training?.venue ?? '',
    trainer: training?.trainer ?? '',
    status: training?.status ?? 'Upcoming',
  })
  const [errors, setErrors] = useState<TrainingFormErrors>({})
  const [saving, setSaving] = useState(false)

  function updateField<K extends keyof TrainingFormState>(
    field: K,
    value: TrainingFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  function validate(): TrainingFormErrors {
    const next: TrainingFormErrors = {}
    const duration = Number(form.durationHours)

    if (form.title.trim().length < 3) {
      next.title = 'Enter a course or program title.'
    }
    if (!form.date) {
      next.date = 'Select the training date.'
    }
    if (
      !form.durationHours.trim() ||
      !Number.isFinite(duration) ||
      duration <= 0
    ) {
      next.durationHours = 'Enter a duration greater than zero.'
    }
    if (form.venue.trim().length < 3) {
      next.venue = 'Enter the venue or partner LGU.'
    }
    if (form.trainer.trim().length < 3) {
      next.trainer = 'Enter the trainer or speaker name.'
    }

    return next
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSaving(true)
    const now = new Date().toISOString()
    const payload = {
      title: form.title.trim(),
      date: form.date,
      durationHours: Number(form.durationHours),
      venue: form.venue.trim(),
      trainer: form.trainer.trim(),
      status: form.status,
      createdAt: training?.createdAt ?? now,
      updatedAt: now,
    }

    try {
      if (training) {
        await api.trainings.update(training.id, payload)
        await recordActivity(
          'training',
          'updated',
          training.status !== payload.status
            ? `${payload.title} status changed from ${training.status} to ${payload.status}.`
            : `${payload.title} training details were updated.`,
          String(training.id),
        )
        toast.success('Training updated', `${payload.title} was saved.`)
      } else {
        const created = await api.trainings.create(payload)
        await recordActivity(
          'training',
          'created',
          `New training session scheduled: ${payload.title}.`,
          String(created.id),
        )
        toast.success(
          'Training added',
          `${payload.title} is now in the training register.`,
        )
      }
      onClose()
    } catch (error) {
      toast.error(
        'Training could not be saved',
        error instanceof Error ? error.message : 'Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      onClose={onClose}
      title={isEditing ? 'Edit training session' : 'Schedule a training'}
      description={
        isEditing
          ? 'Update the session details. Trainee records linked to this training are not affected.'
          : 'Add a digital literacy, upskilling, or capacity-building session to the local training register.'
      }
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            loading={saving}
            icon={<Save className="h-4 w-4" aria-hidden="true" />}
          >
            {isEditing ? 'Save changes' : 'Add training'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Field
          label="Course / Program title"
          htmlFor={`${fieldId}-title`}
          required
          error={errors.title}
        >
          <input
            id={`${fieldId}-title`}
            className="field-input"
            value={form.title}
            onChange={(event) => updateField('title', event.target.value)}
            placeholder="e.g. Cybersecurity Awareness for LGU Employees"
            maxLength={180}
            aria-invalid={errors.title ? 'true' : undefined}
            aria-describedby={errors.title ? `${fieldId}-title-error` : undefined}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Training date"
            htmlFor={`${fieldId}-date`}
            required
            error={errors.date}
          >
            <input
              id={`${fieldId}-date`}
              type="date"
              className="field-input"
              value={form.date}
              onChange={(event) => updateField('date', event.target.value)}
              aria-invalid={errors.date ? 'true' : undefined}
              aria-describedby={errors.date ? `${fieldId}-date-error` : undefined}
            />
          </Field>

          <Field
            label="Duration (hours)"
            htmlFor={`${fieldId}-duration`}
            required
            error={errors.durationHours}
          >
            <input
              id={`${fieldId}-duration`}
              type="number"
              min="0.5"
              step="0.5"
              inputMode="decimal"
              className="field-input"
              value={form.durationHours}
              onChange={(event) =>
                updateField('durationHours', event.target.value)
              }
              placeholder="e.g. 8"
              aria-invalid={errors.durationHours ? 'true' : undefined}
              aria-describedby={
                errors.durationHours
                  ? `${fieldId}-duration-error`
                  : undefined
              }
            />
          </Field>
        </div>

        <Field
          label="Venue / LGU"
          htmlFor={`${fieldId}-venue`}
          required
          error={errors.venue}
        >
          <input
            id={`${fieldId}-venue`}
            className="field-input"
            value={form.venue}
            onChange={(event) => updateField('venue', event.target.value)}
            placeholder="e.g. Bangued Municipal Training Hall"
            maxLength={180}
            aria-invalid={errors.venue ? 'true' : undefined}
            aria-describedby={errors.venue ? `${fieldId}-venue-error` : undefined}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Trainer / Speaker"
            htmlFor={`${fieldId}-trainer`}
            required
            error={errors.trainer}
          >
            <input
              id={`${fieldId}-trainer`}
              className="field-input"
              value={form.trainer}
              onChange={(event) => updateField('trainer', event.target.value)}
              placeholder="e.g. Engr. Jose Mari Flores"
              maxLength={120}
              aria-invalid={errors.trainer ? 'true' : undefined}
              aria-describedby={
                errors.trainer ? `${fieldId}-trainer-error` : undefined
              }
            />
          </Field>

          <Field
            label="Session status"
            htmlFor={`${fieldId}-status`}
            required
          >
            <select
              id={`${fieldId}-status`}
              className="field-select"
              value={form.status}
              onChange={(event) =>
                updateField('status', event.target.value as TrainingStatus)
              }
            >
              {TRAINING_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-3.5 py-3">
          <p className="text-[11px] leading-5 text-brand-900">
            After saving, open the training&apos;s roster to enroll trainees and
            track attendance or certification.
          </p>
        </div>
      </form>
    </Modal>
  )
}
