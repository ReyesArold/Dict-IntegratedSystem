import {
  BarChart3,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  GraduationCap,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { useToast } from '../components/ui/toast-context'
import { api } from '../services/api'
import type { Participant, Project, Training } from '../services/api'
import {
  PROJECT_CATEGORIES,
  PROJECT_STATUSES,
  SECTORS,
  type ProjectCategory,
} from '../types'
import {
  formatNumber,
  formatPesoCompact,
  percentage,
} from '../utils/formatters'
import {
  exportProjectsExcel,
  exportAttendanceExcel,
  exportTrainingMasterlistExcel,
} from '../utils/excelReports'
import {
  exportAttendancePdf,
  exportProjectsPdf,
  exportTrainingMasterlistPdf,
} from '../utils/pdfReports'

interface CategoryStat {
  category: ProjectCategory
  count: number
  budget: number
  averageProgress: number
}

function buildCategoryStats(projects: Project[]): CategoryStat[] {
  return PROJECT_CATEGORIES.map((category) => {
    const matching = projects.filter((project) => project.category === category)
    return {
      category,
      count: matching.length,
      budget: matching.reduce((sum, project) => sum + project.budget, 0),
      averageProgress: matching.length
        ? Math.round(
            matching.reduce((sum, project) => sum + project.progress, 0) /
              matching.length,
          )
        : 0,
    }
  }).sort((a, b) => b.budget - a.budget)
}

function ReportsSkeleton() {
  return (
    <div className="animate-pulse space-y-5" aria-label="Loading reports">
      <div className="h-24 rounded-2xl bg-white/70" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card h-28" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card h-80" />
        <div className="card h-80" />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="card h-72" />
        ))}
      </div>
    </div>
  )
}

export function ReportsPage() {
  const toast = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [trainings, setTrainings] = useState<Training[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [attendanceTrainingId, setAttendanceTrainingId] = useState('all')

  useEffect(() => {
    let active = true
    Promise.all([
      api.projects.list(),
      api.trainings.list(),
      api.participants.list(),
    ])
      .then(([p, t, part]) => {
        if (!active) return
        setProjects(p)
        setTrainings(t)
        setParticipants(part)
      })
      .catch((error) => {
        console.error('DICT Abra could not load report data:', error)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return <ReportsSkeleton />
  }

  const categoryStats = buildCategoryStats(projects)
  const maxCategoryBudget = Math.max(
    ...categoryStats.map((item) => item.budget),
    1,
  )
  const totalBudget = projects.reduce((sum, project) => sum + project.budget, 0)
  const averageProgress = projects.length
    ? Math.round(
        projects.reduce((sum, project) => sum + project.progress, 0) /
          projects.length,
      )
    : 0
  const completedProjects = projects.filter(
    (project) => project.status === 'Completed',
  ).length
  const maleTrainees = participants.filter(
    (participant) => participant.gender === 'Male',
  ).length
  const femaleTrainees = participants.filter(
    (participant) => participant.gender === 'Female',
  ).length
  const certifiedTrainees = participants.filter(
    (participant) => participant.attendanceStatus === 'Completed / Certified',
  ).length

  const sectorStats = SECTORS.map((sector) => ({
    sector,
    count: participants.filter((participant) => participant.sector === sector)
      .length,
  }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
  const maxSectorCount = Math.max(...sectorStats.map((item) => item.count), 1)

  const selectedTraining: Training | null =
    attendanceTrainingId === 'all'
      ? null
      : (trainings.find(
          (training) => String(training.id) === attendanceTrainingId,
        ) ?? null)
  const attendanceParticipants = selectedTraining
    ? participants.filter(
        (participant) => participant.trainingId === selectedTraining.id,
      )
    : participants

  function runExport(label: string, action: () => void) {
    try {
      action()
      toast.success(
        `${label} generated`,
        'The official report has been downloaded to this device.',
      )
    } catch (error) {
      toast.error(
        `${label} could not be generated`,
        error instanceof Error ? error.message : 'Please try again.',
      )
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights & official documents"
        title="Reports & Analytics"
        description="Review portfolio and training insights, then generate DICT-ready PDF and Excel reports entirely on this device."
      />

      <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2.5 text-xs leading-5 text-emerald-900">
          <ShieldCheck
            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
            aria-hidden="true"
          />
          Every report is processed locally. PDFs include the official DICT Abra
          document header, agency details, and date generated.
        </p>
        <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[9px] font-bold tracking-[0.1em] text-emerald-700 uppercase sm:self-auto">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          100% offline
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
              Portfolio value
            </p>
            <TrendingUp className="h-4 w-4 text-brand-500" aria-hidden="true" />
          </div>
          <p className="mt-2 text-xl font-bold tracking-[-0.03em] text-ink-950">
            {formatPesoCompact(totalBudget)}
          </p>
          <p className="mt-1 text-[10.5px] text-slate-400">
            Across {formatNumber(projects.length)} projects
          </p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
              Avg. project progress
            </p>
            <BarChart3 className="h-4 w-4 text-cyan-600" aria-hidden="true" />
          </div>
          <p className="mt-2 text-xl font-bold tracking-[-0.03em] text-ink-950">
            {averageProgress}%
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-cyan-500"
              style={{ width: `${averageProgress}%` }}
            />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
              Trainee registrations
            </p>
            <Users className="h-4 w-4 text-gold-500" aria-hidden="true" />
          </div>
          <p className="mt-2 text-xl font-bold tracking-[-0.03em] text-ink-950">
            {formatNumber(participants.length)}
          </p>
          <p className="mt-1 text-[10.5px] text-slate-400">
            {formatNumber(certifiedTrainees)} completed / certified
          </p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
              Female participation
            </p>
            <Users className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          </div>
          <p className="mt-2 text-xl font-bold tracking-[-0.03em] text-ink-950">
            {percentage(femaleTrainees, participants.length)}%
          </p>
          <p className="mt-1 text-[10.5px] text-slate-400">
            {formatNumber(femaleTrainees)} female · {formatNumber(maleTrainees)} male
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-[15px] font-bold text-ink-950">
              Project Portfolio by Category
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Allocation and implementation progress across DICT programs
            </p>
          </div>

          <div className="p-5">
            <div className="mb-5 flex flex-wrap gap-2">
              {PROJECT_STATUSES.map((status) => {
                const count = projects.filter(
                  (project) => project.status === status,
                ).length
                return (
                  <span
                    key={status}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-600"
                  >
                    {status}
                    <span className="font-bold text-slate-800">{count}</span>
                  </span>
                )
              })}
            </div>

            {projects.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title="No project data yet"
                description="Add projects to see portfolio analytics and enable project exports."
                compact
              />
            ) : (
              <div className="space-y-4">
                {categoryStats.map((item) => (
                  <div key={item.category}>
                    <div className="mb-1.5 flex items-start justify-between gap-3 text-[11px]">
                      <span className="max-w-[65%] leading-4 font-medium text-slate-600">
                        {item.category}
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="font-bold text-ink-900">
                          {formatPesoCompact(item.budget)}
                        </span>
                        <span className="ml-1.5 text-[10px] text-slate-400">
                          {item.count} {item.count === 1 ? 'project' : 'projects'}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{
                            width: `${Math.round((item.budget / maxCategoryBudget) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right text-[10px] font-semibold text-slate-400">
                        {item.averageProgress}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 flex items-center justify-between border-t border-dashed border-slate-200 pt-3.5 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                {completedProjects} projects completed
              </span>
              <span>{formatNumber(projects.length)} total listed</span>
            </div>
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-[15px] font-bold text-ink-950">
              Training Reach &amp; GAD Profile
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Trainee distribution by sector and gender
            </p>
          </div>

          <div className="p-5">
            {participants.length === 0 ? (
              <EmptyState
                icon={GraduationCap}
                title="No trainee data yet"
                description="Enroll trainees in a training session to see GAD and sector analytics."
                compact
              />
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                    <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
                      <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden="true" />
                      Male trainees
                    </div>
                    <p className="mt-1.5 text-xl font-bold text-ink-950">
                      {formatNumber(maleTrainees)}
                      <span className="ml-1.5 text-[10px] font-semibold text-slate-400">
                        {percentage(maleTrainees, participants.length)}%
                      </span>
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                    <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
                      <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
                      Female trainees
                    </div>
                    <p className="mt-1.5 text-xl font-bold text-ink-950">
                      {formatNumber(femaleTrainees)}
                      <span className="ml-1.5 text-[10px] font-semibold text-slate-400">
                        {percentage(femaleTrainees, participants.length)}%
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <p className="text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
                    Trainees by sector
                  </p>
                  {sectorStats.map((item) => (
                    <div key={item.sector}>
                      <div className="mb-1 flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-600">
                          {item.sector}
                        </span>
                        <span className="font-bold text-ink-900">{item.count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-ink-700"
                          style={{
                            width: `${Math.round((item.count / maxSectorCount) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mt-5 border-t border-dashed border-slate-200 pt-3.5 text-[10px] leading-4 text-slate-400">
                  {formatNumber(trainings.length)} training sessions recorded.
                  GAD data is based on trainee profiles linked to these sessions.
                </p>
              </>
            )}
          </div>
        </section>
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold tracking-[-0.02em] text-ink-950">
              Report Exports
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Choose a report and format. All files are prepared in the browser.
            </p>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 sm:inline-flex">
            <Download className="h-3 w-3" aria-hidden="true" />
            Saved to Downloads
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <article className="card flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <FolderKanban className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold tracking-[0.08em] text-slate-500 uppercase">
                Official register
              </span>
            </div>
            <h3 className="mt-4 text-sm font-bold text-ink-950">
              Project Monitoring Register
            </h3>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">
              Complete project list with locations, categories, budgets, progress,
              focal persons, and implementation remarks.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-[10.5px]">
              <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                <p className="text-slate-400">Projects</p>
                <p className="mt-0.5 font-bold text-slate-700">
                  {formatNumber(projects.length)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                <p className="text-slate-400">Allocation</p>
                <p className="mt-0.5 font-bold text-slate-700">
                  {formatPesoCompact(totalBudget)}
                </p>
              </div>
            </div>
            <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
              <Button
                variant="secondary"
                size="sm"
                disabled={projects.length === 0}
                onClick={() =>
                  runExport('Project Excel report', () =>
                    exportProjectsExcel(projects),
                  )
                }
                icon={<FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                Excel
              </Button>
              <Button
                size="sm"
                disabled={projects.length === 0}
                onClick={() =>
                  runExport('Project PDF report', () => exportProjectsPdf(projects))
                }
                icon={<FileText className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                PDF
              </Button>
            </div>
          </article>

          <article className="card flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                <GraduationCap className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold tracking-[0.08em] text-slate-500 uppercase">
                Masterlist
              </span>
            </div>
            <h3 className="mt-4 text-sm font-bold text-ink-950">
              Training Masterlist
            </h3>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">
              All training sessions with schedules, trainers, venues, status, and
              gender-disaggregated participation summaries.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-[10.5px]">
              <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                <p className="text-slate-400">Sessions</p>
                <p className="mt-0.5 font-bold text-slate-700">
                  {formatNumber(trainings.length)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                <p className="text-slate-400">Registrations</p>
                <p className="mt-0.5 font-bold text-slate-700">
                  {formatNumber(participants.length)}
                </p>
              </div>
            </div>
            <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
              <Button
                variant="secondary"
                size="sm"
                disabled={trainings.length === 0}
                onClick={() =>
                  runExport('Training masterlist Excel report', () =>
                    exportTrainingMasterlistExcel(trainings, participants),
                  )
                }
                icon={<FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                Excel
              </Button>
              <Button
                size="sm"
                disabled={trainings.length === 0}
                onClick={() =>
                  runExport('Training masterlist PDF report', () =>
                    exportTrainingMasterlistPdf(trainings, participants),
                  )
                }
                icon={<FileText className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                PDF
              </Button>
            </div>
          </article>

          <article className="card flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Users className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold tracking-[0.08em] text-slate-500 uppercase">
                Attendance
              </span>
            </div>
            <h3 className="mt-4 text-sm font-bold text-ink-950">
              Trainee Attendance &amp; Certification
            </h3>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">
              Export the complete trainee roster or focus on a specific training
              session with attendance and certification status.
            </p>
            <div className="mt-4">
              <label
                className="mb-1.5 block text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase"
                htmlFor="attendance-report-session"
              >
                Training session
              </label>
              <select
                id="attendance-report-session"
                className="field-select text-xs"
                value={attendanceTrainingId}
                onChange={(event) => setAttendanceTrainingId(event.target.value)}
              >
                <option value="all">All training sessions</option>
                {[...trainings]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((training) => (
                    <option key={training.id} value={training.id}>
                      {training.title}
                    </option>
                  ))}
              </select>
              <p className="mt-1.5 text-[10px] text-slate-400">
                {formatNumber(attendanceParticipants.length)} trainee records selected
              </p>
            </div>
            <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
              <Button
                variant="secondary"
                size="sm"
                disabled={attendanceParticipants.length === 0}
                onClick={() =>
                  runExport('Attendance Excel report', () =>
                    exportAttendanceExcel(
                      trainings,
                      attendanceParticipants,
                      selectedTraining,
                    ),
                  )
                }
                icon={<FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                Excel
              </Button>
              <Button
                size="sm"
                disabled={attendanceParticipants.length === 0}
                onClick={() =>
                  runExport('Attendance PDF report', () =>
                    exportAttendancePdf(
                      trainings,
                      attendanceParticipants,
                      selectedTraining,
                    ),
                  )
                }
                icon={<FileText className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                PDF
              </Button>
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}
