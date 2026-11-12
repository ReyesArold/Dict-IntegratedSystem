import Dexie, { type Table } from 'dexie'
import type {
  ActivityLog,
  AppMeta,
  Participant,
  Project,
  Schedule,
  Training,
  Trip,
} from '../types'

export class DictAbraDatabase extends Dexie {
  projects!: Table<Project, string>
  trainings!: Table<Training, string>
  participants!: Table<Participant, string>
  trips!: Table<Trip, number>
  activities!: Table<ActivityLog, number>
  meta!: Table<AppMeta, string>
  users!: Table<Record<string, unknown>, string>
  schedules!: Table<Schedule, number>

  constructor() {
    super('dict-abra-integrated-system')

    this.version(1).stores({
      projects:
        'id, name, municipality, category, status, targetCompletionDate, updatedAt',
      trainings: 'id, title, date, status, updatedAt',
      participants:
        'id, trainingId, fullName, gender, sector, attendanceStatus, updatedAt',
      activities: '++id, occurredAt, entityType, entityId',
      meta: 'key',
    })

    this.version(2).stores({
      projects:
        'id, name, municipality, category, status, targetCompletionDate, updatedAt',
      trainings: 'id, title, date, status, updatedAt',
      participants:
        'id, trainingId, fullName, gender, sector, attendanceStatus, updatedAt',
      trips:
        '++id, tripTitle, destination, departureDate, returnDate, status, updatedAt',
      activities: '++id, occurredAt, entityType, entityId',
      meta: 'key',
    })

    // Compatibility with installations that briefly included local accounts.
    this.version(3).stores({
      projects:
        'id, name, municipality, category, status, targetCompletionDate, updatedAt',
      trainings: 'id, title, date, status, updatedAt',
      participants:
        'id, trainingId, fullName, gender, sector, attendanceStatus, updatedAt',
      trips:
        '++id, tripTitle, destination, departureDate, returnDate, status, updatedAt',
      activities: '++id, occurredAt, entityType, entityId',
      meta: 'key',
      users: 'id, &username, fullName, createdAt',
    })

    // Training & Activities Calendar schedules.
    this.version(4).stores({
      projects:
        'id, name, municipality, category, status, targetCompletionDate, updatedAt',
      trainings: 'id, title, date, status, updatedAt',
      participants:
        'id, trainingId, fullName, gender, sector, attendanceStatus, updatedAt',
      trips:
        '++id, tripTitle, destination, departureDate, returnDate, status, updatedAt',
      activities: '++id, occurredAt, entityType, entityId',
      meta: 'key',
      users: 'id, &username, fullName, createdAt',
      schedules: '++id, title, category, startDate, endDate, status, createdAt',
    })
  }
}

export const db = new DictAbraDatabase()
