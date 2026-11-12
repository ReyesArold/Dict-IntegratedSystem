import {
  BarChart3,
  CalendarDays,
  CarFront,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavigationItem {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard, end: true },
  { label: 'Project Monitoring', to: '/projects', icon: FolderKanban },
  { label: 'Training Management', to: '/trainings', icon: GraduationCap },
  { label: 'Training Calendar', to: '/calendar', icon: CalendarDays },
  { label: 'Trip Tracker', to: '/trips', icon: CarFront },
  { label: 'Reports & Analytics', to: '/reports', icon: BarChart3 },
  { label: 'Settings', to: '/settings', icon: Settings },
]
