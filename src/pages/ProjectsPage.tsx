import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  FolderKanban,
  FolderPlus,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserRound,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import {
  CategoryBadge,
  ProjectStatusBadge,
} from '../components/ui/StatusBadge'
import { useToast } from '../components/ui/toast-context'
import { ProjectFormModal } from '../components/projects/ProjectFormModal'
import { recordActivity } from '../db/activities'
import { api } from '../services/api'
import type { Project } from '../services/api'
import {
  PROJECT_CATEGORIES,
  PROJECT_STATUSES,
  type ProjectCategory,
  type ProjectStatus,
} from '../types'
import {
  formatDate,
  formatNumber,
  formatPeso,
  formatPesoCompact,
  todayIsoDate,
} from '../utils/formatters'
import { projectStatusBars } from '../utils/status'

type SortKey =
  | 'name'
  | 'municipality'
  | 'category'
  | 'status'
  | 'progress'
  | 'budget'
  | 'targetCompletionDate'
  | 'updatedAt'

interface SortState {
  key: SortKey
  direction: 'asc' | 'desc'
}

const sortPresets: Array<{ value: string; label: string }> = [
  { value: 'updatedAt:desc', label: 'Recently updated' },
  { value: 'name:asc', label: 'Project name A–Z' },
  { value: 'targetCompletionDate:asc', label: 'Nearest completion date' },
  { value: 'budget:desc', label: 'Highest budget' },
  { value: 'progress:desc', label: 'Highest progress' },
]

function getSortValue(project: Project, key: SortKey): string | number {
  switch (key) {
    case 'name':
      return project.name.toLowerCase()
    case 'municipality':
      return project.municipality.toLowerCase()
    case 'category':
      return project.category.toLowerCase()
    case 'status':
      return PROJECT_STATUSES.indexOf(project.status)
    case 'progress':
      return project.progress
    case 'budget':
      return project.budget
    case 'targetCompletionDate':
      return project.targetCompletionDate || '9999-12-31'
    case 'updatedAt':
      return project.updatedAt
  }
}

export function ProjectsPage() {
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | ProjectCategory>('all')
  const [sort, setSort] = useState<SortState>({
    key: 'updatedAt',
    direction: 'desc',
  })
  const [formOpen, setFormOpen] = useState(
    () => searchParams.get('new') === '1',
  )
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true
    api.projects
      .list()
      .then((data) => {
        if (active) setProjects(data)
      })
      .catch((error) => {
        console.error('DICT Abra could not load projects:', error)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const filteredProjects = useMemo(() => {
    if (!projects) return []
    const query = search.trim().toLowerCase()

    const filtered = projects.filter((project) => {
      const matchesSearch =
        !query ||
        [
          project.name,
          project.municipality,
          project.category,
          project.leader,
          project.remarks,
          project.status,
        ]
          .join(' ')
          .toLowerCase()
          .includes(query)
      const matchesStatus =
        statusFilter === 'all' || project.status === statusFilter
      const matchesCategory =
        categoryFilter === 'all' || project.category === categoryFilter
      return matchesSearch && matchesStatus && matchesCategory
    })

    return [...filtered].sort((a, b) => {
      const first = getSortValue(a, sort.key)
      const second = getSortValue(b, sort.key)
      let result =
        typeof first === 'number' && typeof second === 'number'
          ? first - second
          : String(first).localeCompare(String(second))
      if (result === 0) result = a.name.localeCompare(b.name)
      return sort.direction === 'asc' ? result : -result
    })
  }, [projects, search, statusFilter, categoryFilter, sort])

  const hasActiveFilters =
    search.trim().length > 0 ||
    statusFilter !== 'all' ||
    categoryFilter !== 'all'

  const totalBudget = filteredProjects.reduce(
    (sum, project) => sum + project.budget,
    0,
  )

  function openCreateForm() {
    setEditingProject(null)
    setFormOpen(true)
  }

  function openEditForm(project: Project) {
    setEditingProject(project)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingProject(null)
    if (searchParams.has('new')) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('new')
      setSearchParams(nextParams, { replace: true })
    }
    // Refresh the register so newly created or edited projects appear.
    api.projects
      .list()
      .then((data) => setProjects(data))
      .catch(() => {})
  }

  function resetFilters() {
    setSearch('')
    setStatusFilter('all')
    setCategoryFilter('all')
  }

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? {
            key,
            direction: current.direction === 'asc' ? 'desc' : 'asc',
          }
        : {
            key,
            direction: key === 'updatedAt' ? 'desc' : 'asc',
          },
    )
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.projects.delete(deleteTarget.id)
      await recordActivity(
        'project',
        'deleted',
        `${deleteTarget.name} was removed from the project register.`,
      )
      toast.success('Project deleted', `${deleteTarget.name} was removed.`)
      setProjects((current) =>
        current.filter((project) => project.id !== deleteTarget.id),
      )
      setDeleteTarget(null)
    } catch (error) {
      toast.error(
        'Project could not be deleted',
        error instanceof Error ? error.message : 'Please try again.',
      )
    } finally {
      setDeleting(false)
    }
  }

  const isLoading = loading

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Program operations"
        title="Project Monitoring"
        description="Track connectivity, digital transformation, and ICT development projects across Abra — including budgets, progress, focal persons, and implementation issues."
        actions={
          <Button
            onClick={openCreateForm}
            icon={<Plus className="h-4 w-4" aria-hidden="true" />}
          >
            Add project
          </Button>
        }
      />

      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search project, municipality, focal person, or keyword…"
                className="field-input pl-10"
                aria-label="Search projects"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <select
                className="field-select min-w-0 sm:w-[150px]"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as 'all' | ProjectStatus)
                }
                aria-label="Filter projects by status"
              >
                <option value="all">All statuses</option>
                {PROJECT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <select
                className="field-select min-w-0 sm:w-[200px]"
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value as 'all' | ProjectCategory)
                }
                aria-label="Filter projects by category"
              >
                <option value="all">All categories</option>
                {PROJECT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            {hasActiveFilters ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                icon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
                className="justify-start sm:justify-center"
              >
                Reset filters
              </Button>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <p>
              Showing <span className="font-bold text-slate-700">{filteredProjects.length}</span>{' '}
              of {formatNumber(projects?.length ?? 0)} projects ·{' '}
              <span className="font-semibold text-slate-600">
                {formatPesoCompact(totalBudget)}
              </span>{' '}
              total allocation
            </p>
            <label className="flex items-center gap-2 md:hidden">
              <span className="font-medium text-slate-500">Sort</span>
              <select
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-700"
                value={`${sort.key}:${sort.direction}`}
                onChange={(event) => {
                  const [key, direction] = event.target.value.split(':')
                  setSort({
                    key: key as SortKey,
                    direction: direction as 'asc' | 'desc',
                  })
                }}
                aria-label="Sort projects"
              >
                {sortPresets.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5" aria-label="Loading projects">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <EmptyState
            icon={hasActiveFilters ? Search : FolderKanban}
            title={
              hasActiveFilters
                ? 'No projects match these filters'
                : 'No projects recorded yet'
            }
            description={
              hasActiveFilters
                ? 'Try adjusting your keyword, status, or category filters to find a project.'
                : 'Create the first project record to start monitoring DICT Abra programs.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="secondary" onClick={resetFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button
                  onClick={openCreateForm}
                  icon={<FolderPlus className="h-4 w-4" aria-hidden="true" />}
                >
                  Add first project
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="scrollbar-thin hidden overflow-x-auto md:block">
              <table className="data-table min-w-[1080px]">
                <thead>
                  <tr>
                    <SortableHeader
                      label="Project"
                      column="name"
                      sort={sort}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      label="Location"
                      column="municipality"
                      sort={sort}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      label="Category"
                      column="category"
                      sort={sort}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      label="Status"
                      column="status"
                      sort={sort}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      label="Progress"
                      column="progress"
                      sort={sort}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      label="Budget"
                      column="budget"
                      sort={sort}
                      onSort={toggleSort}
                      align="right"
                    />
                    <SortableHeader
                      label="Target completion"
                      column="targetCompletionDate"
                      sort={sort}
                      onSort={toggleSort}
                    />
                    <th scope="col" className="w-20 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((project) => {
                    const isOverdue =
                      project.status !== 'Completed' &&
                      project.targetCompletionDate < todayIsoDate()
                    return (
                      <tr key={project.id}>
                        <td className="max-w-[280px]">
                          <p className="line-clamp-2 text-[13px] leading-5 font-semibold text-ink-950">
                            {project.name}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                            <UserRound
                              className="h-3 w-3 shrink-0"
                              aria-hidden="true"
                            />
                            <span className="truncate">{project.leader}</span>
                          </p>
                        </td>
                        <td>
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                            {project.municipality}
                          </span>
                        </td>
                        <td className="max-w-[190px]">
                          <CategoryBadge category={project.category} />
                        </td>
                        <td>
                          <ProjectStatusBadge status={project.status} />
                        </td>
                        <td>
                          <div className="w-28">
                            <div className="mb-1.5 flex items-center justify-between">
                              <span className="text-xs font-bold text-ink-900">
                                {project.progress}%
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${projectStatusBars[project.status]}`}
                                style={{ width: `${project.progress}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="text-right">
                          <span className="text-xs font-semibold whitespace-nowrap text-slate-700">
                            {formatPeso(project.budget)}
                          </span>
                        </td>
                        <td>
                          <p
                            className={
                              isOverdue
                                ? 'text-xs font-semibold whitespace-nowrap text-rose-600'
                                : 'text-xs whitespace-nowrap text-slate-600'
                            }
                          >
                            {formatDate(project.targetCompletionDate)}
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-400">
                            {isOverdue
                              ? 'Past target date'
                              : project.status === 'Completed'
                                ? 'Delivered'
                                : 'Target date'}
                          </p>
                        </td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => openEditForm(project)}
                              aria-label={`Edit ${project.name}`}
                              title="Edit project"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="icon-btn hover:bg-rose-50 hover:text-rose-600"
                              onClick={() => setDeleteTarget(project)}
                              aria-label={`Delete ${project.name}`}
                              title="Delete project"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 md:hidden">
              {filteredProjects.map((project) => {
                const isOverdue =
                  project.status !== 'Completed' &&
                  project.targetCompletionDate < todayIsoDate()
                return (
                  <article
                    key={project.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm leading-5 font-bold text-ink-950">
                          {project.name}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                          <MapPin className="h-3 w-3" aria-hidden="true" />
                          {project.municipality}
                        </p>
                      </div>
                      <ProjectStatusBadge status={project.status} />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <CategoryBadge category={project.category} />
                    </div>

                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-[11px]">
                        <span className="font-medium text-slate-500">Progress</span>
                        <span className="font-bold text-ink-900">{project.progress}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${projectStatusBars[project.status]}`}
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2.5 text-[11px]">
                      <div>
                        <dt className="text-slate-400">Budget</dt>
                        <dd className="mt-0.5 font-semibold text-slate-700">
                          {formatPeso(project.budget)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-400">Target completion</dt>
                        <dd
                          className={
                            isOverdue
                              ? 'mt-0.5 font-semibold text-rose-600'
                              : 'mt-0.5 font-semibold text-slate-700'
                          }
                        >
                          {formatDate(project.targetCompletionDate)}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-slate-400">Focal person</dt>
                        <dd className="mt-0.5 font-medium text-slate-700">
                          {project.leader}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openEditForm(project)}
                        icon={<Pencil className="h-3.5 w-3.5" aria-hidden="true" />}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(project)}
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        icon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                      >
                        Delete
                      </Button>
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </section>

      {formOpen ? (
        <ProjectFormModal
          project={editingProject}
          onClose={closeForm}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this project?"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” and its progress history will be removed from this device. This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete project"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  )
}

interface SortableHeaderProps {
  label: string
  column: SortKey
  sort: SortState
  onSort: (column: SortKey) => void
  align?: 'left' | 'right'
}

function SortableHeader({
  label,
  column,
  sort,
  onSort,
  align = 'left',
}: SortableHeaderProps) {
  const isActive = sort.key === column
  const Icon = !isActive
    ? ArrowUpDown
    : sort.direction === 'asc'
      ? ArrowUp
      : ArrowDown

  return (
    <th
      scope="col"
      aria-sort={
        isActive
          ? sort.direction === 'asc'
            ? 'ascending'
            : 'descending'
          : 'none'
      }
      className={align === 'right' ? 'text-right' : undefined}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex items-center gap-1.5 rounded font-bold transition hover:text-ink-900 ${
          isActive ? 'text-ink-900' : ''
        } ${align === 'right' ? 'ml-auto' : ''}`}
      >
        {label}
        <Icon
          className={`h-3 w-3 ${isActive ? 'text-brand-600' : 'text-slate-300'}`}
          aria-hidden="true"
        />
      </button>
    </th>
  )
}
