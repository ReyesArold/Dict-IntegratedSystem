import { ArrowRight, CalendarClock, CarFront, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Trip } from '../../types'
import { formatDateTime, todayIsoDate } from '../../utils/formatters'
import { sortTripsByDeparture, tripLocalDateKey } from '../../utils/trips'
import { TripStatusBadge } from '../ui/StatusBadge'

interface UpcomingTripsCardProps {
  trips: Trip[]
}

export function UpcomingTripsCard({ trips }: UpcomingTripsCardProps) {
  const ongoing = sortTripsByDeparture(
    trips.filter((trip) => trip.status === 'In Transit'),
    'asc',
  )
  const scheduled = sortTripsByDeparture(
    trips.filter(
      (trip) =>
        trip.status === 'Scheduled' &&
        tripLocalDateKey(trip.departureDate) >= todayIsoDate(),
    ),
    'asc',
  )
  const activeTrips = [...ongoing, ...scheduled].slice(0, 4)

  return (
    <section className="card overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-[15px] font-bold text-ink-950">
            Upcoming &amp; Ongoing Trips
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Official DICT Abra field travel at a glance
          </p>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
          <CarFront className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>

      {activeTrips.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
            <CalendarClock className="h-4.5 w-4.5" aria-hidden="true" />
          </span>
          <p className="mt-3 text-xs font-semibold text-slate-600">
            No upcoming or ongoing trips
          </p>
          <p className="mt-1 text-[11px] leading-5 text-slate-400">
            Scheduled and in-transit field travel will appear here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {activeTrips.map((trip) => (
            <li key={trip.id} className="px-5 py-3.5">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 text-xs leading-5 font-bold text-ink-950">
                  {trip.tripTitle}
                </p>
                <TripStatusBadge status={trip.status} />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-slate-400" aria-hidden="true" />
                  {trip.destination}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarClock
                    className="h-3 w-3 text-slate-400"
                    aria-hidden="true"
                  />
                  {formatDateTime(trip.departureDate)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-5 py-2.5">
        <p className="text-[10px] font-semibold text-slate-400">
          {ongoing.length} ongoing · {scheduled.length} scheduled
        </p>
        <Link
          to="/trips"
          className="inline-flex items-center gap-1 text-[10.5px] font-bold text-brand-700 hover:text-brand-800"
        >
          Open Trip Tracker
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
