import {
  Building2,
  CarFront,
  DatabaseBackup,
  HardDrive,
  Info,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { BackupRestoreModal } from '../components/BackupRestoreModal'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { PageHeader } from '../components/ui/PageHeader'
import { useToast } from '../components/ui/toast-context'
import { api } from '../services/api'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { formatNumber, formatRelativeTime } from '../utils/formatters'

interface StorageEstimate {
  usage: number
  quota: number
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 MB'
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  )
  const value = bytes / 1024 ** exponent
  return `${value.toLocaleString('en-PH', {
    maximumFractionDigits: value >= 10 ? 0 : 1,
  })} ${units[exponent]}`
}

export function SettingsPage() {
  const toast = useToast()
  const isOnline = useOnlineStatus()
  const [projects, setProjects] = useState(0)
  const [trainings, setTrainings] = useState(0)
  const [participants, setParticipants] = useState(0)
  const [trips, setTrips] = useState(0)
  const [lastRestored, setLastRestored] = useState<string | undefined>(undefined)
  const [storage, setStorage] = useState<StorageEstimate | null>(null)
  const [backupOpen, setBackupOpen] = useState(false)
  const [seedConfirmOpen, setSeedConfirmOpen] = useState(false)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [clearing, setClearing] = useState(false)

  const loadStorageEstimate = useCallback(async () => {
    if (!navigator.storage?.estimate) return
    try {
      const estimate = await navigator.storage.estimate()
      setStorage({
        usage: estimate.usage ?? 0,
        quota: estimate.quota ?? 0,
      })
    } catch {
      setStorage(null)
    }
  }, [])

  const refreshCounts = useCallback(async () => {
    try {
      const [p, t, part, tr] = await Promise.all([
        api.projects.list(),
        api.trainings.list(),
        api.participants.list(),
        api.trips.list(),
      ])
      setProjects(p.length)
      setTrainings(t.length)
      setParticipants(part.length)
      setTrips(tr.length)
    } catch {
      // ignore
    }
    try {
      const meta = await api.meta.get('lastRestoredAt')
      setLastRestored(meta.value ?? undefined)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    let active = true
    Promise.all([
      api.projects.list(),
      api.trainings.list(),
      api.participants.list(),
      api.trips.list(),
    ])
      .then(([p, t, part, tr]) => {
        if (!active) return
        setProjects(p.length)
        setTrainings(t.length)
        setParticipants(part.length)
        setTrips(tr.length)
      })
      .catch(() => {})
    api.meta
      .get('lastRestoredAt')
      .then((meta) => {
        if (active) setLastRestored(meta.value ?? undefined)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    if (!navigator.storage?.estimate) return

    navigator.storage
      .estimate()
      .then((estimate) => {
        if (!active) return
        setStorage({
          usage: estimate.usage ?? 0,
          quota: estimate.quota ?? 0,
        })
      })
      .catch(() => {
        if (active) setStorage(null)
      })

    return () => {
      active = false
    }
  }, [])

  async function handleSeedDemoData() {
    setSeeding(true)
    try {
      await api.seed()
      await refreshCounts()
      await loadStorageEstimate()
      toast.success(
        'Demo data loaded',
        'Sample DICT Abra projects, trainings, trainee rosters, and field trips are ready.',
      )
      setSeedConfirmOpen(false)
    } catch (error) {
      toast.error(
        'Demo data could not be loaded',
        error instanceof Error ? error.message : 'Please try again.',
      )
    } finally {
      setSeeding(false)
    }
  }

  async function handleClearAllData() {
    setClearing(true)
    try {
      await api.clear()
      await refreshCounts()
      await loadStorageEstimate()
      toast.success(
        'All records cleared',
        'The local database is now empty. The app remains ready for new entries.',
      )
      setClearConfirmOpen(false)
    } catch (error) {
      toast.error(
        'Data could not be cleared',
        error instanceof Error ? error.message : 'Please try again.',
      )
    } finally {
      setClearing(false)
    }
  }

  const storagePercentage =
    storage && storage.quota > 0
      ? Math.min((storage.usage / storage.quota) * 100, 100)
      : 0

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="System administration"
        title="Settings"
        description="Manage the local database, restore backups, prepare demonstration data, and review offline storage details for this workstation."
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <section className="card overflow-hidden">
          <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <DatabaseBackup className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[15px] font-bold text-ink-950">
                Local Data Management
              </h2>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">
                Back up, restore, or reset the IndexedDB database on this device.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Backup &amp; restore
                </p>
                <p className="mt-0.5 text-[11px] leading-5 text-slate-500">
                  Export a complete JSON copy or restore a previous backup.
                </p>
                 {lastRestored ? (
                  <p className="mt-1 text-[10px] text-emerald-600">
                     Last restore: {formatRelativeTime(lastRestored)}
                  </p>
                ) : null}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setBackupOpen(true)}
                className="shrink-0 self-start sm:self-auto"
                icon={<DatabaseBackup className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                Open backup manager
              </Button>
            </div>

            <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Seed demo data</p>
                <p className="mt-0.5 text-[11px] leading-5 text-slate-500">
                  Replace the database with realistic DICT Abra sample records for
                  training or demonstration.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSeedConfirmOpen(true)}
                className="shrink-0 self-start sm:self-auto"
                icon={<Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                Load demo data
              </Button>
            </div>

            <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Clear all records</p>
                <p className="mt-0.5 text-[11px] leading-5 text-slate-500">
                  Permanently delete every project, training, trainee, and trip
                  record.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setClearConfirmOpen(true)}
                className="shrink-0 self-start text-rose-600 hover:bg-rose-50 hover:text-rose-700 sm:self-auto"
                icon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                Clear database
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 border-t border-slate-100 bg-slate-50/60 sm:grid-cols-4 sm:divide-y-0">
            <div className="px-4 py-3 text-center">
              <p className="text-lg font-bold text-ink-950">{formatNumber(projects ?? 0)}</p>
              <p className="text-[9px] font-bold tracking-[0.08em] text-slate-400 uppercase">
                Projects
              </p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-lg font-bold text-ink-950">
                {formatNumber(trainings ?? 0)}
              </p>
              <p className="text-[9px] font-bold tracking-[0.08em] text-slate-400 uppercase">
                Trainings
              </p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-lg font-bold text-ink-950">
                {formatNumber(participants ?? 0)}
              </p>
              <p className="text-[9px] font-bold tracking-[0.08em] text-slate-400 uppercase">
                Trainees
              </p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="inline-flex items-center gap-1 text-lg font-bold text-ink-950">
                {formatNumber(trips ?? 0)}
                <CarFront className="h-3 w-3 text-slate-300" aria-hidden="true" />
              </p>
              <p className="text-[9px] font-bold tracking-[0.08em] text-slate-400 uppercase">
                Trips
              </p>
            </div>
          </div>
        </section>

        <div className="space-y-5">
          <section className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-50 text-ink-800">
                  {isOnline ? (
                    <Wifi className="h-4.5 w-4.5" aria-hidden="true" />
                  ) : (
                    <WifiOff className="h-4.5 w-4.5" aria-hidden="true" />
                  )}
                </span>
                <div>
                  <h2 className="text-sm font-bold text-ink-950">
                    Connectivity
                  </h2>
                  <p className="text-[10.5px] text-slate-500">
                    Network status is informational only
                  </p>
                </div>
              </div>
              <span
                className={
                  isOnline
                    ? 'rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-bold tracking-wide text-emerald-700 uppercase'
                    : 'rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] font-bold tracking-wide text-amber-700 uppercase'
                }
              >
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-slate-500">
              The system never sends project or trainee data to an external
              server. You can continue working fully offline; network access only
              affects general device connectivity.
            </p>
          </section>

          <section className="card p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                  <HardDrive className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-ink-950">Device storage</h2>
                  <p className="text-[10.5px] text-slate-500">
                    Browser-managed IndexedDB allocation
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => void loadStorageEstimate()}
                aria-label="Refresh storage estimate"
                title="Refresh storage estimate"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4">
              <div className="flex items-end justify-between text-[10.5px]">
                <span className="font-semibold text-slate-700">
                  {storage ? formatBytes(storage.usage) : 'Calculating…'}
                </span>
                <span className="text-slate-400">
                  {storage ? `of ${formatBytes(storage.quota)} available` : ''}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full min-w-[2px] rounded-full bg-cyan-500"
                  style={{ width: `${Math.max(storagePercentage, 1)}%` }}
                />
              </div>
              <p className="mt-2 text-[10px] leading-4 text-slate-400">
                Storage estimates are approximate and controlled by your browser.
                Exported backups are the recommended permanent copy.
              </p>
            </div>
          </section>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
              <Building2 className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[15px] font-bold text-ink-950">
                Office Profile
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Official report identity used on every export
              </p>
            </div>
          </div>
          <dl className="space-y-3 px-5 py-4 text-xs">
            <div>
              <dt className="text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
                Agency
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-700">
                Department of Information and Communications Technology
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
                Office
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-700">
                Abra Provincial Office
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
                  Region
                </dt>
                <dd className="mt-0.5 font-medium text-slate-600">
                  Cordillera Administrative Region
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
                  Location
                </dt>
                <dd className="mt-0.5 font-medium text-slate-600">
                  Bangued, Abra
                </dd>
              </div>
            </div>
          </dl>
          <div className="mx-5 mb-5 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <p className="flex items-start gap-2 text-[10.5px] leading-5 text-slate-500">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              PDF exports include the agency name, provincial office, region, and
              an automatically generated report date in the official document
              header.
            </p>
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <ShieldCheck className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[15px] font-bold text-ink-950">
                About This Installation
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Version and offline readiness details
              </p>
            </div>
          </div>
          <dl className="divide-y divide-slate-100 px-5 text-xs">
            <div className="flex items-center justify-between py-3">
              <dt className="text-slate-500">Application</dt>
              <dd className="max-w-[60%] text-right font-semibold text-slate-700">
                DICT Abra Integrated System
              </dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-slate-500">Version</dt>
              <dd className="font-semibold text-slate-700">1.0.0</dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-slate-500">Data storage</dt>
              <dd className="font-semibold text-slate-700">IndexedDB · local only</dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-slate-500">Offline support</dt>
              <dd className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                Service worker enabled
              </dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-slate-500">Report engine</dt>
              <dd className="font-semibold text-slate-700">
                Client-side PDF &amp; Excel
              </dd>
            </div>
          </dl>
          <div className="mx-5 my-4 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-3">
            <p className="text-[10.5px] leading-5 text-amber-900">
              This workstation is the system of record. Regularly download a JSON
              backup and store it in a secure location. Clearing browser site data
              may erase the local database.
            </p>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-rose-900">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Danger zone
            </h2>
            <p className="mt-1 text-[11px] leading-5 text-rose-800/80">
              Clearing the database removes all records permanently. Export a
              backup first if you may need this data later.
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setClearConfirmOpen(true)}
            className="shrink-0 self-start sm:self-auto"
          >
            Clear all data
          </Button>
        </div>
      </section>

      {backupOpen ? (
        <BackupRestoreModal
          onClose={() => {
            setBackupOpen(false)
            void loadStorageEstimate()
              void refreshCounts()
          }}
        />
      ) : null}

      <ConfirmDialog
        open={seedConfirmOpen}
        title="Load demo data?"
        description="This will replace every project, training, trainee, trip, and activity record currently stored on this device with the prepared DICT Abra sample dataset. Export a backup first if you need to keep your current records."
        confirmLabel="Load demo data"
        variant="primary"
        onConfirm={handleSeedDemoData}
        onCancel={() => setSeedConfirmOpen(false)}
        loading={seeding}
      />

      <ConfirmDialog
        open={clearConfirmOpen}
        title="Clear the entire local database?"
        description="All projects, trainings, trainee rosters, trip records, and activity history on this device will be permanently deleted. This action cannot be undone."
        confirmLabel="Clear all records"
        onConfirm={handleClearAllData}
        onCancel={() => setClearConfirmOpen(false)}
        loading={clearing}
      />
    </div>
  )
}
