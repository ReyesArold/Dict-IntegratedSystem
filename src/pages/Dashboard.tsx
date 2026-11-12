import { useEffect, useState } from 'react'
import {
  Activity,
  BarChart3,
  CheckCircle2,
  FolderKanban,
  GraduationCap,
  Plus,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import type { Participant, Project, Training, Trip } from '../services/api'
import type { ActivityLog } from '../types'
import { ActivityFeed } from '../components/dashboard/ActivityFeed'
import { KpiCard } from '../components/dashboard/KpiCard'
import { ProjectStatusChart } from '../components/dashboard/ProjectStatusChart'
import { TrainingStatusChart } from '../components/dashboard/TrainingStatusChart'
import { UpcomingTripsCard } from '../components/dashboard/UpcomingTripsCard'
import { PageHeader } from '../components/ui/PageHeader'
import { formatLongDate, formatNumber, percentage, todayIsoDate } from '../utils/formatters'

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-label="Loading dashboard">
      <div className="h-20 rounded-2xl bg-white/70" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="card h-[148px] p-5">
            <div className="h-3 w-20 rounded bg-slate-100" />
            <div className="mt-5 h-8 w-16 rounded bg-slate-100" />
            <div className="mt-4 h-2.5 w-full rounded bg-slate-100" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <div className="card h-[280px]" />
          <div className="card h-[330px]" />
        </div>
        <div className="card h-[630px]" />
      </div>
    </div>
  )
}

export function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [trainings, setTrainings] = useState<Training[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([
      api.projects.list(),
      api.trainings.list(),
      api.participants.list(),
      api.trips.list(),
      api.activities.list(8),
    ])
      .then(([p, t, part, tr, a]) => {
        if (!active) return
        setProjects(p)
        setTrainings(t)
        setParticipants(part)
        setTrips(tr)
        setRecentActivities(a as ActivityLog[])
      })
      .catch((error) => {
        console.error('DICT Abra could not load dashboard data:', error)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return <DashboardSkeleton />
  }

  const activeProjects = projects.filter(
    (project) => project.status === 'In Progress',
  ).length
  const onHoldProjects = projects.filter(
    (project) => project.status === 'On Hold',
  ).length
  const completedProjects = projects.filter(
    (project) => project.status === 'Completed',
  ).length
  const pendingProjects = projects.length - completedProjects
  const completionRate = percentage(completedProjects, projects.length)
  const averageProgress = projects.length
    ? Math.round(
        projects.reduce((sum, project) => sum + project.progress, 0) /
          projects.length,
      )
    : 0
  const municipalities = new Set(
    projects.map((project) => project.municipality).filter(Boolean),
  ).size

  const conductedTrainings = trainings.filter(
    (training) => training.status === 'Completed',
  ).length
  const upcomingTrainings = trainings.filter(
    (training) =>
      ['Upcoming', 'Ongoing'].includes(training.status) &&
      training.date >= todayIsoDate(),
  ).length

  const maleTrainees = participants.filter(
    (participant) => participant.gender === 'Male',
  ).length
  const femaleTrainees = participants.filter(
    (participant) => participant.gender === 'Female',
  ).length
  const totalTrainees = participants.length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Operations overview · ${formatLongDate(new Date().toISOString())}`}
        title="Provincial Dashboard"
        description="A live snapshot of DICT Abra's ICT projects, capacity-building sessions, trainee reach, and official field travel — all from this device's local database."
        actions={
          <>
            <Link to="/reports" className="btn btn-secondary">
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              View reports
            </Link>
            <Link to="/projects?new=1" className="btn btn-primary">
              <Plus className="h-4 w-4" aria-hidden="true" />
              New project
            </Link>
          </>
        }
      />

      {projects.length === 0 && trainings.length === 0 && trips.length === 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-ink-950">Your local database is empty</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Start by adding a project or load the prepared DICT Abra demo data in Settings.
            </p>
          </div>
          <Link to="/settings" className="btn btn-secondary shrink-0">
            Open Settings
          </Link>
        </div>
      ) : null}

      <section aria-label="Key performance indicators">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <KpiCard
            label="Total Projects"
            value={formatNumber(projects.length)}
            icon={FolderKanban}
            accent="brand"
            description={`${formatNumber(municipalities)} ${municipalities === 1 ? 'municipality' : 'municipalities'} covered`}
          />
          <KpiCard
            label="Active Projects"
            value={formatNumber(activeProjects)}
            icon={Activity}
            accent="cyan"
            description={`${formatNumber(onHoldProjects)} on hold · ${averageProgress}% average progress`}
          />
          <KpiCard
            label="Trainings Conducted"
            value={formatNumber(conductedTrainings)}
            icon={GraduationCap}
            accent="gold"
            description={`${formatNumber(trainings.length)} total sessions · ${formatNumber(upcomingTrainings)} upcoming or ongoing`}
          />
          <KpiCard
            label="Total Trainees"
            value={formatNumber(totalTrainees)}
            icon={Users}
            accent="emerald"
            description="Across all recorded training sessions"
          >
            <div className="mt-2.5 flex h-1.5 overflow-hidden rounded-full bg-slate-100">
              <span
                className="h-full bg-brand-500"
                style={{ width: `${percentage(maleTrainees, totalTrainees)}%` }}
                aria-hidden="true"
              />
              <span
                className="h-full bg-gold-400"
                style={{ width: `${percentage(femaleTrainees, totalTrainees)}%` }}
                aria-hidden="true"
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
                Male {formatNumber(maleTrainees)}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-gold-400" aria-hidden="true" />
                Female {formatNumber(femaleTrainees)}
              </span>
            </div>
          </KpiCard>
          <KpiCard
            label="Projects Completed"
            value={formatNumber(completedProjects)}
            icon={CheckCircle2}
            accent="navy"
            description={`${formatNumber(pendingProjects)} pending · ${completionRate}% completion rate`}
          >
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] font-semibold">
              <span className="text-emerald-600">Completed</span>
              <span className="text-amber-600">Pending</span>
            </div>
          </KpiCard>
        </div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <ProjectStatusChart projects={projects} />
          <TrainingStatusChart trainings={trainings} participants={participants} />
        </div>
        <div className="space-y-5">
          <UpcomingTripsCard trips={trips} />
          <ActivityFeed activities={recentActivities} />
        </div>
      </div>
    </div>
  )
}
