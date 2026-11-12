import { Calendar, Clock, Edit3, MapPin, Trash2, User } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import type { CalendarEvent } from '../../types'

interface ScheduleDetailModalProps {
  open: boolean
  onClose: () => void
  event: CalendarEvent | null
  onEdit: () => void
  onDelete: () => void
}

function formatDateTime(value: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ScheduleDetailModal({
  open,
  onClose,
  event,
  onEdit,
  onDelete,
}: ScheduleDetailModalProps) {
  if (!event) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={event.title}
      description={event.category}
      size="md"
      icon={<Calendar className="h-5 w-5" />}
      footer={
        <>
          <Button variant="ghost" onClick={onDelete} className="text-rose-600 hover:bg-rose-50">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onEdit} icon={<Edit3 className="h-4 w-4" aria-hidden="true" />}>
            Edit
          </Button>
        </>
      }
    >
      <dl className="space-y-3 text-sm">
        <div className="flex items-start gap-2.5">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <div>
            <dt className="text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
              Schedule
            </dt>
            <dd className="mt-0.5 text-slate-700">
              {formatDateTime(event.startDate)}
              {event.endDate ? ` — ${formatDateTime(event.endDate)}` : ''}
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <div>
            <dt className="text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
              Location
            </dt>
            <dd className="mt-0.5 text-slate-700">{event.location || '—'}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <User className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <div>
            <dt className="text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
              Focal person
            </dt>
            <dd className="mt-0.5 text-slate-700">{event.focalPerson || '—'}</dd>
          </div>
        </div>
        <div>
          <dt className="text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
            Status
          </dt>
          <dd className="mt-0.5 text-slate-700">{event.status}</dd>
        </div>
        {event.description ? (
          <div>
            <dt className="text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
              Description
            </dt>
            <dd className="mt-0.5 leading-6 text-slate-700">{event.description}</dd>
          </div>
        ) : null}
        <div className="text-[10px] text-slate-400">
          Source: {event.source}
        </div>
      </dl>
    </Modal>
  )
}
