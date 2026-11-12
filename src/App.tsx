import { lazy, Suspense } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { ToastProvider } from './components/ui/ToastProvider'
import { Dashboard } from './pages/Dashboard'
import { NotFoundPage } from './pages/NotFoundPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { SettingsPage } from './pages/SettingsPage'
import { TrainingsPage } from './pages/TrainingsPage'

// Report exports and the roster workspace carry the PDF/Excel libraries, so
// they are split out of the initial shell bundle.
const ReportsPage = lazy(() =>
  import('./pages/ReportsPage').then((module) => ({
    default: module.ReportsPage,
  })),
)
const TrainingDetailPage = lazy(() =>
  import('./pages/TrainingDetailPage').then((module) => ({
    default: module.TrainingDetailPage,
  })),
)
const TripTrackerPage = lazy(() =>
  import('./pages/TripTracker').then((module) => ({
    default: module.TripTrackerPage,
  })),
)
const TrainingCalendarPage = lazy(() =>
  import('./pages/TrainingCalendar').then((module) => ({
    default: module.TrainingCalendar,
  })),
)

function RouteFallback() {
  return (
    <div className="animate-pulse space-y-5" aria-label="Loading page">
      <div className="h-16 rounded-2xl bg-white/70" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card h-24" />
        ))}
      </div>
      <div className="card h-80" />
    </div>
  )
}

function App() {
  return (
    <ToastProvider>
      <HashRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="trainings" element={<TrainingsPage />} />
              <Route path="trainings/:id" element={<TrainingDetailPage />} />
              <Route path="trips" element={<TripTrackerPage />} />
              <Route path="calendar" element={<TrainingCalendarPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </HashRouter>
    </ToastProvider>
  )
}

export default App