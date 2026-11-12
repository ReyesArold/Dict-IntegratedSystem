import { Database, ShieldCheck, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '../../utils/cn'
import { Logo } from '../ui/Logo'
import { NAVIGATION_ITEMS } from './navigation'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {open ? (
        <div
          className="animate-fade-in fixed inset-0 z-40 bg-ink-950/55 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col bg-ink-950 text-white transition-transform duration-200 ease-out lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Application sidebar"
      >
        <div className="relative overflow-hidden border-b border-white/10 px-5 pt-6 pb-5">
          <div
            className="pointer-events-none absolute -top-20 -right-16 h-48 w-48 rounded-full bg-brand-500/10 blur-2xl"
            aria-hidden="true"
          />
          <div className="relative flex items-start gap-3">
            <Logo className="h-11 w-11 shrink-0 rounded-xl ring-1 ring-white/15" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold tracking-[0.2em] text-gold-300">
                  DICT ABRA
                </p>
                <span className="h-3 w-px bg-white/20" aria-hidden="true" />
                <p className="text-[9px] font-medium tracking-[0.1em] text-ink-200/80 uppercase">
                  CAR
                </p>
              </div>
              <p className="mt-1 text-[13px] leading-[1.35] font-bold text-white">
                Integrated PMIS, Training &amp; Trip Tracker System
              </p>
            </div>
            <button
              type="button"
              className="ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-200 hover:bg-white/10 hover:text-white lg:hidden"
              onClick={onClose}
              aria-label="Close navigation"
            >
              <X className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-5" aria-label="Primary navigation">
          <p className="mb-2 px-3 text-[9px] font-bold tracking-[0.18em] text-ink-300/65 uppercase">
            Workspace
          </p>
          <div className="space-y-1">
            {NAVIGATION_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition',
                      isActive
                        ? 'bg-white/[0.1] text-white shadow-[inset_0_1px_0_rgb(255_255_255_/_0.06)]'
                        : 'text-ink-100/70 hover:bg-white/[0.055] hover:text-white',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          'absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gold-400 transition-opacity',
                          isActive ? 'opacity-100' : 'opacity-0',
                        )}
                        aria-hidden="true"
                      />
                      <Icon
                        className={cn(
                          'h-[18px] w-[18px] shrink-0 transition-colors',
                          isActive
                            ? 'text-brand-300'
                            : 'text-ink-300/70 group-hover:text-ink-200',
                        )}
                        aria-hidden="true"
                      />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              )
            })}
          </div>
        </nav>

        <div className="mt-auto space-y-3 border-t border-white/10 px-3 py-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.045] p-3">
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.1em] text-gold-300 uppercase">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Offline-first
            </div>
            <p className="mt-1.5 text-[11px] leading-[1.55] text-ink-200/65">
              All records stay in this device&apos;s local database. No internet
              connection is required.
            </p>
          </div>
          <div className="flex items-center justify-between px-1 text-[10px] text-ink-300/55">
            <span className="inline-flex items-center gap-1.5">
              <Database className="h-3 w-3" aria-hidden="true" />
              IndexedDB
            </span>
            <span>v1.0.0</span>
          </div>
        </div>
      </aside>
    </>
  )
}