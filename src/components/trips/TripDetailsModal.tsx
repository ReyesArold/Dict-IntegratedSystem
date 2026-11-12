import {
  CalendarClock,
  CarFront,
  FileText,
  MapPin,
  Pencil,
  Target,
  Truck,
  UserRound,
  Users,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { Trip } from '../../types'
import { formatDateTime } from '../../utils/formatters'
import { tripPassengers, tripTicketNumber } from '../../utils/trips'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { TripStatusBadge } from '../ui/StatusBadge'

interface TripDetailsModalProps {
  trip: Trip
  onClose: () => void
  onEdit: (trip: Trip) => void
  onExport: (trip: Trip) => void
}

interface DetailItemProps {
  icon: ReactNode
  label: string
  value: ReactNode
}

function DetailItem({ icon, label, value }: DetailItemProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
      <div className="flex items-center gap-1.5 text-[9.5px] font-bold tracking-[0.08em] text-slate-400 uppercase">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 text-xs leading-5 font-semibold text-slate-700">
        {value}
      </div>
    </div>
  )
}

export function TripDetailsModal({
  trip,
  onClose,
  onEdit,
  onExport,
}: TripDetailsModalProps) {
  const passengers = tripPassengers(trip)

  return (
    <Modal
      onClose={onClose}
      title="Trip details"
      description="Review the complete travel record before generating the official trip ticket."
      size="lg"
      icon={<CarFront className="h-5 w-5" aria-hidden="true" />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="secondary"
            onClick={() => onEdit(trip)}
            icon={<Pencil className="h-4 w-4" aria-hidden="true" />}
          >
            Edit trip
          </Button>
          <Button
            onClick={() => onExport(trip)}
            icon={<FileText className="h-4 w-4" aria-hidden="true" />}
          >
            Export trip ticket
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.1em] text-slate-400 uppercase">
              {tripTicketNumber(trip)}
            </p>
            <h3 className="mt-1 text-base leading-6 font-bold text-ink-950">
              {trip.tripTitle}
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {trip.destination}, Abra
            </p>
          </div>
          <TripStatusBadge status={trip.status} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <DetailItem
            icon={<CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Departure"
            value={formatDateTime(trip.departureDate)}
          />
          <DetailItem
            icon={<CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Estimated / actual return"
            value={formatDateTime(trip.returnDate)}
          />
          <DetailItem
            icon={<UserRound className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Assigned driver"
            value={trip.driverName}
          />
          <DetailItem
            icon={<Truck className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Vehicle / unit"
            value={trip.vehicleDetails}
          />
          <DetailItem
            icon={<Users className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Passengers"
            value={`${passengers.length} ${passengers.length === 1 ? 'person' : 'people'}`}
          />
          <DetailItem
            icon={<MapPin className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Destination municipality"
            value={trip.destination}
          />
        </div>

        <section className="rounded-xl border border-slate-200 p-4">
          <h4 className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
            <Target className="h-3.5 w-3.5" aria-hidden="true" />
            Official purpose of travel
          </h4>
          <p className="mt-2 text-sm leading-6 whitespace-pre-line text-slate-600">
            {trip.purpose || 'No purpose recorded.'}
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 p-4">
          <h4 className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            Passenger manifest
          </h4>
          {passengers.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              No passengers recorded for this trip.
            </p>
          ) : (
            <ol className="mt-2.5 grid gap-2 sm:grid-cols-2">
              {passengers.map((passenger, index) => (
                <li
                  key={`${passenger}-${index}`}
                  className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-xs text-slate-700"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[9px] font-bold text-slate-500 ring-1 ring-slate-200">
                    {index + 1}
                  </span>
                  <span className="min-w-0 leading-4">{passenger}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <h4 className="text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
            Remarks / Travel notes
          </h4>
          <p className="mt-2 text-xs leading-5 whitespace-pre-line text-slate-600">
            {trip.remarks || 'No additional remarks recorded.'}
          </p>
        </section>
      </div>
    </Modal>
  )
}
