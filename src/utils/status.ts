import type {
  AttendanceStatus,
  ProjectCategory,
  ProjectStatus,
  TrainingStatus,
  TripStatus,
} from '../types'

export const projectStatusStyles: Record<ProjectStatus, string> = {
  Planned: 'border-sky-200 bg-sky-50 text-sky-700',
  'In Progress': 'border-blue-200 bg-blue-50 text-blue-700',
  'On Hold': 'border-amber-200 bg-amber-50 text-amber-700',
  Completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

export const projectStatusBars: Record<ProjectStatus, string> = {
  Planned: 'bg-sky-400',
  'In Progress': 'bg-blue-500',
  'On Hold': 'bg-amber-400',
  Completed: 'bg-emerald-500',
}

export const projectStatusHex: Record<ProjectStatus, string> = {
  Planned: '#38bdf8',
  'In Progress': '#3b82f6',
  'On Hold': '#f59e0b',
  Completed: '#10b981',
}

export const trainingStatusStyles: Record<TrainingStatus, string> = {
  Upcoming: 'border-sky-200 bg-sky-50 text-sky-700',
  Ongoing: 'border-blue-200 bg-blue-50 text-blue-700',
  Completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Cancelled: 'border-slate-200 bg-slate-100 text-slate-600',
}

export const trainingStatusBars: Record<TrainingStatus, string> = {
  Upcoming: 'bg-sky-400',
  Ongoing: 'bg-blue-500',
  Completed: 'bg-emerald-500',
  Cancelled: 'bg-slate-400',
}

export const tripStatusStyles: Record<TripStatus, string> = {
  Scheduled: 'border-sky-200 bg-sky-50 text-sky-700',
  'In Transit': 'border-blue-200 bg-blue-50 text-blue-700',
  Completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Cancelled: 'border-slate-200 bg-slate-100 text-slate-600',
}

export const tripStatusBars: Record<TripStatus, string> = {
  Scheduled: 'bg-sky-400',
  'In Transit': 'bg-blue-500',
  Completed: 'bg-emerald-500',
  Cancelled: 'bg-slate-400',
}

export const attendanceStyles: Record<AttendanceStatus, string> = {
  Enrolled: 'border-slate-200 bg-slate-100 text-slate-600',
  Attended: 'border-sky-200 bg-sky-50 text-sky-700',
  'Completed / Certified': 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

export const categoryStyles: Record<ProjectCategory, string> = {
  'Free Wi-Fi for All': 'bg-cyan-50 text-cyan-700 ring-cyan-600/15',
  'Tech4ED / Digital Transformation Centers':
    'bg-violet-50 text-violet-700 ring-violet-600/15',
  GovNet: 'bg-blue-50 text-blue-700 ring-blue-600/15',
  PNPI: 'bg-orange-50 text-orange-700 ring-orange-600/15',
  'Capacity Building': 'bg-amber-50 text-amber-700 ring-amber-600/15',
  'LGU Systems Assistance': 'bg-teal-50 text-teal-700 ring-teal-600/15',
}

export function projectInitials(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('')
}
