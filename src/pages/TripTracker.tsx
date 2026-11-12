import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  CarFront,
  CheckCircle2,
  Eye,
  FileSpreadsheet,
  FileText,
  MapPin,
  Navigation,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Truck,
  UserRound,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { KpiCard } from '../components/dashboard/KpiCard'
import { TripDetailsModal } from '../components/trips/TripDetailsModal'
import { TripFormModal } from '../components/trips/TripFormModal'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { TripStatusBadge } from '../components/ui/StatusBadge'
import { useToast } from '../components/ui/toast-context'
import { api } from '../services/api'
import type { Trip } from '../services/api'
import { recordActivity } from '../db/activities'
import { TRIP_STATUSES, type TripStatus } from '../types'
import {
  formatDate,
  formatDateTime,
  formatNumber,
  todayIsoDate,
} from '../utils/formatters'
import { exportTripsExcel, exportTripsMasterlistPdf, exportTripTicketPdf } from '../utils/exportUtils'
import {
  getTopDestination,
  sortTripsByDeparture,
  tripLocalDateKey,
  tripPassengers,
} from '../utils/trips'

type SortDirection = 'asc' | 'desc'

function TripTrackerSkeleton() {
  return (
    <div className="animate-pulse space-y-5" aria-label="Loading trip tracker">
      <div className="h-24 rounded-2xl bg-white/70" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card h-32" />
        ))}
      </div>
      <div className="card h-96" />
    </div>
  )
}

export function TripTrackerPage() {
  const toast = useToast()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | TripStatus>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [formOpen, setFormOpen] = useState(false)
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [viewingTrip, setViewingTrip] = useState<Trip | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Trip | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true
    api.trips
      .list()
      .then((data) => {
        if (active) setTrips(data)
      })
      .catch((error) => {
        console.error('DICT Abra could not load trips:', error)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const filteredTrips = useMemo(() => {
    if (!trips) return []
    const query = search.trim().toLowerCase()

    const filtered = trips.filter((trip) => {
      const matchesSearch =
        !query ||
        [
          trip.tripTitle,
          trip.destination,
          trip.driverName,
          tripPassengers(trip).join(' '),
          trip.vehicleDetails,
          trip.purpose,
        ]
          .join(' ')
          .toLowerCase()
          .includes(query)
      const matchesStatus =
        statusFilter === 'all' || trip.status === statusFilter
      const departureKey = tripLocalDateKey(trip.departureDate)
      const matchesFrom = !fromDate || departureKey >= fromDate
      const matchesTo = !toDate || departureKey <= toDate

      return matchesSearch && matchesStatus && matchesFrom && matchesTo
    })

    return sortTripsByDeparture(filtered, sortDirection)
  }, [trips, search, statusFilter, fromDate, toDate, sortDirection])

  const hasActiveFilters =
    search.trim().length > 0 ||
    statusFilter !== 'all' ||
    fromDate.length > 0 ||
    toDate.length > 0

  if (loading) {
    return <TripTrackerSkeleton />
  }

  const completedTrips = trips.filter((trip) => trip.status === 'Completed')
  const inTransitTrips = trips.filter((trip) => trip.status === 'In Transit')
  const scheduledTrips = trips.filter((trip) => trip.status === 'Scheduled')
  const cancelledTrips = trips.filter((trip) => trip.status === 'Cancelled')
  const upcomingScheduled = sortTripsByDeparture(
    scheduledTrips.filter(
      (trip) => tripLocalDateKey(trip.departureDate) >= todayIsoDate(),
    ),
    'asc',
  )
  const topDestination = getTopDestination(trips)

  const filterParts: string[] = []
  if (statusFilter !== 'all') filterParts.push(`Status: ${statusFilter}`)
  if (fromDate) filterParts.push(`From: ${formatDate(fromDate)}`)
  if (toDate) filterParts.push(`To: ${formatDate(toDate)}`)
  const filterSummary =
    filterParts.length > 0
      ? filterParts.join('   |   ')
      : 'All trips recorded in the DICT Abra Trip Tracker'

  function resetFilters() {
    setSearch('')
    setStatusFilter('all')
    setFromDate('')
    setToDate('')
  }

  function toggleSort() {
    setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
  }

  function openCreateForm() {
    setEditingTrip(null)
    setViewingTrip(null)
    setFormOpen(true)
  }

  function openEditForm(trip: Trip) {
    setEditingTrip(trip)
    setViewingTrip(null)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingTrip(null)
    // Refresh the register so newly created or edited trips appear.
    api.trips
      .list()
      .then((data) => setTrips(data))
      .catch(() => {})
  }

  function runExport(label: string, action: () => void) {
    try {
      action()
      toast.success(
        `${label} generated`,
        'The official file has been downloaded to this device.',
      )
    } catch (error) {
      toast.error(
        `${label} could not be generated`,
        error instanceof Error ? error.message : 'Please try again.',
      )
    }
  }

  function handleExportTicket(trip: Trip) {
    runExport('Trip ticket', () => exportTripTicketPdf(trip))
  }

  function handleExportMasterlist() {
    runExport('Trip masterlist PDF', () =>
      exportTripsMasterlistPdf(filteredTrips, filterSummary),
    )
  }

  function handleExportExcel() {
    runExport('Trip register Excel report', () =>
      exportTripsExcel(filteredTrips, filterSummary),
    )
  }

  async function handleDelete() {
    if (!deleteTarget?.id) return
    setDeleting(true)
    try {
      await api.trips.delete(deleteTarget.id)
      await recordActivity(
        'trip',
        'deleted',
        `${deleteTarget.tripTitle} was removed from the trip register.`,
        String(deleteTarget.id),
      )
      toast.success(
        'Trip deleted',
        `${deleteTarget.tripTitle} was removed from the register.`,
      )
      setTrips((current) =>
        current.filter((trip) => trip.id !== deleteTarget.id),
      )
      setDeleteTarget(null)
    } catch (error) {
      toast.error(
        'Trip could not be deleted',
        error instanceof Error ? error.message : 'Please try again.',
      )
    } finally {
      setDeleting(false)
    }
  }

  const SortIcon = sortDirection === 'asc' ? ArrowUp : ArrowDown

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Field operations"
        title="Trip Tracker"
        description="Plan official DICT Abra field travel, record vehicle assignments and passenger manifests, and generate travel orders and masterlists entirely offline."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={handleExportMasterlist}
              disabled={filteredTrips.length === 0}
              icon={<FileText className="h-4 w-4" aria-hidden="true" />}
            >
              Masterlist PDF
            </Button>
            <Button
              variant="secondary"
              onClick={handleExportExcel}
              disabled={filteredTrips.length === 0}
              icon={<FileSpreadsheet className="h-4 w-4" aria-hidden="true" />}
            >
              Excel
            </Button>
            <Button
              onClick={openCreateForm}
              icon={<Plus className="h-4 w-4" aria-hidden="true" />}
            >
              Log trip
            </Button>
          </>
        }
      />

      <section aria-label="Trip key performance indicators">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Total Trips Conducted"
            value={formatNumber(completedTrips.length)}
            icon={CheckCircle2}
            accent="emerald"
            description={`${formatNumber(trips.length)} total logged · ${formatNumber(cancelledTrips.length)} cancelled`}
          />
          <KpiCard
            label="Currently Ongoing Trips"
            value={formatNumber(inTransitTrips.length)}
            icon={Navigation}
            accent="cyan"
            description={
              inTransitTrips.length > 0
                ? `${inTransitTrips[0].destination} field deployment active`
                : 'No field personnel currently deployed'
            }
          />
          <KpiCard
            label="Scheduled Trips"
            value={formatNumber(scheduledTrips.length)}
            icon={CalendarClock}
            accent="brand"
            description={
              upcomingScheduled.length > 0
                ? `Next: ${formatDateTime(upcomingScheduled[0].departureDate)}`
                : 'No upcoming departures scheduled'
            }
          />
          <KpiCard
            label="Top Destination Municipality"
            value={topDestination ? topDestination.destination : '—'}
            icon={MapPin}
            accent="gold"
            description={
              topDestination
                ? `${formatNumber(topDestination.count)} ${topDestination.count === 1 ? 'trip' : 'trips'} recorded`
                : 'No destination data yet'
            }
          />
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search destination, title, passenger, or driver…"
                  className="field-input pl-10"
                  aria-label="Search trips"
                />
              </div>
              <select
                className="field-select min-w-0 sm:w-[170px]"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as 'all' | TripStatus)
                }
                aria-label="Filter trips by status"
              >
                <option value="all">All statuses</option>
                {TRIP_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              {hasActiveFilters ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  icon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
                  className="justify-start sm:justify-center"
                >
                  Reset filters
                </Button>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
                  <span className="mb-1 block">Departure from</span>
                  <input
                    type="date"
                    className="field-input w-[158px] py-2 text-xs"
                    value={fromDate}
                    onChange={(event) => setFromDate(event.target.value)}
                    aria-label="Filter trips departing from this date"
                  />
                </label>
                <label className="text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
                  <span className="mb-1 block">Departure to</span>
                  <input
                    type="date"
                    className="field-input w-[158px] py-2 text-xs"
                    value={toDate}
                    min={fromDate || undefined}
                    onChange={(event) => setToDate(event.target.value)}
                    aria-label="Filter trips departing up to this date"
                  />
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSort}
                  icon={<SortIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                >
                  {sortDirection === 'asc' ? 'Oldest first' : 'Latest first'}
                </Button>
              </div>
              <p className="text-[11px] text-slate-500">
                Showing{' '}
                <span className="font-bold text-slate-700">
                  {filteredTrips.length}
                </span>{' '}
                of {formatNumber(trips.length)} trips
              </p>
            </div>
          </div>
        </div>

        {filteredTrips.length === 0 ? (
          <EmptyState
            icon={hasActiveFilters ? Search : CarFront}
            title={
              hasActiveFilters
                ? 'No trips match these filters'
                : 'No trips recorded yet'
            }
            description={
              hasActiveFilters
                ? 'Try adjusting the search keyword, status, or departure date range.'
                : 'Log the first official DICT Abra field trip to start building the travel register.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="secondary" onClick={resetFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button
                  onClick={openCreateForm}
                  icon={<Plus className="h-4 w-4" aria-hidden="true" />}
                >
                  Log first trip
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="scrollbar-thin hidden overflow-x-auto md:block">
              <table className="data-table min-w-[1180px]">
                <thead>
                  <tr>
                    <th scope="col">Trip</th>
                    <th scope="col">Destination</th>
                    <th
                      scope="col"
                      aria-sort={
                        sortDirection === 'asc' ? 'ascending' : 'descending'
                      }
                    >
                      <button
                        type="button"
                        onClick={toggleSort}
                        className="inline-flex items-center gap-1.5 rounded font-bold text-ink-900 transition"
                      >
                        Departure
                        <SortIcon
                          className="h-3 w-3 text-brand-600"
                          aria-hidden="true"
                        />
                      </button>
                    </th>
                    <th scope="col">Return</th>
                    <th scope="col">Driver / Vehicle</th>
                    <th scope="col">Passengers</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="w-28 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrips.map((trip) => {
                    const passengers = tripPassengers(trip)
                    return (
                      <tr key={trip.id}>
                        <td className="max-w-[280px]">
                          <p className="line-clamp-2 text-[13px] leading-5 font-semibold text-ink-950">
                            {trip.tripTitle}
                          </p>
                          <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">
                            {trip.purpose}
                          </p>
                        </td>
                        <td>
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                            <MapPin
                              className="h-3.5 w-3.5 text-slate-400"
                              aria-hidden="true"
                            />
                            {trip.destination}
                          </span>
                        </td>
                        <td className="whitespace-nowrap">
                          <p className="text-xs font-medium text-slate-700">
                            {formatDateTime(trip.departureDate)}
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-400">
                            Departure
                          </p>
                        </td>
                        <td className="whitespace-nowrap">
                          <p className="text-xs text-slate-600">
                            {formatDateTime(trip.returnDate)}
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-400">
                            Estimated / actual
                          </p>
                        </td>
                        <td>
                          <p className="flex items-center gap-1 text-xs text-slate-600">
                            <UserRound
                              className="h-3 w-3 shrink-0 text-slate-400"
                              aria-hidden="true"
                            />
                            <span className="truncate">{trip.driverName}</span>
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-[10.5px] text-slate-400">
                            <Truck
                              className="h-3 w-3 shrink-0"
                              aria-hidden="true"
                            />
                            <span className="truncate">
                              {trip.vehicleDetails}
                            </span>
                          </p>
                        </td>
                        <td className="max-w-[200px]">
                          <p className="text-xs font-semibold text-slate-700">
                            {passengers.length}{' '}
                            {passengers.length === 1 ? 'person' : 'people'}
                          </p>
                          <p className="mt-1 line-clamp-1 text-[10.5px] text-slate-400">
                            {passengers.length > 0
                              ? passengers.join(', ')
                              : 'No manifest recorded'}
                          </p>
                        </td>
                        <td>
                          <TripStatusBadge status={trip.status} />
                        </td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => setViewingTrip(trip)}
                              aria-label={`View details for ${trip.tripTitle}`}
                              title="View trip details"
                            >
                              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => handleExportTicket(trip)}
                              aria-label={`Export trip ticket for ${trip.tripTitle}`}
                              title="Export trip ticket PDF"
                            >
                              <FileText
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => openEditForm(trip)}
                              aria-label={`Edit ${trip.tripTitle}`}
                              title="Edit trip"
                            >
                              <Pencil
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            </button>
                            <button
                              type="button"
                              className="icon-btn hover:bg-rose-50 hover:text-rose-600"
                              onClick={() => setDeleteTarget(trip)}
                              aria-label={`Delete ${trip.tripTitle}`}
                              title="Delete trip"
                            >
                              <Trash2
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 md:hidden">
              {filteredTrips.map((trip) => {
                const passengers = tripPassengers(trip)
                return (
                  <article
                    key={trip.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm leading-5 font-bold text-ink-950">
                          {trip.tripTitle}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                          <MapPin className="h-3 w-3" aria-hidden="true" />
                          {trip.destination}
                        </p>
                      </div>
                      <TripStatusBadge status={trip.status} />
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2.5 text-[11px]">
                      <div>
                        <dt className="text-slate-400">Departure</dt>
                        <dd className="mt-0.5 font-semibold text-slate-700">
                          {formatDateTime(trip.departureDate)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-400">Return</dt>
                        <dd className="mt-0.5 font-semibold text-slate-700">
                          {formatDateTime(trip.returnDate)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-400">Driver</dt>
                        <dd className="mt-0.5 font-medium text-slate-700">
                          {trip.driverName}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-400">Passengers</dt>
                        <dd className="mt-0.5 font-medium text-slate-700">
                          {passengers.length}{' '}
                          {passengers.length === 1 ? 'person' : 'people'}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-slate-400">Vehicle / unit</dt>
                        <dd className="mt-0.5 font-medium text-slate-700">
                          {trip.vehicleDetails}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setViewingTrip(trip)}
                        icon={<Eye className="h-3.5 w-3.5" aria-hidden="true" />}
                      >
                        View
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleExportTicket(trip)}
                        icon={
                          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                        }
                      >
                        Ticket
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openEditForm(trip)}
                        icon={
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        }
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(trip)}
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        icon={
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        }
                      >
                        Delete
                      </Button>
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </section>

      {formOpen ? (
        <TripFormModal trip={editingTrip} onClose={closeForm} />
      ) : null}

      {viewingTrip ? (
        <TripDetailsModal
          trip={viewingTrip}
          onClose={() => setViewingTrip(null)}
          onEdit={openEditForm}
          onExport={handleExportTicket}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this trip record?"
        description={
          deleteTarget
            ? `“${deleteTarget.tripTitle}” and its passenger manifest will be removed from this device. This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete trip"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  )
}
