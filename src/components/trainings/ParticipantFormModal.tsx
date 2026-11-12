import { Save } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { recordActivity } from '../../db/activities'
import { api } from '../../services/api'
import {
  ATTENDANCE_STATUSES,
  GENDERS,
  SECTORS,
  type AttendanceStatus,
  type Gender,
  type Participant,
  type Sector,
} from '../../types'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { useToast } from '../ui/toast-context'

interface ParticipantFormModalProps {
  trainingId: number
  trainingTitle: string
  participant?: Participant | null
  onClose: () => void
}

interface ParticipantFormState {
  fullName: string
  gender: Gender
  sector: Sector
  email: string
  contactNumber: string
  attendanceStatus: AttendanceStatus
}

type ParticipantFormErrors = Partial<
  Record<keyof ParticipantFormState, string>
>

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ParticipantFormModal({
  trainingId,
  trainingTitle,
  participant,
  onClose,
}: ParticipantFormModalProps) {
  const toast = useToast()
  const formId = useId()
  const fieldId = useId()
  const isEditing = Boolean(participant)

  const [form, setForm] = useState<ParticipantFormState>({
    fullName: participant?.fullName ?? '',
    gender: participant?.gender ?? 'Female',
    sector: participant?.sector ?? 'LGU Employee',
    email: participant?.email ?? '',
    contactNumber: participant?.contactNumber ?? '',
    attendanceStatus: participant?.attendanceStatus ?? 'Enrolled',
  })
  const [errors, setErrors] = useState<ParticipantFormErrors>({})
  const [saving, setSaving] = useState(false)

  function updateField<K extends keyof ParticipantFormState>(
    field: K,
    value: ParticipantFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  function validate(): ParticipantFormErrors {
    const next: ParticipantFormErrors = {}

    if (form.fullName.trim().length < 3) {
      next.fullName = 'Enter the trainee’s full name.'
    }
    if (form.email.trim() && !emailPattern.test(form.email.trim())) {
      next.email = 'Enter a valid email address, or leave it blank.'
    }
    if (form.contactNumber.trim()) {
      const digits = form.contactNumber.replace(/\D/g, '')
      if (digits.length < 7 || digits.length > 15) {
        next.contactNumber = 'Enter a valid contact number, or leave it blank.'
      }
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
      trainingId,
      fullName: form.fullName.trim(),
      gender: form.gender,
      sector: form.sector,
      email: form.email.trim(),
      contactNumber: form.contactNumber.trim(),
      attendanceStatus: form.attendanceStatus,
      createdAt: participant?.createdAt ?? now,
      updatedAt: now,
    }

    try {
      if (participant) {
        await api.participants.update(participant.id, payload)
        await recordActivity(
          'participant',
          'updated',
          participant.attendanceStatus !== payload.attendanceStatus
            ? `${payload.fullName}'s attendance for ${trainingTitle} was updated to ${payload.attendanceStatus}.`
            : `${payload.fullName}'s trainee profile was updated for ${trainingTitle}.`,
          String(participant.id),
        )
        toast.success('Trainee updated', `${payload.fullName} was saved.`)
      } else {
        const created = await api.participants.create(payload)
        await recordActivity(
          'participant',
          'created',
          `${payload.fullName} was enrolled in ${trainingTitle}.`,
          String(created.id),
        )
        toast.success('Trainee enrolled', `${payload.fullName} was added to the roster.`)
      }
      onClose()
    } catch (error) {
      toast.error(
        'Trainee could not be saved',
        error instanceof Error ? error.message : 'Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      onClose={onClose}
      title={isEditing ? 'Edit trainee' : 'Enroll a trainee'}
      description={trainingTitle}
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
            {isEditing ? 'Save changes' : 'Add to roster'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Field
          label="Full name"
          htmlFor={`${fieldId}-name`}
          required
          error={errors.fullName}
        >
          <input
            id={`${fieldId}-name`}
            className="field-input"
            value={form.fullName}
            onChange={(event) => updateField('fullName', event.target.value)}
            placeholder="e.g. Maria Teresa Agustin"
            autoComplete="name"
            maxLength={120}
            aria-invalid={errors.fullName ? 'true' : undefined}
            aria-describedby={
              errors.fullName ? `${fieldId}-name-error` : undefined
            }
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Gender" htmlFor={`${fieldId}-gender`} required>
            <select
              id={`${fieldId}-gender`}
              className="field-select"
              value={form.gender}
              onChange={(event) =>
                updateField('gender', event.target.value as Gender)
              }
            >
              {GENDERS.map((gender) => (
                <option key={gender} value={gender}>
                  {gender}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Sector" htmlFor={`${fieldId}-sector`} required>
            <select
              id={`${fieldId}-sector`}
              className="field-select"
              value={form.sector}
              onChange={(event) =>
                updateField('sector', event.target.value as Sector)
              }
            >
              {SECTORS.map((sector) => (
                <option key={sector} value={sector}>
                  {sector}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Email address"
            htmlFor={`${fieldId}-email`}
            error={errors.email}
            hint="Optional. Used for training communications."
          >
            <input
              id={`${fieldId}-email`}
              type="email"
              className="field-input"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
              aria-invalid={errors.email ? 'true' : undefined}
              aria-describedby={
                errors.email
                  ? `${fieldId}-email-error`
                  : `${fieldId}-email-hint`
              }
            />
          </Field>

          <Field
            label="Contact number"
            htmlFor={`${fieldId}-contact`}
            error={errors.contactNumber}
            hint="Optional. Mobile or landline number."
          >
            <input
              id={`${fieldId}-contact`}
              type="tel"
              className="field-input"
              value={form.contactNumber}
              onChange={(event) =>
                updateField('contactNumber', event.target.value)
              }
              placeholder="+63 917 555 0101"
              autoComplete="tel"
              aria-invalid={errors.contactNumber ? 'true' : undefined}
              aria-describedby={
                errors.contactNumber
                  ? `${fieldId}-contact-error`
                  : `${fieldId}-contact-hint`
              }
            />
          </Field>
        </div>

        <Field
          label="Attendance status"
          htmlFor={`${fieldId}-attendance`}
          required
          hint="Attendance can be updated here or directly from the roster."
        >
          <select
            id={`${fieldId}-attendance`}
            className="field-select"
            value={form.attendanceStatus}
            onChange={(event) =>
              updateField(
                'attendanceStatus',
                event.target.value as AttendanceStatus,
              )
            }
          >
            {ATTENDANCE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </Field>
      </form>
    </Modal>
  )
}
