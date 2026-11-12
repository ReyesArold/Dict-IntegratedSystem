import { CalendarDays, DatabaseBackup, Menu, Wifi, WifiOff } from 'lucide-react'
import { useState } from 'react'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { formatLongDate } from '../../utils/formatters'
import { BackupRestoreModal } from '../BackupRestoreModal'
import { Button } from '../ui/Button'
import { Logo } from '../ui/Logo'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const isOnline = useOnlineStatus()
  const [backupOpen, setBackupOpen] = useState(false)
  const today = new Date()

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="flex h-[68px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            className="icon-btn -ml-1 h-9 w-9 shrink-0 lg:hidden"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Logo className="hidden h-8 w-8 shrink-0 rounded-lg sm:block lg:hidden" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-[0.16em] text-ink-800 uppercase">
                  DICT Abra
                </span>
                <span
                  className="hidden h-3 w-px bg-slate-300 sm:block"
                  aria-hidden="true"
                />
                <span className="hidden text-[10px] font-medium text-slate-400 sm:block">
                  Abra Provincial Office
                </span>
              </div>
              <p className="truncate text-[12px] leading-4 font-semibold text-slate-600 sm:text-[13px]">
                Integrated PMIS, Training &amp; Trip Tracker System
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span
              className={
                isOnline
                  ? 'inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold tracking-wide text-emerald-700 uppercase sm:text-[11px]'
                  : 'inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] font-bold tracking-wide text-amber-700 uppercase sm:text-[11px]'
              }
              title={
                isOnline
                  ? 'Network connection available. The app still uses local data.'
                  : 'No internet connection. All features continue to work locally.'
              }
            >
              {isOnline ? (
                <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </span>

            <div className="hidden items-center gap-2 border-l border-slate-200 pl-3 text-[11px] font-medium text-slate-500 xl:flex">
              <CalendarDays className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              {formatLongDate(today.toISOString())}
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setBackupOpen(true)}
              icon={<DatabaseBackup className="h-4 w-4" aria-hidden="true" />}
              aria-label="Backup or restore database"
              className="ml-1"
            >
              <span className="hidden md:inline">Backup / Restore</span>
              <span className="hidden sm:inline md:hidden">Backup</span>
            </Button>
          </div>
        </div>
      </header>

      {backupOpen ? (
        <BackupRestoreModal onClose={() => setBackupOpen(false)} />
      ) : null}
    </>
  )
}