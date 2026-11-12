import {
  AlertTriangle,
  CarFront,
  Database,
  Download,
  FolderKanban,
  GraduationCap,
  RotateCcw,
  Upload,
  Users,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api } from '../services/api'
import {
  exportDatabaseBackup,
  readBackupFile,
  restoreDatabaseBackup,
  type ParsedBackup,
} from '../utils/backup'
import { formatDateTime } from '../utils/formatters'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'
import { useToast } from './ui/toast-context'

interface BackupRestoreModalProps {
  onClose: () => void
}

export function BackupRestoreModal({ onClose }: BackupRestoreModalProps) {
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'export' | 'read' | 'restore' | null>(null)
  const [pendingBackup, setPendingBackup] = useState<ParsedBackup | null>(null)
  const [pendingFileName, setPendingFileName] = useState('')

  const [projectCount, setProjectCount] = useState(0)
  const [trainingCount, setTrainingCount] = useState(0)
  const [participantCount, setParticipantCount] = useState(0)
  const [tripCount, setTripCount] = useState(0)

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
        setProjectCount(p.length)
        setTrainingCount(t.length)
        setParticipantCount(part.length)
        setTripCount(tr.length)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  async function handleExport() {
    setBusy('export')
    try {
      const counts = await exportDatabaseBackup()
      toast.success(
        'Backup downloaded',
        `${counts.projects} projects, ${counts.trainings} trainings, ${counts.participants} trainees, and ${counts.trips} trips were included.`,
      )
    } catch (error) {
      toast.error(
        'Backup failed',
        error instanceof Error ? error.message : 'Please try again.',
      )
    } finally {
      setBusy(null)
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    setBusy('read')
    setPendingBackup(null)
    try {
      const parsed = await readBackupFile(file)
      setPendingBackup(parsed)
      setPendingFileName(file.name)
    } catch (error) {
      toast.error(
        'Backup could not be opened',
        error instanceof Error ? error.message : 'The file is not valid.',
      )
    } finally {
      setBusy(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleRestore() {
    if (!pendingBackup) return
    setBusy('restore')
    try {
      const counts = await restoreDatabaseBackup(pendingBackup.payload)
      toast.success(
        'Database restored',
        `${counts.projects} projects, ${counts.trainings} trainings, ${counts.participants} trainees, and ${counts.trips} trips were restored from ${pendingFileName}.`,
      )
      setPendingBackup(null)
      setPendingFileName('')
      onClose()
    } catch (error) {
      toast.error(
        'Restore failed',
        error instanceof Error ? error.message : 'The database was not changed.',
      )
    } finally {
      setBusy(null)
    }
  }

  const handleClose = () => {
    if (busy === 'restore') return
    onClose()
  }

  return (
    <Modal
      onClose={handleClose}
      title="Backup & Restore Database"
      description="Create an offline copy of all records or restore this device from a previous backup."
      size="lg"
      icon={<Database className="h-5 w-5" aria-hidden="true" />}
      footer={
        <Button variant="secondary" onClick={handleClose} disabled={busy === 'restore'}>
          Close
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex items-center gap-1.5 text-slate-500">
              <FolderKanban className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-[10px] font-bold tracking-wide uppercase">
                Projects
              </span>
            </div>
            <p className="mt-1.5 text-xl font-bold text-ink-950">{projectCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex items-center gap-1.5 text-slate-500">
              <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-[10px] font-bold tracking-wide uppercase">
                Trainings
              </span>
            </div>
            <p className="mt-1.5 text-xl font-bold text-ink-950">
              {trainingCount}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-[10px] font-bold tracking-wide uppercase">
                Trainees
              </span>
            </div>
            <p className="mt-1.5 text-xl font-bold text-ink-950">
              {participantCount}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex items-center gap-1.5 text-slate-500">
              <CarFront className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-[10px] font-bold tracking-wide uppercase">
                Trips
              </span>
            </div>
            <p className="mt-1.5 text-xl font-bold text-ink-950">{tripCount}</p>
          </div>
        </div>

        <section className="rounded-xl border border-slate-200 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Export a backup
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Downloads a complete JSON file containing projects, trainings,
                trainee rosters, trip records, and activity history.
              </p>
            </div>
            <Button
              onClick={handleExport}
              loading={busy === 'export'}
              icon={<Download className="h-4 w-4" aria-hidden="true" />}
              className="shrink-0"
            >
              Download backup
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-4 sm:p-5">
          <h3 className="text-sm font-bold text-slate-800">
            Restore from a backup
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Select a DICT Abra JSON backup. Restoring replaces all records
            currently stored on this device.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            id="backup-file-input"
            onChange={(event) => {
              void handleFile(event.target.files?.[0])
            }}
          />

          {!pendingBackup ? (
            <div className="mt-4">
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                loading={busy === 'read'}
                icon={<Upload className="h-4 w-4" aria-hidden="true" />}
              >
                Choose backup file
              </Button>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
              <div className="flex items-start gap-2.5">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold break-words text-amber-900">
                    Ready to restore {pendingFileName}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-amber-800">
                    Exported {formatDateTime(pendingBackup.payload.exportedAt)}.
                    This file contains {pendingBackup.counts.projects} projects,{' '}
                    {pendingBackup.counts.trainings} trainings,{' '}
                    {pendingBackup.counts.participants} trainee records, and{' '}
                    {pendingBackup.counts.trips} trip records. Your current
                    database will be overwritten.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleRestore}
                      loading={busy === 'restore'}
                      icon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
                    >
                      Restore this backup
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPendingBackup(null)
                        setPendingFileName('')
                      }}
                      disabled={busy === 'restore'}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <p className="text-[11px] leading-5 text-slate-400">
          Backups stay on your device unless you choose to move the downloaded
          file. Keep a current copy on a secure external drive.
        </p>
      </div>
    </Modal>
  )
}
