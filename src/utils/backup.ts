import { api, type BackupPayload } from '../services/api'
import {
  ATTENDANCE_STATUSES,
  GENDERS,
  PROJECT_CATEGORIES,
  PROJECT_STATUSES,
  SCHEDULE_CATEGORIES,
  SCHEDULE_STATUSES,
  SECTORS,
  TRAINING_STATUSES,
  TRIP_STATUSES,
  type ActivityEntity,
  type ActivityLog,
  type AppMeta,
  type AttendanceStatus,
  type DatabaseBackup,
  type Gender,
  type Participant,
  type Project,
  type ProjectCategory,
  type ProjectStatus,
  type Schedule,
  type ScheduleCategory,
  type ScheduleStatus,
  type Sector,
  type Training,
  type TrainingStatus,
  type Trip,
  type TripStatus,
} from '../types'
import { downloadBlob } from './download'
import { fileTimestamp } from './formatters'

export const BACKUP_APP_ID = 'dict-abra-integrated-system' as const
export const BACKUP_VERSION = 1 as const

export interface BackupCounts {
  projects: number
  trainings: number
  participants: number
  trips: number
}

export interface ParsedBackup {
  payload: DatabaseBackup
  counts: BackupCounts
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireString(
  record: Record<string, unknown>,
  field: string,
  context: string,
): string {
  const value = record[field]
  if (typeof value !== 'string') {
    throw new Error(`${context}: "${field}" must be a string.`)
  }
  return value
}

function optionalString(
  record: Record<string, unknown>,
  field: string,
): string {
  const value = record[field]
  return typeof value === 'string' ? value : ''
}

function requireNumber(
  record: Record<string, unknown>,
  field: string,
  context: string,
): number {
  const value = record[field]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${context}: "${field}" must be a valid number.`)
  }
  return value
}

function requireEnum<T extends string>(
  record: Record<string, unknown>,
  field: string,
  allowedValues: readonly T[],
  context: string,
): T {
  const value = record[field]
  if (typeof value !== 'string' || !allowedValues.includes(value as T)) {
    throw new Error(
      `${context}: "${field}" has an unsupported value (${String(value)}).`,
    )
  }
  return value as T
}

function requireArray(data: Record<string, unknown>, key: string): unknown[] {
  const value = data[key]
  if (!Array.isArray(value)) {
    throw new Error(`The backup is missing a valid "${key}" list.`)
  }
  return value
}

function coerceNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed) {
      const parsed = Number(trimmed)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return undefined
}

function parseProject(value: unknown, index: number): Project {
  const context = `Project ${index + 1}`
  if (!isRecord(value)) throw new Error(`${context} is not a valid record.`)

  const coercedId = coerceNumber(value.id)

  return {
    id: (coercedId ?? 0) as number,
    name: requireString(value, 'name', context),
    municipality: requireString(value, 'municipality', context),
    category: requireEnum<ProjectCategory>(
      value,
      'category',
      PROJECT_CATEGORIES,
      context,
    ),
    targetStartDate: optionalString(value, 'targetStartDate'),
    targetCompletionDate: optionalString(value, 'targetCompletionDate'),
    budget: requireNumber(value, 'budget', context),
    leader: requireString(value, 'leader', context),
    status: requireEnum<ProjectStatus>(
      value,
      'status',
      PROJECT_STATUSES,
      context,
    ),
    progress: requireNumber(value, 'progress', context),
    remarks: optionalString(value, 'remarks'),
    createdAt: optionalString(value, 'createdAt') || new Date().toISOString(),
    updatedAt: optionalString(value, 'updatedAt') || new Date().toISOString(),
  }
}

function parseTraining(value: unknown, index: number): Training {
  const context = `Training ${index + 1}`
  if (!isRecord(value)) throw new Error(`${context} is not a valid record.`)

  const coercedId = coerceNumber(value.id)

  return {
    id: (coercedId ?? 0) as number,
    title: requireString(value, 'title', context),
    date: optionalString(value, 'date'),
    durationHours: requireNumber(value, 'durationHours', context),
    venue: requireString(value, 'venue', context),
    trainer: requireString(value, 'trainer', context),
    status: requireEnum<TrainingStatus>(
      value,
      'status',
      TRAINING_STATUSES,
      context,
    ),
    createdAt: optionalString(value, 'createdAt') || new Date().toISOString(),
    updatedAt: optionalString(value, 'updatedAt') || new Date().toISOString(),
  }
}

function parseParticipant(value: unknown, index: number): Participant {
  const context = `Trainee ${index + 1}`
  if (!isRecord(value)) throw new Error(`${context} is not a valid record.`)

  return {
    id: (coerceNumber(value.id) ?? 0) as number,
    trainingId: (coerceNumber(value.trainingId) ?? 0) as number,
    fullName: requireString(value, 'fullName', context),
    gender: requireEnum<Gender>(value, 'gender', GENDERS, context),
    sector: requireEnum<Sector>(value, 'sector', SECTORS, context),
    email: optionalString(value, 'email'),
    contactNumber: optionalString(value, 'contactNumber'),
    attendanceStatus: requireEnum<AttendanceStatus>(
      value,
      'attendanceStatus',
      ATTENDANCE_STATUSES,
      context,
    ),
    createdAt: optionalString(value, 'createdAt') || new Date().toISOString(),
    updatedAt: optionalString(value, 'updatedAt') || new Date().toISOString(),
  }
}

function parsePassengerList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((passenger): passenger is string => typeof passenger === 'string')
      .map((passenger) => passenger.trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(/[\n,;]+/)
      .map((passenger) => passenger.trim())
      .filter(Boolean)
  }

  return []
}

function parseTrip(value: unknown, index: number): Trip {
  const context = `Trip ${index + 1}`
  if (!isRecord(value)) throw new Error(`${context} is not a valid record.`)

  return {
    id: (coerceNumber(value.id) ?? 0) as number,
    tripTitle: requireString(value, 'tripTitle', context),
    destination: requireString(value, 'destination', context),
    departureDate: optionalString(value, 'departureDate'),
    returnDate: optionalString(value, 'returnDate'),
    driverName: requireString(value, 'driverName', context),
    passengers: parsePassengerList(value.passengers),
    purpose: optionalString(value, 'purpose'),
    vehicleDetails: optionalString(value, 'vehicleDetails'),
    status: requireEnum<TripStatus>(
      value,
      'status',
      TRIP_STATUSES,
      context,
    ),
    remarks: optionalString(value, 'remarks'),
    createdAt: optionalString(value, 'createdAt') || new Date().toISOString(),
    updatedAt: optionalString(value, 'updatedAt') || new Date().toISOString(),
  }
}

function parseActivity(value: unknown, index: number): ActivityLog {
  const context = `Activity ${index + 1}`
  if (!isRecord(value)) throw new Error(`${context} is not a valid record.`)

  return {
    id: coerceNumber(value.id),
    entityType: requireEnum<ActivityEntity>(
      value,
      'entityType',
      ['project', 'training', 'participant', 'trip', 'system'],
      context,
    ),
    entityId: optionalString(value, 'entityId') || undefined,
    action: optionalString(value, 'action') || 'updated',
    description: requireString(value, 'description', context),
    occurredAt: optionalString(value, 'occurredAt') || new Date().toISOString(),
  }
}

function parseMeta(value: unknown, index: number): AppMeta {
  const context = `Settings entry ${index + 1}`
  if (!isRecord(value)) throw new Error(`${context} is not a valid record.`)
  return {
    key: requireString(value, 'key', context),
    value: optionalString(value, 'value'),
  }
}

function parseSchedule(value: unknown, index: number): Schedule {
  const context = `Schedule ${index + 1}`
  if (!isRecord(value)) throw new Error(`${context} is not a valid record.`)

  const coercedId = coerceNumber(value.id)

  return {
    id: (coercedId ?? 0) as number,
    title: requireString(value, 'title', context),
    category: requireEnum<ScheduleCategory>(
      value,
      'category',
      SCHEDULE_CATEGORIES,
      context,
    ),
    startDate: optionalString(value, 'startDate'),
    endDate: optionalString(value, 'endDate'),
    location: optionalString(value, 'location'),
    focalPerson: optionalString(value, 'focalPerson'),
    description: optionalString(value, 'description'),
    status: requireEnum<ScheduleStatus>(
      value,
      'status',
      SCHEDULE_STATUSES,
      context,
    ),
    createdAt: optionalString(value, 'createdAt') || new Date().toISOString(),
    updatedAt: optionalString(value, 'updatedAt') || new Date().toISOString(),
  }
}

function parseBackup(parsed: unknown): ParsedBackup {
  if (!isRecord(parsed)) {
    throw new Error('This file does not contain a valid JSON backup.')
  }

  if (parsed.app !== BACKUP_APP_ID) {
    throw new Error('This backup was not created by the DICT Abra system.')
  }

  if (parsed.version !== BACKUP_VERSION) {
    throw new Error(
      `Backup version ${String(parsed.version)} is not supported by this app.`,
    )
  }

  if (!isRecord(parsed.data)) {
    throw new Error('The backup file has no database records.')
  }

  const projects = requireArray(parsed.data, 'projects').map(parseProject)
  const trainings = requireArray(parsed.data, 'trainings').map(parseTraining)
  const participants = requireArray(parsed.data, 'participants').map(
    parseParticipant,
  )
  // Backups created before the Trip Tracker module have no "trips" list.
  const trips = Array.isArray(parsed.data.trips)
    ? parsed.data.trips.map(parseTrip)
    : []
  // Backups created before the Calendar module have no "schedules" list.
  const schedules = Array.isArray(parsed.data.schedules)
    ? parsed.data.schedules.map(parseSchedule)
    : []
  const activities = requireArray(parsed.data, 'activities').map(parseActivity)
  const meta = requireArray(parsed.data, 'meta').map(parseMeta)

  const trainingIds = new Set(trainings.map((training) => training.id))
  const orphan = participants.find(
    (participant) => !trainingIds.has(participant.trainingId),
  )
  if (orphan) {
    throw new Error(
      `Trainee "${orphan.fullName}" is linked to a training that is not in this backup.`,
    )
  }

  const payload: DatabaseBackup = {
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportedAt:
      typeof parsed.exportedAt === 'string'
        ? parsed.exportedAt
        : new Date().toISOString(),
    data: { projects, trainings, participants, trips, activities, schedules, meta },
  }

  return {
    payload,
    counts: {
      projects: projects.length,
      trainings: trainings.length,
      participants: participants.length,
      trips: trips.length,
    },
  }
}

export async function collectBackup(): Promise<BackupPayload> {
  const backup = await api.backup()
  return backup
}

export async function exportDatabaseBackup(): Promise<BackupCounts> {
  const payload = await collectBackup()
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  downloadBlob(
    blob,
    `DICT-Abra-Backup-${fileTimestamp(new Date())}.json`,
  )

  return {
    projects: payload.data.projects.length,
    trainings: payload.data.trainings.length,
    participants: payload.data.participants.length,
    trips: payload.data.trips.length,
  }
}

export async function readBackupFile(file: File): Promise<ParsedBackup> {
  let text: string
  try {
    text = await file.text()
  } catch {
    throw new Error('The selected file could not be read.')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('The selected file is not valid JSON.')
  }

  return parseBackup(parsed)
}

export async function restoreDatabaseBackup(
  backup: DatabaseBackup,
): Promise<BackupCounts> {
  const validated = parseBackup(backup)
  await api.restore(validated.payload)
  await api.meta.set('lastRestoredAt', new Date().toISOString())
  return validated.counts
}
