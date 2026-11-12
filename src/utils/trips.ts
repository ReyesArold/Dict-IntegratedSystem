import type { Trip } from '../types'

export function tripTimestamp(value: string): number {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

export function sortTripsByDeparture(
  trips: Trip[],
  direction: 'asc' | 'desc',
): Trip[] {
  return [...trips].sort((first, second) => {
    const difference =
      tripTimestamp(first.departureDate) - tripTimestamp(second.departureDate)
    if (difference !== 0) return direction === 'asc' ? difference : -difference
    return first.tripTitle.localeCompare(second.tripTitle)
  })
}

export function tripPassengers(trip: Trip): string[] {
  return Array.isArray(trip.passengers)
    ? trip.passengers.map((passenger) => passenger.trim()).filter(Boolean)
    : []
}

export function parsePassengersInput(value: string): string[] {
  const seen = new Set<string>()
  return value
    .split(/[\n,;]+/)
    .map((passenger) => passenger.trim())
    .filter((passenger) => {
      if (!passenger) return false
      const key = passenger.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export function passengersToInput(passengers: string[]): string {
  return passengers
    .map((passenger) => passenger.trim())
    .filter(Boolean)
    .join('\n')
}

export function toDateTimeLocalValue(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromDateTimeLocalValue(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

export function tripLocalDateKey(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

export function getTopDestination(
  trips: Trip[],
): { destination: string; count: number } | null {
  if (trips.length === 0) return null

  const counts = new Map<string, number>()
  trips.forEach((trip) => {
    const destination = trip.destination.trim()
    if (!destination) return
    counts.set(destination, (counts.get(destination) ?? 0) + 1)
  })

  let topDestination = ''
  let topCount = 0
  counts.forEach((count, destination) => {
    if (
      count > topCount ||
      (count === topCount && destination.localeCompare(topDestination) < 0)
    ) {
      topDestination = destination
      topCount = count
    }
  })

  return topDestination ? { destination: topDestination, count: topCount } : null
}

export function tripTicketNumber(trip: Trip): string {
  const departure = new Date(trip.departureDate)
  const year = Number.isNaN(departure.getTime())
    ? new Date().getFullYear()
    : departure.getFullYear()
  const sequence =
    trip.id !== undefined ? String(trip.id).padStart(4, '0') : 'DRAFT'
  return `DICT-ABRA-TO-${year}-${sequence}`
}

export function tripFileSlug(value: string): string {
  return (
    value
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 48) || 'Trip'
  )
}
