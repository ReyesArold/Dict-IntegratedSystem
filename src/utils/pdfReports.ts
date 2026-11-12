import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Participant, Project, Training } from '../types'
import {
  fileTimestamp,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPesoCompact,
} from './formatters'

const MARGIN = 14
const NAVY: [number, number, number] = [15, 48, 75]
const DEEP_NAVY: [number, number, number] = [8, 31, 51]
const GOLD: [number, number, number] = [249, 203, 71]
const CYAN: [number, number, number] = [145, 220, 255]
const SLATE_600: [number, number, number] = [71, 85, 105]
const SLATE_500: [number, number, number] = [100, 116, 139]
const SLATE_200: [number, number, number] = [226, 232, 240]
const WHITE: [number, number, number] = [255, 255, 255]

const AGENCY = 'DEPARTMENT OF INFORMATION AND COMMUNICATIONS TECHNOLOGY'
const OFFICE = 'ABRA PROVINCIAL OFFICE'
const REGION = 'Cordillera Administrative Region  |  Bangued, Abra'
const APP_NAME =
  'DICT Abra Integrated Project Monitoring & Training Management System'

type PageOrientation = 'portrait' | 'landscape'

interface Metric {
  label: string
  value: string
}

interface HeaderResult {
  contentStart: number
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
): HeaderResult {
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
  doc.setFontSize(pageWidth < 220 ? 9.5 : 10.8)
  doc.setTextColor(...DEEP_NAVY)
  doc.text(AGENCY, MARGIN + 24, 21.4)

  doc.setFontSize(8.1)
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
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.6)
  doc.setTextColor(...DEEP_NAVY)
  doc.text(formatDateTime(generatedAt.toISOString()), pageWidth - MARGIN, 19.1, {
    align: 'right',
  })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(5.8)
  doc.setTextColor(...SLATE_500)
  doc.text('OFFLINE-GENERATED OFFICIAL REPORT', pageWidth - MARGIN, 23.4, {
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

  return { contentStart: 60.5 }
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
    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(...SLATE_200)
    doc.setLineWidth(0.2)
    doc.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.7)
    doc.setTextColor(...SLATE_500)
    doc.text(metric.label.toUpperCase(), x + 3, startY + 5)

    doc.setFontSize(8.5)
    doc.setTextColor(...DEEP_NAVY)
    doc.text(metric.value, x + 3, startY + 10.8, {
      maxWidth: cardWidth - 6,
    })
  })

  return startY + cardHeight
}

function drawTable(
  doc: jsPDF,
  options: {
    startY: number
    head: string[]
    body: Array<Array<string | number>>
    columnStyles?: Record<number, { halign?: 'left' | 'center' | 'right'; cellWidth?: number }>
    fontSize?: number
    headFontSize?: number
  },
): void {
  autoTable(doc, {
    startY: options.startY + 6,
    head: [options.head],
    body: options.body,
    theme: 'grid',
    margin: {
      top: 20,
      right: MARGIN,
      bottom: 18,
      left: MARGIN,
    },
    styles: {
      font: 'helvetica',
      fontSize: options.fontSize ?? 7,
      cellPadding: { top: 2, right: 1.5, bottom: 2, left: 1.5 },
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
      fontSize: options.headFontSize ?? 6.4,
      halign: 'left',
      valign: 'middle',
      lineWidth: 0,
      cellPadding: { top: 2.6, right: 1.5, bottom: 2.6, left: 1.5 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: options.columnStyles,
  })
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

function countAttendance(participants: Participant[]) {
  return {
    male: participants.filter((participant) => participant.gender === 'Male')
      .length,
    female: participants.filter(
      (participant) => participant.gender === 'Female',
    ).length,
    completed: participants.filter(
      (participant) => participant.attendanceStatus === 'Completed / Certified',
    ).length,
  }
}

function sortProjects(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => {
    const first = a.targetCompletionDate || '9999-12-31'
    const second = b.targetCompletionDate || '9999-12-31'
    return first.localeCompare(second)
  })
}

function sanitize(value: string | number | undefined | null): string {
  return value === undefined || value === null ? '' : String(value)
}

export function exportProjectsPdf(projects: Project[]): void {
  const generatedAt = new Date()
  const doc = createDocument('landscape')
  const header = addReportHeader(
    doc,
    'Project Monitoring Register',
    'Infrastructure, connectivity, and ICT development projects across Abra',
    generatedAt,
  )

  const totalBudget = projects.reduce((sum, project) => sum + project.budget, 0)
  const active = projects.filter(
    (project) => project.status === 'In Progress',
  ).length
  const completed = projects.filter(
    (project) => project.status === 'Completed',
  ).length

  drawMetrics(doc, header.contentStart, [
    { label: 'Total Projects', value: formatNumber(projects.length) },
    { label: 'Active Projects', value: formatNumber(active) },
    { label: 'Completed', value: formatNumber(completed) },
    { label: 'Total Allocation', value: formatPesoCompact(totalBudget) },
  ])

  const body = sortProjects(projects).map((project, index) => [
    index + 1,
    project.name,
    project.municipality,
    project.category,
    project.status,
    `${project.progress}%`,
    `PHP ${formatNumber(project.budget)}`,
    formatDate(project.targetCompletionDate),
    project.leader,
    project.remarks || '—',
  ])

  drawTable(doc, {
    startY: header.contentStart + 14.5,
    head: [
      '#',
      'Project Name',
      'Municipality',
      'Category',
      'Status',
      'Progress',
      'Budget (PHP)',
      'Completion',
      'Focal Person',
      'Remarks / Issues',
    ],
    body,
    fontSize: 6.25,
    headFontSize: 5.8,
    columnStyles: {
      0: { halign: 'center', cellWidth: 7 },
      1: { cellWidth: 51 },
      2: { cellWidth: 18 },
      3: { cellWidth: 30 },
      4: { cellWidth: 17 },
      5: { halign: 'center', cellWidth: 13 },
      6: { halign: 'right', cellWidth: 22 },
      7: { cellWidth: 18 },
      8: { cellWidth: 29 },
      9: { cellWidth: 43 },
    },
  })

  addFooters(doc, 'Project Monitoring Register', generatedAt)
  doc.save(`DICT-Abra-Project-Register-${fileTimestamp(generatedAt)}.pdf`)
}

export function exportTrainingMasterlistPdf(
  trainings: Training[],
  participants: Participant[],
): void {
  const generatedAt = new Date()
  const doc = createDocument('landscape')
  const header = addReportHeader(
    doc,
    'Training Masterlist',
    'Digital literacy, upskilling, and capacity-building interventions',
    generatedAt,
  )

  const counts = countAttendance(participants)
  const completedSessions = trainings.filter(
    (training) => training.status === 'Completed',
  ).length

  drawMetrics(doc, header.contentStart, [
    { label: 'Total Sessions', value: formatNumber(trainings.length) },
    { label: 'Completed', value: formatNumber(completedSessions) },
    { label: 'Registered Trainees', value: formatNumber(participants.length) },
    {
      label: 'GAD Split (M / F)',
      value: `${formatNumber(counts.male)} / ${formatNumber(counts.female)}`,
    },
  ])

  const sortedTrainings = [...trainings].sort((a, b) =>
    b.date.localeCompare(a.date),
  )

  const body = sortedTrainings.map((training, index) => {
    const roster = participants.filter(
      (participant) => participant.trainingId === training.id,
    )
    const certified = roster.filter(
      (participant) => participant.attendanceStatus === 'Completed / Certified',
    ).length

    return [
      index + 1,
      training.title,
      formatDate(training.date),
      training.durationHours,
      training.venue,
      training.trainer,
      training.status,
      roster.length,
      `${certified} certified`,
    ]
  })

  drawTable(doc, {
    startY: header.contentStart + 14.5,
    head: [
      '#',
      'Course / Program Title',
      'Schedule',
      'Hours',
      'Venue / LGU',
      'Trainer / Speaker',
      'Status',
      'Trainees',
      'Completion',
    ],
    body,
    fontSize: 6.8,
    headFontSize: 6,
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 67 },
      2: { cellWidth: 21 },
      3: { halign: 'center', cellWidth: 12 },
      4: { cellWidth: 44 },
      5: { cellWidth: 38 },
      6: { cellWidth: 19 },
      7: { halign: 'center', cellWidth: 16 },
      8: { halign: 'center', cellWidth: 23 },
    },
  })

  addFooters(doc, 'Training Masterlist', generatedAt)
  doc.save(`DICT-Abra-Training-Masterlist-${fileTimestamp(generatedAt)}.pdf`)
}

export function exportAttendancePdf(
  trainings: Training[],
  participants: Participant[],
  scope: Training | null,
): void {
  const generatedAt = new Date()
  const doc = createDocument('landscape')
  const reportTitle = scope
    ? 'Trainee Attendance & Certification Report'
    : 'Consolidated Trainee Attendance Report'
  const subtitle = scope
    ? scope.title
    : 'All training sessions recorded in the DICT Abra local registry'

  const header = addReportHeader(
    doc,
    reportTitle,
    subtitle,
    generatedAt,
  )

  const counts = countAttendance(participants)
  drawMetrics(doc, header.contentStart, [
    { label: 'Total Trainees', value: formatNumber(participants.length) },
    { label: 'Male', value: formatNumber(counts.male) },
    { label: 'Female', value: formatNumber(counts.female) },
    {
      label: 'Completed / Certified',
      value: formatNumber(counts.completed),
    },
  ])

  let cursorY = header.contentStart + 14.5
  if (scope) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.2)
    doc.setTextColor(...SLATE_600)
    doc.text(
      [
        `Schedule: ${formatDate(scope.date)}`,
        `Duration: ${scope.durationHours} hours`,
        `Venue: ${scope.venue}`,
        `Trainer: ${scope.trainer}`,
      ].join('   |   '),
      MARGIN,
      cursorY + 5,
      { maxWidth: doc.internal.pageSize.getWidth() - MARGIN * 2 },
    )
    cursorY += 7
  }

  const trainingById = new Map(
    trainings.map((training) => [training.id, training]),
  )

  const sortedParticipants = [...participants].sort((a, b) => {
    const trainingA = trainingById.get(a.trainingId)?.date ?? ''
    const trainingB = trainingById.get(b.trainingId)?.date ?? ''
    return trainingB.localeCompare(trainingA) || a.fullName.localeCompare(b.fullName)
  })

  const head = scope
    ? ['#', 'Trainee Name', 'Gender', 'Sector', 'Email Address', 'Contact Number', 'Attendance']
    : [
        '#',
        'Trainee Name',
        'Training Session',
        'Gender',
        'Sector',
        'Email Address',
        'Contact Number',
        'Attendance',
      ]

  const body = sortedParticipants.map((participant, index) => {
    const base: Array<string | number> = [
      index + 1,
      participant.fullName,
    ]
    if (!scope) {
      const training = trainingById.get(participant.trainingId)
      base.push(
        training
          ? `${training.title} (${formatDate(training.date)})`
          : 'Unlinked training',
      )
    }
    base.push(
      participant.gender,
      participant.sector,
      participant.email || '—',
      participant.contactNumber || '—',
      participant.attendanceStatus,
    )
    return base
  })

  drawTable(doc, {
    startY: cursorY,
    head,
    body,
    fontSize: 7,
    headFontSize: 6.3,
    columnStyles: scope
      ? {
          0: { halign: 'center', cellWidth: 9 },
          1: { cellWidth: 53 },
          2: { cellWidth: 18 },
          3: { cellWidth: 35 },
          4: { cellWidth: 64 },
          5: { cellWidth: 36 },
          6: { cellWidth: 43 },
        }
      : {
          0: { halign: 'center', cellWidth: 8 },
          1: { cellWidth: 43 },
          2: { cellWidth: 58 },
          3: { cellWidth: 17 },
          4: { cellWidth: 30 },
          5: { cellWidth: 48 },
          6: { cellWidth: 30 },
          7: { cellWidth: 27 },
        },
  })

  addFooters(doc, reportTitle, generatedAt)
  const scopeSlug = scope ? 'Session' : 'Consolidated'
  doc.save(
    `DICT-Abra-Trainee-Attendance-${scopeSlug}-${fileTimestamp(generatedAt)}.pdf`,
  )
}

// Keep this helper exported for spreadsheet/report code that needs a clean string.
export const reportSanitize = sanitize
