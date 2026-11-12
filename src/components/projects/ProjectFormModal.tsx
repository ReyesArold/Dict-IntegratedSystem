import { Save } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { recordActivity } from '../../db/activities'
import { api } from '../../services/api'
import {
  ABRA_MUNICIPALITIES,
  PROJECT_CATEGORIES,
  PROJECT_STATUSES,
  type Project,
  type ProjectCategory,
  type ProjectStatus,
} from '../../types'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { useToast } from '../ui/toast-context'

interface ProjectFormModalProps {
  project?: Project | null
  onClose: () => void
}

interface ProjectFormState {
  name: string
  municipality: string
  category: ProjectCategory
  targetStartDate: string
  targetCompletionDate: string
  budget: string
  leader: string
  status: ProjectStatus
  progress: string
  remarks: string
}

type ProjectFormErrors = Partial<Record<keyof ProjectFormState, string>>

const inputErrorProps = (
  field: keyof ProjectFormState,
  errors: ProjectFormErrors,
  id: string,
  idSuffix: string = field,
) => ({
  'aria-invalid': errors[field] ? ('true' as const) : undefined,
  'aria-describedby': errors[field]
    ? `${id}-${idSuffix}-error`
    : undefined,
})

export function ProjectFormModal({
  project,
  onClose,
}: ProjectFormModalProps) {
  const toast = useToast()
  const formId = useId()
  const fieldId = useId()
  const isEditing = Boolean(project)

  const [form, setForm] = useState<ProjectFormState>({
    name: project?.name ?? '',
    municipality: project?.municipality ?? 'Bangued',
    category: project?.category ?? 'Free Wi-Fi for All',
    targetStartDate: project?.targetStartDate ?? '',
    targetCompletionDate: project?.targetCompletionDate ?? '',
    budget: project ? String(project.budget) : '',
    leader: project?.leader ?? '',
    status: project?.status ?? 'Planned',
    progress: project ? String(project.progress) : '0',
    remarks: project?.remarks ?? '',
  })
  const [errors, setErrors] = useState<ProjectFormErrors>({})
  const [saving, setSaving] = useState(false)

  function updateField<K extends keyof ProjectFormState>(
    field: K,
    value: ProjectFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  function validate(): ProjectFormErrors {
    const next: ProjectFormErrors = {}
    const budget = Number(form.budget)
    const progress = Number(form.progress)

    if (form.name.trim().length < 3) {
      next.name = 'Enter a project name with at least 3 characters.'
    }
    if (!form.municipality) {
      next.municipality = 'Select the project location.'
    }
    if (!form.targetStartDate) {
      next.targetStartDate = 'Select the target start date.'
    }
    if (!form.targetCompletionDate) {
      next.targetCompletionDate = 'Select the target completion date.'
    } else if (
      form.targetStartDate &&
      form.targetCompletionDate < form.targetStartDate
    ) {
      next.targetCompletionDate =
        'Completion date cannot be earlier than the start date.'
    }
    if (!form.budget.trim() || !Number.isFinite(budget) || budget < 0) {
      next.budget = 'Enter a valid budget of zero or higher.'
    }
    if (form.leader.trim().length < 3) {
      next.leader = 'Enter the project leader or focal person.'
    }
    if (
      !form.progress.trim() ||
      !Number.isFinite(progress) ||
      progress < 0 ||
      progress > 100
    ) {
      next.progress = 'Progress must be a number from 0 to 100.'
    } else if (!Number.isInteger(progress)) {
      next.progress = 'Use a whole number for progress.'
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
      name: form.name.trim(),
      municipality: form.municipality,
      category: form.category,
      targetStartDate: form.targetStartDate,
      targetCompletionDate: form.targetCompletionDate,
      budget: Number(form.budget),
      leader: form.leader.trim(),
      status: form.status,
      progress: Number(form.progress),
      remarks: form.remarks.trim(),
      createdAt: project?.createdAt ?? now,
      updatedAt: now,
    }

    try {
      if (project) {
        await api.projects.update(project.id as number, payload)
        const statusChanged = project.status !== payload.status
        await recordActivity(
          'project',
          'updated',
          statusChanged
            ? `${payload.name} status changed from ${project.status} to ${payload.status}.`
            : `${payload.name} project details were updated.`,
          String(project.id),
        )
        toast.success('Project updated', `${payload.name} was saved.`)
      } else {
        const created = await api.projects.create(payload)
        await recordActivity(
          'project',
          'created',
          `New project added: ${payload.name}.`,
          String(created.id),
        )
        toast.success('Project added', `${payload.name} is now in the project register.`)
      }
      onClose()
    } catch (error) {
      toast.error(
        'Project could not be saved',
        error instanceof Error ? error.message : 'Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      onClose={onClose}
      title={isEditing ? 'Edit project' : 'Add a new project'}
      description={
        isEditing
          ? 'Update the project record. Changes are saved locally on this device.'
          : 'Record a new DICT infrastructure, connectivity, or ICT development project.'
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
            {isEditing ? 'Save changes' : 'Add project'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Field
          label="Project name"
          htmlFor={`${fieldId}-name`}
          required
          error={errors.name}
        >
          <input
            id={`${fieldId}-name`}
            className="field-input"
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
            placeholder="e.g. Free Wi-Fi for All — Bangued Public Market"
            maxLength={180}
            {...inputErrorProps('name', errors, fieldId)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Location / Municipality"
            htmlFor={`${fieldId}-municipality`}
            required
            error={errors.municipality}
          >
            <select
              id={`${fieldId}-municipality`}
              className="field-select"
              value={form.municipality}
              onChange={(event) => updateField('municipality', event.target.value)}
              {...inputErrorProps('municipality', errors, fieldId)}
            >
              {ABRA_MUNICIPALITIES.map((municipality) => (
                <option key={municipality} value={municipality}>
                  {municipality}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Project category"
            htmlFor={`${fieldId}-category`}
            required
            error={errors.category}
          >
            <select
              id={`${fieldId}-category`}
              className="field-select"
              value={form.category}
              onChange={(event) =>
                updateField('category', event.target.value as ProjectCategory)
              }
            >
              {PROJECT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Target start date"
            htmlFor={`${fieldId}-start`}
            required
            error={errors.targetStartDate}
          >
            <input
              id={`${fieldId}-start`}
              type="date"
              className="field-input"
              value={form.targetStartDate}
              onChange={(event) =>
                updateField('targetStartDate', event.target.value)
              }
              {...inputErrorProps('targetStartDate', errors, fieldId, 'start')}
            />
          </Field>

          <Field
            label="Target completion date"
            htmlFor={`${fieldId}-completion`}
            required
            error={errors.targetCompletionDate}
          >
            <input
              id={`${fieldId}-completion`}
              type="date"
              className="field-input"
              value={form.targetCompletionDate}
              min={form.targetStartDate || undefined}
              onChange={(event) =>
                updateField('targetCompletionDate', event.target.value)
              }
              {...inputErrorProps(
                'targetCompletionDate',
                errors,
                fieldId,
                'completion',
              )}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Budget allocated (PHP)"
            htmlFor={`${fieldId}-budget`}
            required
            error={errors.budget}
            hint="Enter the full approved project amount."
          >
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-xs font-bold text-slate-400">
                PHP
              </span>
              <input
                id={`${fieldId}-budget`}
                type="number"
                min="0"
                step="1000"
                className="field-input pl-12"
                value={form.budget}
                onChange={(event) => updateField('budget', event.target.value)}
                placeholder="0"
                {...inputErrorProps('budget', errors, fieldId)}
              />
            </div>
          </Field>

          <Field
            label="Project leader / Focal person"
            htmlFor={`${fieldId}-leader`}
            required
            error={errors.leader}
          >
            <input
              id={`${fieldId}-leader`}
              className="field-input"
              value={form.leader}
              onChange={(event) => updateField('leader', event.target.value)}
              placeholder="e.g. Engr. Maria Elena Valera"
              maxLength={120}
              {...inputErrorProps('leader', errors, fieldId)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Project status"
            htmlFor={`${fieldId}-status`}
            required
          >
            <select
              id={`${fieldId}-status`}
              className="field-select"
              value={form.status}
              onChange={(event) =>
                updateField('status', event.target.value as ProjectStatus)
              }
            >
              {PROJECT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Progress (%)"
            htmlFor={`${fieldId}-progress`}
            required
            error={errors.progress}
          >
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                className="h-1.5 min-w-0 flex-1 cursor-pointer accent-ink-900"
                value={form.progress}
                onChange={(event) => updateField('progress', event.target.value)}
                aria-label="Project progress slider"
              />
              <input
                id={`${fieldId}-progress`}
                type="number"
                min="0"
                max="100"
                step="1"
                className="field-input w-[84px] text-center font-semibold"
                value={form.progress}
                onChange={(event) => updateField('progress', event.target.value)}
                {...inputErrorProps('progress', errors, fieldId)}
              />
            </div>
          </Field>
        </div>

        <Field
          label="Remarks / Issues / Blockers"
          htmlFor={`${fieldId}-remarks`}
          error={errors.remarks}
          hint="Optional. Document dependencies, issues, or next steps."
        >
          <textarea
            id={`${fieldId}-remarks`}
            className="field-textarea"
            rows={3}
            value={form.remarks}
            onChange={(event) => updateField('remarks', event.target.value)}
            placeholder="State any issue, blocker, or note for this project."
            maxLength={1500}
            {...inputErrorProps('remarks', errors, fieldId)}
          />
        </Field>
      </form>
    </Modal>
  )
}
