import { Save } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { recordActivity } from '../../db/activities'
import { api } from '../../services/api'
import {
  ABRA_MUNICIPALITIES,
  TRIP_STATUSES,
  type Trip,
  type TripStatus,
} from '../../types'
import {
  fromDateTimeLocalValue,
  parsePassengersInput,
  passengersToInput,
  toDateTimeLocalValue,
} from '../../utils/trips'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { useToast } from '../ui/toast-context'

interface TripFormModalProps {
  trip?: Trip | null
  onClose: () => void
}

interface TripFormState {
  tripTitle: string
  destination: string
  departureDate: string
  returnDate: string
  driverName: string
  passengers: string
  purpose: string
  vehicleDetails: string
  status: TripStatus
  remarks: string
}

type TripFormErrors = Partial<Record<keyof TripFormState, string>>

const inputErrorProps = (
  field: keyof TripFormState,
  errors: TripFormErrors,
  id: string,
) => ({
  'aria-invalid': errors[field] ? ('true' as const) : undefined,
  'aria-describedby': errors[field] ? `${id}-${field}-error` : undefined,
})

export function TripFormModal({ trip, onClose }: TripFormModalProps) {
  const toast = useToast()
  const formId = useId()
  const fieldId = useId()
  const isEditing = Boolean(trip)

  const [form, setForm] = useState<TripFormState>({
    tripTitle: trip?.tripTitle ?? '',
    destination: trip?.destination ?? 'Bangued',
    departureDate: toDateTimeLocalValue(trip?.departureDate ?? ''),
    returnDate: toDateTimeLocalValue(trip?.returnDate ?? ''),
    driverName: trip?.driverName ?? '',
    passengers: passengersToInput(trip?.passengers ?? []),
    purpose: trip?.purpose ?? '',
    vehicleDetails: trip?.vehicleDetails ?? '',
    status: trip?.status ?? 'Scheduled',
    remarks: trip?.remarks ?? '',
  })
  const [errors, setErrors] = useState<TripFormErrors>({})
  const [saving, setSaving] = useState(false)

  function updateField<K extends keyof TripFormState>(
    field: K,
    value: TripFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  function validate(): TripFormErrors {
    const next: TripFormErrors = {}
    const passengers = parsePassengersInput(form.passengers)

    if (form.tripTitle.trim().length < 3) {
      next.tripTitle = 'Enter a trip title with at least 3 characters.'
    }
    if (!form.destination) {
      next.destination = 'Select the destination municipality.'
    }
    if (!form.departureDate) {
      next.departureDate = 'Select the departure date and time.'
    }
    if (!form.returnDate) {
      next.returnDate = 'Select the estimated or actual return date and time.'
    } else if (form.departureDate && form.returnDate < form.departureDate) {
      next.returnDate = 'Return cannot be earlier than departure.'
    }
    if (form.driverName.trim().length < 3) {
      next.driverName = 'Enter the assigned driver.'
    }
    if (passengers.length === 0) {
      next.passengers = 'List at least one passenger or personnel traveling.'
    }
    if (form.vehicleDetails.trim().length < 3) {
      next.vehicleDetails = 'Enter the vehicle plate number or unit identifier.'
    }
    if (form.purpose.trim().length < 10) {
      next.purpose = 'Describe the official purpose of travel (at least 10 characters).'
    }
    if (form.remarks.length > 1500) {
      next.remarks = 'Remarks must not exceed 1,500 characters.'
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
      tripTitle: form.tripTitle.trim(),
      destination: form.destination,
      departureDate: fromDateTimeLocalValue(form.departureDate),
      returnDate: fromDateTimeLocalValue(form.returnDate),
      driverName: form.driverName.trim(),
      passengers: parsePassengersInput(form.passengers),
      purpose: form.purpose.trim(),
      vehicleDetails: form.vehicleDetails.trim(),
      status: form.status,
      remarks: form.remarks.trim(),
      createdAt: trip?.createdAt ?? now,
      updatedAt: now,
    }

    try {
      if (trip?.id !== undefined) {
        await api.trips.update(trip.id, payload)
        await recordActivity(
          'trip',
          'updated',
          trip.status !== payload.status
            ? `${payload.tripTitle} status changed from ${trip.status} to ${payload.status}.`
            : `${payload.tripTitle} trip details were updated.`,
          String(trip.id),
        )
        toast.success('Trip updated', `${payload.tripTitle} was saved.`)
      } else {
        const created = await api.trips.create(payload)
        await recordActivity(
          'trip',
          'created',
          `New trip logged: ${payload.tripTitle} to ${payload.destination}.`,
          String(created.id),
        )
        toast.success(
          'Trip logged',
          `${payload.tripTitle} is now in the trip register.`,
        )
      }
      onClose()
    } catch (error) {
      toast.error(
        'Trip could not be saved',
        error instanceof Error ? error.message : 'Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      onClose={onClose}
      title={isEditing ? 'Edit trip record' : 'Log an official trip'}
      description={
        isEditing
          ? 'Update the travel details. Changes are saved locally on this device.'
          : 'Record a DICT Abra field trip, vehicle assignment, and passenger manifest.'
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
            {isEditing ? 'Save changes' : 'Log trip'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Field
          label="Trip title / Activity"
          htmlFor={`${fieldId}-tripTitle`}
          required
          error={errors.tripTitle}
        >
          <input
            id={`${fieldId}-tripTitle`}
            className="field-input"
            value={form.tripTitle}
            onChange={(event) => updateField('tripTitle', event.target.value)}
            placeholder="e.g. Free Wi-Fi Site Inspection — Tubo LGU"
            maxLength={180}
            {...inputErrorProps('tripTitle', errors, fieldId)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Destination / Municipality"
            htmlFor={`${fieldId}-destination`}
            required
            error={errors.destination}
          >
            <select
              id={`${fieldId}-destination`}
              className="field-select"
              value={form.destination}
              onChange={(event) => updateField('destination', event.target.value)}
              {...inputErrorProps('destination', errors, fieldId)}
            >
              {ABRA_MUNICIPALITIES.map((municipality) => (
                <option key={municipality} value={municipality}>
                  {municipality}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Trip status" htmlFor={`${fieldId}-status`} required>
            <select
              id={`${fieldId}-status`}
              className="field-select"
              value={form.status}
              onChange={(event) =>
                updateField('status', event.target.value as TripStatus)
              }
            >
              {TRIP_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Departure date & time"
            htmlFor={`${fieldId}-departureDate`}
            required
            error={errors.departureDate}
          >
            <input
              id={`${fieldId}-departureDate`}
              type="datetime-local"
              className="field-input"
              value={form.departureDate}
              onChange={(event) =>
                updateField('departureDate', event.target.value)
              }
              {...inputErrorProps('departureDate', errors, fieldId)}
            />
          </Field>

          <Field
            label="Return date & time"
            htmlFor={`${fieldId}-returnDate`}
            required
            error={errors.returnDate}
            hint="Estimated or actual return to the office."
          >
            <input
              id={`${fieldId}-returnDate`}
              type="datetime-local"
              className="field-input"
              value={form.returnDate}
              min={form.departureDate || undefined}
              onChange={(event) => updateField('returnDate', event.target.value)}
              {...inputErrorProps('returnDate', errors, fieldId)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Assigned driver"
            htmlFor={`${fieldId}-driverName`}
            required
            error={errors.driverName}
          >
            <input
              id={`${fieldId}-driverName`}
              className="field-input"
              value={form.driverName}
              onChange={(event) => updateField('driverName', event.target.value)}
              placeholder="e.g. Rolando B. Bautista (Office Driver)"
              maxLength={120}
              {...inputErrorProps('driverName', errors, fieldId)}
            />
          </Field>

          <Field
            label="Vehicle / Unit details"
            htmlFor={`${fieldId}-vehicleDetails`}
            required
            error={errors.vehicleDetails}
          >
            <input
              id={`${fieldId}-vehicleDetails`}
              className="field-input"
              value={form.vehicleDetails}
              onChange={(event) =>
                updateField('vehicleDetails', event.target.value)
              }
              placeholder="e.g. DICT Pick-up — Plate No. CAG 4821"
              maxLength={140}
              {...inputErrorProps('vehicleDetails', errors, fieldId)}
            />
          </Field>
        </div>

        <Field
          label="Passengers / Personnel traveling"
          htmlFor={`${fieldId}-passengers`}
          required
          error={errors.passengers}
          hint="Enter one passenger per line, or separate names with commas."
        >
          <textarea
            id={`${fieldId}-passengers`}
            className="field-textarea"
            rows={4}
            value={form.passengers}
            onChange={(event) => updateField('passengers', event.target.value)}
            placeholder={'Engr. Maria Elena Valera\nJayson P. Bermudez\nMark Anthony Bautista'}
            maxLength={1200}
            {...inputErrorProps('passengers', errors, fieldId)}
          />
        </Field>

        <Field
          label="Official purpose of travel"
          htmlFor={`${fieldId}-purpose`}
          required
          error={errors.purpose}
        >
          <textarea
            id={`${fieldId}-purpose`}
            className="field-textarea"
            rows={4}
            value={form.purpose}
            onChange={(event) => updateField('purpose', event.target.value)}
            placeholder="Describe the inspection, meeting, turnover, or field activity to be conducted."
            maxLength={1500}
            {...inputErrorProps('purpose', errors, fieldId)}
          />
        </Field>

        <Field
          label="Remarks / Fuel logs / Travel issues"
          htmlFor={`${fieldId}-remarks`}
          error={errors.remarks}
          hint="Optional. Document fuel, expenses, delays, or other travel notes."
        >
          <textarea
            id={`${fieldId}-remarks`}
            className="field-textarea"
            rows={3}
            value={form.remarks}
            onChange={(event) => updateField('remarks', event.target.value)}
            placeholder="State any note, issue, or follow-up for this trip."
            maxLength={1500}
            {...inputErrorProps('remarks', errors, fieldId)}
          />
        </Field>
      </form>
    </Modal>
  )
}
