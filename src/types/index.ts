export const PROJECT_CATEGORIES = [
  'Free Wi-Fi for All',
  'Tech4ED / Digital Transformation Centers',
  'GovNet',
  'PNPI',
  'Capacity Building',
  'LGU Systems Assistance',
] as const

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number]

export const PROJECT_STATUSES = [
  'Planned',
  'In Progress',
  'On Hold',
  'Completed',
] as const

export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export interface Project {
  id: number
  name: string
  municipality: string
  category: ProjectCategory
  targetStartDate: string
  targetCompletionDate: string
  budget: number
  leader: string
  status: ProjectStatus
  progress: number
  remarks: string
  createdAt: string
  updatedAt: string
}

export const TRAINING_STATUSES = [
  'Upcoming',
  'Ongoing',
  'Completed',
  'Cancelled',
] as const

export type TrainingStatus = (typeof TRAINING_STATUSES)[number]

export interface Training {
  id: number
  title: string
  date: string
  durationHours: number
  venue: string
  trainer: string
  status: TrainingStatus
  createdAt: string
  updatedAt: string
}

export const TRIP_STATUSES = [
  'Scheduled',
  'In Transit',
  'Completed',
  'Cancelled',
] as const

export type TripStatus = (typeof TRIP_STATUSES)[number]

export interface Trip {
  id: number
  tripTitle: string
  destination: string
  departureDate: string
  returnDate: string
  driverName: string
  passengers: string[]
  purpose: string
  vehicleDetails: string
  status: TripStatus
  remarks: string
  createdAt: string
  updatedAt: string
}

export const GENDERS = ['Male', 'Female'] as const

export type Gender = (typeof GENDERS)[number]

export const SECTORS = [
  'LGU Employee',
  'Barangay Official',
  'Student',
  'Teacher',
  'MSME',
  'Senior Citizen',
  'Youth',
  'PWD',
  'Other',
] as const

export type Sector = (typeof SECTORS)[number]

export const ATTENDANCE_STATUSES = [
  'Enrolled',
  'Attended',
  'Completed / Certified',
] as const

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

export interface Participant {
  id: number
  trainingId: number
  fullName: string
  gender: Gender
  sector: Sector
  email: string
  contactNumber: string
  attendanceStatus: AttendanceStatus
  createdAt: string
  updatedAt: string
}

export type ActivityEntity =
  | 'project'
  | 'training'
  | 'participant'
  | 'trip'
  | 'system'

export interface ActivityLog {
  id?: number
  entityType: ActivityEntity
  entityId?: string
  action: string
  description: string
  occurredAt: string
}

export interface AppMeta {
  key: string
  value: string
}

export const SCHEDULE_CATEGORIES = [
  'Programs & Activities',
  'Meetings',
  'Training & Seminar',
  'Official Travel / Trips',
  'Stakeholder Consultation',
  'Project Implementation',
] as const

export type ScheduleCategory = (typeof SCHEDULE_CATEGORIES)[number]

export const SCHEDULE_STATUSES = [
  'Scheduled',
  'Approved',
  'Pending',
  'Completed',
] as const

export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number]

export interface Schedule {
  id?: number
  title: string
  category: ScheduleCategory
  startDate: string
  endDate: string
  location: string
  focalPerson: string
  description: string
  status: ScheduleStatus
  createdAt: string
  updatedAt: string
}

export type CalendarEventSource = 'schedule' | 'training' | 'trip' | 'project'

export interface CalendarEvent {
  id: string
  title: string
  category: ScheduleCategory
  startDate: string
  endDate: string
  location: string
  focalPerson: string
  description: string
  status: string
  source: CalendarEventSource
  scheduleId?: number
}

export const ABRA_MUNICIPALITIES = [
  'Bangued',
  'Boliney',
  'Bucay',
  'Bucloc',
  'Daguioman',
  'Danglas',
  'Dolores',
  'La Paz',
  'Lacub',
  'Lagangilang',
  'Lagayan',
  'Langiden',
  'Licuan-Baay',
  'Luba',
  'Malibcong',
  'Manabo',
  'Peñarrubia',
  'Pidigan',
  'Pilar',
  'Sallapadan',
  'San Isidro',
  'San Juan',
  'San Quintin',
  'Tayum',
  'Tineg',
  'Tubo',
  'Villaviciosa',
  'Province-wide',
] as const

export type AbraMunicipality = (typeof ABRA_MUNICIPALITIES)[number]

export interface DatabaseBackup {
  app: 'dict-abra-integrated-system'
  version: 1
  exportedAt: string
  data: {
    projects: Project[]
    trainings: Training[]
    participants: Participant[]
    trips: Trip[]
    activities: ActivityLog[]
    schedules: Schedule[]
    meta: AppMeta[]
  }
}
