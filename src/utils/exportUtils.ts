import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import type { Trip } from '../types'
import {
  fileTimestamp,
  formatDate,
  formatDateTime,
  formatNumber,
  formatTime,
} from './formatters'
import {
  getTopDestination,
  sortTripsByDeparture,
  tripFileSlug,
  tripPassengers,
  tripTicketNumber,
} from './trips'

const MARGIN = 14
const NAVY: [number, number, number] = [15, 48, 75]
const DEEP_NAVY: [number, number, number] = [8, 31, 51]
const GOLD: [number, number, number] = [249, 203, 71]
const CYAN: [number, number, number] = [145, 220, 255]
const SLATE_600: [number, number, number] = [71, 85, 105]
const SLATE_500: [number, number, number] = [100, 116, 139]
const SLATE_400: [number, number, number] = [148, 163, 184]
const SLATE_200: [number, number, number] = [226, 232, 240]
const SLATE_50: [number, number, number] = [248, 250, 252]
const WHITE: [number, number, number] = [255, 255, 255]

const AGENCY = 'DEPARTMENT OF INFORMATION AND COMMUNICATIONS TECHNOLOGY'
const OFFICE = 'ABRA PROVINCIAL OFFICE'
const REGION = 'Cordillera Administrative Region  |  Bangued, Abra'
const APP_NAME = 'DICT Abra Integrated PMIS, Training & Trip Tracker System'

type PageOrientation = 'portrait' | 'landscape'

interface Metric {
  label: string
  value: string
}

function createDocument(orientation: PageOrientation): jsPDF {
  return new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
    compress: true,
  })
}

function drawEmblem(doc: jsPDF, x: number, y: number): void {
  doc.setFillColor(...NAVY)
  doc.roundedRect(x, y, 19, 19, 3.2, 3.2, 'F')

  doc.setDrawColor(...CYAN)
  doc.setLineWidth(0.65)
  doc.line(x + 5.4, y + 14.4, x + 9.5, y + 5.5)
  doc.line(x + 9.5, y + 5.5, x + 13.6, y + 14.4)

  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.75)
  doc.line(x + 6.9, y + 11.2, x + 12.1, y + 11.2)

  doc.setFillColor(...WHITE)
  doc.circle(x + 9.5, y + 5.5, 1.35, 'F')
  doc.circle(x + 5.4, y + 14.4, 1.2, 'F')
  doc.circle(x + 13.6, y + 14.4, 1.2, 'F')
  doc.setFillColor(...GOLD)
  doc.circle(x + 9.5, y + 11.2, 1.1, 'F')
}

function addReportHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  generatedAt: Date,
): number {
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFillColor(...NAVY)
  doc.rect(0, 0, pageWidth, 3.2, 'F')
  doc.setFillColor(...GOLD)
  doc.rect(0, 3.2, pageWidth, 1.1, 'F')

  drawEmblem(doc, MARGIN, 11.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.2)
  doc.setTextColor(...SLATE_500)
  doc.text('REPUBLIC OF THE PHILIPPINES', MARGIN + 24, 16.1)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(pageWidth < 220 ? 8.7 : 10.8)
  doc.setTextColor(...DEEP_NAVY)
  doc.text(AGENCY, MARGIN + 24, 21.4)

  doc.setFontSize(pageWidth < 220 ? 7.6 : 8.1)
  doc.setTextColor(...NAVY)
  doc.text(OFFICE, MARGIN + 24, 26.7)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.9)
  doc.setTextColor(...SLATE_600)
  doc.text(REGION, MARGIN + 24, 31.4)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.8)
  doc.setTextColor(...SLATE_500)
  doc.text('DATE GENERATED', pageWidth - MARGIN, 14.5, { align: 'right' })
  doc.setFontSize(7.5)
  doc.setTextColor(...DEEP_NAVY)
  doc.text(formatDateTime(generatedAt.toISOString()), pageWidth - MARGIN, 19.1, {
    align: 'right',
  })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(5.8)
  doc.setTextColor(...SLATE_500)
  doc.text('OFFLINE-GENERATED OFFICIAL DOCUMENT', pageWidth - MARGIN, 23.4, {
    align: 'right',
  })

  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.35)
  doc.line(MARGIN, 36, pageWidth - MARGIN, 36)
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.9)
  doc.line(MARGIN, 37.2, MARGIN + 28, 37.2)

  doc.setFillColor(...GOLD)
  doc.rect(MARGIN, 43, 1.25, 7, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(pageWidth < 220 ? 12.5 : 14.5)
  doc.setTextColor(...DEEP_NAVY)
  doc.text(title.toUpperCase(), MARGIN + 4.5, 48.8)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.4)
  doc.setTextColor(...SLATE_600)
  doc.text(subtitle, MARGIN + 4.5, 54.4)

  return 60.5
}

function drawMetrics(doc: jsPDF, startY: number, metrics: Metric[]): number {
  if (metrics.length === 0) return startY

  const pageWidth = doc.internal.pageSize.getWidth()
  const availableWidth = pageWidth - MARGIN * 2
  const gap = 3
  const cardWidth = (availableWidth - gap * (metrics.length - 1)) / metrics.length
  const cardHeight = 14.5

  metrics.forEach((metric, index) => {
    const x = MARGIN + index * (cardWidth + gap)
    doc.setFillColor(...SLATE_50)
    doc.setDrawColor(...SLATE_200)
    doc.setLineWidth(0.2)
    doc.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.5)
    doc.setTextColor(...SLATE_500)
    doc.text(metric.label.toUpperCase(), x + 3, startY + 5)

    doc.setFontSize(8.1)
    doc.setTextColor(...DEEP_NAVY)
    doc.text(metric.value, x + 3, startY + 10.8, {
      maxWidth: cardWidth - 6,
    })
  })

  return startY + cardHeight
}

function drawSectionTitle(doc: jsPDF, label: string, y: number): void {
  doc.setFillColor(...GOLD)
  doc.rect(MARGIN, y - 3.1, 1.1, 4.2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.4)
  doc.setTextColor(...DEEP_NAVY)
  doc.text(label.toUpperCase(), MARGIN + 3.4, y)
}

function getAutoTableFinalY(doc: jsPDF, fallback: number): number {
  const documentWithTable = doc as jsPDF & {
    lastAutoTable?: { finalY?: number }
  }
  return documentWithTable.lastAutoTable?.finalY ?? fallback
}

function ensurePageSpace(
  doc: jsPDF,
  currentY: number,
  requiredHeight: number,
): number {
  const pageHeight = doc.internal.pageSize.getHeight()
  if (currentY + requiredHeight <= pageHeight - 18) return currentY

  doc.addPage()
  return 25
}

function addFooters(doc: jsPDF, title: string, generatedAt: Date): void {
  const pageCount = doc.getNumberOfPages()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)

    if (page > 1) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.2)
      doc.setTextColor(...NAVY)
      doc.text(`DICT ABRA  |  ${title.toUpperCase()}`, MARGIN, 9.5)
      doc.setDrawColor(...SLATE_200)
      doc.setLineWidth(0.2)
      doc.line(MARGIN, 11.5, pageWidth - MARGIN, 11.5)
    }

    doc.setDrawColor(...SLATE_200)
    doc.setLineWidth(0.2)
    doc.line(MARGIN, pageHeight - 12, pageWidth - MARGIN, pageHeight - 12)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5.9)
    doc.setTextColor(...SLATE_500)
    doc.text(APP_NAME, MARGIN, pageHeight - 7.5, {
      maxWidth: pageWidth - 60,
    })
    doc.text(
      `Generated ${formatDateTime(generatedAt.toISOString())}`,
      pageWidth / 2,
      pageHeight - 7.5,
      { align: 'center' },
    )
    doc.setFont('helvetica', 'bold')
    doc.text(`PAGE ${page} OF ${pageCount}`, pageWidth - MARGIN, pageHeight - 7.5, {
      align: 'right',
    })
  }
}

function drawSignatureBlock(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  title: string,
  subtitle: string,
): void {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...DEEP_NAVY)
  doc.text(title, x + width / 2, y, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.2)
  doc.setTextColor(...SLATE_500)
  doc.text(subtitle, x + width / 2, y + 4, { align: 'center' })

  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.3)
  doc.line(x + 4, y + 17, x + width - 4, y + 17)

  doc.setFontSize(5.8)
  doc.setTextColor(...SLATE_500)
  doc.text('Signature over Printed Name', x + width / 2, y + 20.5, {
    align: 'center',
  })
}

function buildTripBody(trip: Trip): Array<[string, string]> {
  return [
    ['Trip Title', trip.tripTitle],
    ['Destination', trip.destination],
    ['Status', trip.status],
    ['Departure Date & Time', formatDateTime(trip.departureDate)],
    ['Return Date & Time', formatDateTime(trip.returnDate)],
    ['Assigned Driver', trip.driverName],
    ['Vehicle / Unit', trip.vehicleDetails],
    ['Purpose of Travel', trip.purpose || '—'],
  ]
}

export function exportTripTicketPdf(trip: Trip): void {
  const generatedAt = new Date()
  const doc = createDocument('portrait')
  const contentStart = addReportHeader(
    doc,
    'Official Travel Order / Trip Ticket',
    'Authority to Travel and Official Vehicle Trip Record',
    generatedAt,
  )
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidth = pageWidth - MARGIN * 2

  doc.setFillColor(...SLATE_50)
  doc.setDrawColor(...SLATE_200)
  doc.setLineWidth(0.2)
  doc.roundedRect(MARGIN, contentStart, contentWidth, 13, 2.2, 2.2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.8)
  doc.setTextColor(...SLATE_500)
  doc.text('TRIP TICKET NO.', MARGIN + 3.5, contentStart + 4.8)
  doc.text('TRIP STATUS', pageWidth - MARGIN - 3.5, contentStart + 4.8, {
    align: 'right',
  })

  doc.setFontSize(8.3)
  doc.setTextColor(...DEEP_NAVY)
  doc.text(tripTicketNumber(trip), MARGIN + 3.5, contentStart + 9.8)
  doc.text(trip.status.toUpperCase(), pageWidth - MARGIN - 3.5, contentStart + 9.8, {
    align: 'right',
  })

  drawSectionTitle(doc, 'Travel details', contentStart + 22)

  autoTable(doc, {
    startY: contentStart + 26,
    body: buildTripBody(trip),
    theme: 'grid',
    margin: { top: 20, right: MARGIN, bottom: 18, left: MARGIN },
    styles: {
      font: 'helvetica',
      fontSize: 8.1,
      cellPadding: { top: 2.6, right: 2.5, bottom: 2.6, left: 2.5 },
      textColor: [51, 65, 85],
      lineColor: SLATE_200,
      lineWidth: 0.12,
      valign: 'top',
      overflow: 'linebreak',
    },
    columnStyles: {
      0: {
        cellWidth: 43,
        fontStyle: 'bold',
        fillColor: SLATE_50,
        textColor: DEEP_NAVY,
      },
      1: { cellWidth: contentWidth - 43 },
    },
  })

  let cursorY = getAutoTableFinalY(doc, contentStart + 80)

  cursorY = ensurePageSpace(doc, cursorY + 11, 30)
  drawSectionTitle(doc, 'Passenger manifest', cursorY + 11)
  const passengers = tripPassengers(trip)
  const passengerBody: Array<Array<string | number>> =
    passengers.length > 0
      ? passengers.map((passenger, index) => [index + 1, passenger])
      : [['—', 'No passengers recorded for this trip.']]

  autoTable(doc, {
    startY: cursorY + 15,
    head: [['#', 'Passenger Name']],
    body: passengerBody,
    theme: 'grid',
    margin: { top: 20, right: MARGIN, bottom: 18, left: MARGIN },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: { top: 2.4, right: 2.5, bottom: 2.4, left: 2.5 },
      textColor: [51, 65, 85],
      lineColor: SLATE_200,
      lineWidth: 0.12,
    },
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 7.2,
      lineWidth: 0,
    },
    alternateRowStyles: { fillColor: SLATE_50 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { cellWidth: contentWidth - 12 },
    },
  })

  cursorY = getAutoTableFinalY(doc, cursorY + 35)

  cursorY = ensurePageSpace(doc, cursorY + 11, 30)
  drawSectionTitle(doc, 'Remarks / Travel notes', cursorY + 11)
  autoTable(doc, {
    startY: cursorY + 15,
    body: [[trip.remarks || 'No additional remarks recorded.']],
    theme: 'grid',
    margin: { top: 20, right: MARGIN, bottom: 18, left: MARGIN },
    styles: {
      font: 'helvetica',
      fontSize: 7.9,
      cellPadding: { top: 2.8, right: 2.8, bottom: 2.8, left: 2.8 },
      textColor: [51, 65, 85],
      lineColor: SLATE_200,
      lineWidth: 0.12,
      overflow: 'linebreak',
    },
    columnStyles: { 0: { cellWidth: contentWidth } },
  })

  cursorY = getAutoTableFinalY(doc, cursorY + 35)

  let signatureY = cursorY + 16
  if (signatureY > pageHeight - 56) {
    doc.addPage()
    signatureY = 28
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.2)
  doc.setTextColor(...DEEP_NAVY)
  doc.text('CERTIFICATION AND APPROVAL', MARGIN, signatureY - 5)

  const gap = 4
  const signatureWidth = (contentWidth - gap * 2) / 3
  drawSignatureBlock(
    doc,
    MARGIN,
    signatureY,
    signatureWidth,
    'Prepared by',
    'Requesting Personnel',
  )
  drawSignatureBlock(
    doc,
    MARGIN + signatureWidth + gap,
    signatureY,
    signatureWidth,
    'Approved by',
    'Provincial Officer',
  )
  drawSignatureBlock(
    doc,
    MARGIN + (signatureWidth + gap) * 2,
    signatureY,
    signatureWidth,
    'Driver Acknowledgment',
    trip.driverName || 'Assigned Driver',
  )

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(5.7)
  doc.setTextColor(...SLATE_400)
  doc.text(
    'This travel order was generated offline from the DICT Abra Trip Tracker. Valid without alteration.',
    pageWidth / 2,
    Math.min(signatureY + 29, pageHeight - 17),
    { align: 'center' },
  )

  addFooters(doc, 'Official Travel Order / Trip Ticket', generatedAt)
  doc.save(
    `DICT-Abra-Trip-Ticket-${tripFileSlug(trip.tripTitle)}-${fileTimestamp(generatedAt)}.pdf`,
  )
}

export function exportTripsMasterlistPdf(
  trips: Trip[],
  filterSummary = 'All trips recorded in the DICT Abra Trip Tracker',
): void {
  if (trips.length === 0) {
    throw new Error('No trip records are available for this report.')
  }

  const generatedAt = new Date()
  const doc = createDocument('landscape')
  const contentStart = addReportHeader(
    doc,
    'Trip Tracker Masterlist',
    `Official summary of field travel  |  ${filterSummary}`,
    generatedAt,
  )

  const completed = trips.filter((trip) => trip.status === 'Completed').length
  const inTransit = trips.filter((trip) => trip.status === 'In Transit').length
  const scheduled = trips.filter((trip) => trip.status === 'Scheduled').length
  const cancelled = trips.filter((trip) => trip.status === 'Cancelled').length
  const topDestination = getTopDestination(trips)

  drawMetrics(doc, contentStart, [
    { label: 'Total Trips', value: formatNumber(trips.length) },
    { label: 'Completed', value: formatNumber(completed) },
    { label: 'In Transit', value: formatNumber(inTransit) },
    { label: 'Scheduled', value: formatNumber(scheduled) },
    {
      label: 'Top Destination',
      value: topDestination
        ? `${topDestination.destination} (${topDestination.count})`
        : '—',
    },
  ])

  const sortedTrips = sortTripsByDeparture(trips, 'desc')
  const body = sortedTrips.map((trip, index) => {
    const passengers = tripPassengers(trip)
    return [
      index + 1,
      trip.tripTitle,
      trip.destination,
      formatDateTime(trip.departureDate),
      formatDateTime(trip.returnDate),
      trip.driverName,
      passengers.length > 0 ? passengers.join(', ') : '—',
      trip.vehicleDetails,
      trip.status,
    ]
  })

  autoTable(doc, {
    startY: contentStart + 20.5,
    head: [
      [
        '#',
        'Trip Title',
        'Destination',
        'Departure',
        'Return',
        'Driver',
        'Passengers',
        'Vehicle / Unit',
        'Status',
      ],
    ],
    body,
    theme: 'grid',
    margin: { top: 20, right: MARGIN, bottom: 18, left: MARGIN },
    styles: {
      font: 'helvetica',
      fontSize: 6.3,
      cellPadding: { top: 2.1, right: 1.5, bottom: 2.1, left: 1.5 },
      textColor: [51, 65, 85],
      lineColor: SLATE_200,
      lineWidth: 0.12,
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 5.9,
      halign: 'left',
      valign: 'middle',
      lineWidth: 0,
      cellPadding: { top: 2.6, right: 1.5, bottom: 2.6, left: 1.5 },
    },
    alternateRowStyles: { fillColor: SLATE_50 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 7 },
      1: { cellWidth: 47 },
      2: { cellWidth: 23 },
      3: { cellWidth: 30 },
      4: { cellWidth: 30 },
      5: { cellWidth: 33 },
      6: { cellWidth: 47 },
      7: { cellWidth: 30 },
      8: { cellWidth: 16 },
    },
  })

  const tableEnd = getAutoTableFinalY(doc, contentStart + 30)
  const pageHeight = doc.internal.pageSize.getHeight()
  if (tableEnd < pageHeight - 25) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(6.1)
    doc.setTextColor(...SLATE_400)
    doc.text(
      `Cancelled: ${cancelled}   |   Records shown: ${trips.length}   |   Report generated entirely offline by the DICT Abra Trip Tracker.`,
      MARGIN,
      tableEnd + 6,
    )
  }

  addFooters(doc, 'Trip Tracker Masterlist', generatedAt)
  doc.save(`DICT-Abra-Trip-Masterlist-${fileTimestamp(generatedAt)}.pdf`)
}

interface SheetOptions {
  sheetName: string
  title: string
  summary: string
  headers: string[]
  rows: Array<Array<string | number>>
  columnWidths: number[]
}

function appendTripSheet(
  workbook: XLSX.WorkBook,
  options: SheetOptions,
): void {
  const generatedAt = new Date()
  const headerRow = 7
  const lastColumn = options.headers.length - 1

  const data: Array<Array<string | number>> = [
    ['REPUBLIC OF THE PHILIPPINES'],
    [AGENCY],
    [`${OFFICE}  |  ${REGION}`],
    [options.title.toUpperCase()],
    [`Date Generated: ${formatDateTime(generatedAt.toISOString())}`],
    [options.summary],
    [],
    options.headers,
    ...options.rows,
  ]

  const worksheet = XLSX.utils.aoa_to_sheet(data)

  worksheet['!merges'] = [0, 1, 2, 3, 4, 5].map((row) => ({
    s: { r: row, c: 0 },
    e: { r: row, c: lastColumn },
  }))
  worksheet['!cols'] = options.columnWidths.map((width) => ({ wch: width }))
  worksheet['!rows'] = [
    { hpt: 14 },
    { hpt: 22 },
    { hpt: 16 },
    { hpt: 24 },
    { hpt: 16 },
    { hpt: 26 },
    { hpt: 8 },
  ]
  worksheet['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: headerRow, c: 0 },
      e: { r: headerRow + options.rows.length, c: lastColumn },
    }),
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName)
}

export function exportTripsExcel(
  trips: Trip[],
  filterSummary = 'All trips recorded',
): void {
  if (trips.length === 0) {
    throw new Error('No trip records are available for export.')
  }

  const sortedTrips = sortTripsByDeparture(trips, 'desc')
  const completed = trips.filter((trip) => trip.status === 'Completed').length
  const inTransit = trips.filter((trip) => trip.status === 'In Transit').length
  const scheduled = trips.filter((trip) => trip.status === 'Scheduled').length
  const cancelled = trips.filter((trip) => trip.status === 'Cancelled').length
  const totalPassengers = trips.reduce(
    (sum, trip) => sum + tripPassengers(trip).length,
    0,
  )

  const workbook = XLSX.utils.book_new()
  workbook.Props = {
    Title: 'DICT Abra Trip Tracker Register',
    Subject: 'Official field travel and vehicle trip record',
    Author: 'DICT Abra',
    Company: 'Department of Information and Communications Technology',
    Comments: `Generated by ${APP_NAME}`,
    CreatedDate: new Date(),
  }

  appendTripSheet(workbook, {
    sheetName: 'Trip Register',
    title: 'Trip Tracker Masterlist',
    summary: `${filterSummary}   |   Total Trips: ${trips.length}   |   Completed: ${completed}   |   In Transit: ${inTransit}   |   Scheduled: ${scheduled}   |   Cancelled: ${cancelled}   |   Passenger Records: ${totalPassengers}`,
    headers: [
      '#',
      'Trip Title',
      'Destination',
      'Departure Date',
      'Departure Time',
      'Return Date',
      'Return Time',
      'Assigned Driver',
      'Passengers',
      'Vehicle / Unit',
      'Purpose of Travel',
      'Status',
      'Remarks / Travel Notes',
      'Last Updated',
    ],
    rows: sortedTrips.map((trip, index) => [
      index + 1,
      trip.tripTitle,
      trip.destination,
      formatDate(trip.departureDate),
      formatTime(trip.departureDate),
      formatDate(trip.returnDate),
      formatTime(trip.returnDate),
      trip.driverName,
      tripPassengers(trip).join('; '),
      trip.vehicleDetails,
      trip.purpose,
      trip.status,
      trip.remarks,
      formatDateTime(trip.updatedAt),
    ]),
    columnWidths: [5, 42, 18, 15, 13, 15, 13, 30, 46, 36, 58, 13, 52, 19],
  })

  const passengerRows: Array<Array<string | number>> = []
  sortedTrips.forEach((trip) => {
    tripPassengers(trip).forEach((passenger) => {
      passengerRows.push([
        passengerRows.length + 1,
        trip.tripTitle,
        trip.destination,
        formatDateTime(trip.departureDate),
        trip.driverName,
        passenger,
        trip.status,
      ])
    })
  })

  if (passengerRows.length > 0) {
    appendTripSheet(workbook, {
      sheetName: 'Passenger Manifest',
      title: 'Passenger Manifest',
      summary: `${filterSummary}   |   Total Passenger Records: ${passengerRows.length}   |   Trips: ${trips.length}`,
      headers: [
        '#',
        'Trip Title',
        'Destination',
        'Departure',
        'Assigned Driver',
        'Passenger Name',
        'Status',
      ],
      rows: passengerRows,
      columnWidths: [5, 45, 18, 24, 34, 32, 13],
    })
  }

  XLSX.writeFile(
    workbook,
    `DICT-Abra-Trip-Register-${fileTimestamp()}.xlsx`,
    {
      compression: true,
      bookSST: true,
    },
  )
}
