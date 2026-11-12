import { useEffect, useState, type MouseEvent } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  function skipToMainContent(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    const mainContent = document.getElementById('main-content')
    mainContent?.focus()
    mainContent?.scrollIntoView()
  }

  return (
    <div className="min-h-dvh lg:pl-[270px]">
      <a
        href="#main-content"
        onClick={skipToMainContent}
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[110] focus:rounded-lg focus:border focus:border-slate-300 focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink-900 focus:shadow-lg"
      >
        Skip to main content
      </a>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-dvh flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          <div className="mx-auto w-full max-w-[1480px]">
            <Outlet />
          </div>
        </main>
        <footer className="mt-auto border-t border-slate-200/70 px-4 py-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-1.5 text-[10.5px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} Department of Information and
              Communications Technology — Abra Provincial Office
            </p>
            <p className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              Offline-first workstation · Data stored locally
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
