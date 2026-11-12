import { CheckCircle2 } from 'lucide-react'
import type {
  AttendanceStatus,
  ProjectCategory,
  ProjectStatus,
  TrainingStatus,
  TripStatus,
} from '../../types'
import { cn } from '../../utils/cn'
import {
  attendanceStyles,
  categoryStyles,
  projectStatusStyles,
  trainingStatusStyles,
  tripStatusStyles,
} from '../../utils/status'

interface ProjectStatusBadgeProps {
  status: ProjectStatus
}

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap',
        projectStatusStyles[status],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {status}
    </span>
  )
}

interface TrainingStatusBadgeProps {
  status: TrainingStatus
}

export function TrainingStatusBadge({ status }: TrainingStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap',
        trainingStatusStyles[status],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {status}
    </span>
  )
}

interface TripStatusBadgeProps {
  status: TripStatus
}

export function TripStatusBadge({ status }: TripStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap',
        tripStatusStyles[status],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {status}
    </span>
  )
}

interface AttendanceBadgeProps {
  status: AttendanceStatus
  compact?: boolean
}

export function AttendanceBadge({ status, compact = false }: AttendanceBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap',
        attendanceStyles[status],
        compact && 'px-2 py-0.5 text-[10px]',
      )}
    >
      {status === 'Completed / Certified' ? (
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      )}
      {status === 'Completed / Certified' ? 'Certified' : status}
    </span>
  )
}

interface CategoryBadgeProps {
  category: ProjectCategory
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full rounded-md px-2 py-1 text-[10.5px] leading-4 font-semibold ring-1 ring-inset',
        categoryStyles[category],
      )}
    >
      <span className="truncate">{category}</span>
    </span>
  )
}
