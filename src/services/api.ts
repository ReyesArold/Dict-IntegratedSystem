// Centralized API client for the shared DICT Abra local network server.
// Relative URLs are used so Vite's dev proxy (and the production server) route
// them to the host machine, letting any device on the LAN share one database.
// Production/Tauri desktop builds point directly at the local Express backend.
const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body = await response.text()
      if (body) message = body
    } catch {
      // ignore
    }
    throw new Error(message)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

import type {
  ActivityLog,
  Participant as ParticipantType,
  Project as ProjectType,
  Schedule as ScheduleType,
  Training as TrainingType,
  Trip as TripType,
} from '../types'

export type Project = ProjectType
export type Training = TrainingType
export type Participant = ParticipantType
export type Trip = TripType
export type Schedule = ScheduleType
export type Activity = ActivityLog

export interface BackupPayload {
  app: string
  version: number
  exportedAt: string
  data: {
    projects: Project[]
    trainings: Training[]
    participants: Participant[]
    trips: Trip[]
    activities: Activity[]
    schedules: Schedule[]
    meta: { key: string; value: string }[]
  }
}

export const api = {
  projects: {
    list: () => request<Project[]>('/api/projects'),
    get: (id: number) => request<Project>(`/api/projects/${id}`),
    create: (payload: Partial<Project>) =>
      request<Project>('/api/projects', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: number, payload: Partial<Project>) =>
      request<Project>(`/api/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    delete: (id: number) =>
      request<void>(`/api/projects/${id}`, { method: 'DELETE' }),
  },
  trainings: {
    list: () => request<Training[]>('/api/trainings'),
    get: (id: number) => request<Training>(`/api/trainings/${id}`),
    create: (payload: Partial<Training>) =>
      request<Training>('/api/trainings', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: number, payload: Partial<Training>) =>
      request<Training>(`/api/trainings/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    delete: (id: number) =>
      request<void>(`/api/trainings/${id}`, { method: 'DELETE' }),
  },
  participants: {
    list: (trainingId?: number) =>
      request<Participant[]>(
        trainingId != null
          ? `/api/participants?trainingId=${trainingId}`
          : '/api/participants',
      ),
    create: (payload: Partial<Participant>) =>
      request<Participant>('/api/participants', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: number, payload: Partial<Participant>) =>
      request<Participant>(`/api/participants/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    delete: (id: number) =>
      request<void>(`/api/participants/${id}`, { method: 'DELETE' }),
  },
  trips: {
    list: () => request<Trip[]>('/api/trips'),
    get: (id: number) => request<Trip>(`/api/trips/${id}`),
    create: (payload: Partial<Trip>) =>
      request<Trip>('/api/trips', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: number, payload: Partial<Trip>) =>
      request<Trip>(`/api/trips/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    delete: (id: number) =>
      request<void>(`/api/trips/${id}`, { method: 'DELETE' }),
  },
  schedules: {
    list: () => request<Schedule[]>('/api/schedules'),
    get: (id: number) => request<Schedule>(`/api/schedules/${id}`),
    create: (payload: Partial<Schedule>) =>
      request<Schedule>('/api/schedules', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: number, payload: Partial<Schedule>) =>
      request<Schedule>(`/api/schedules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    delete: (id: number) =>
      request<void>(`/api/schedules/${id}`, { method: 'DELETE' }),
  },
  activities: {
    list: (limit = 50) =>
      request<Activity[]>(`/api/activities?limit=${limit}`),
    create: (payload: Partial<Activity>) =>
      request<Activity>('/api/activities', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },
  meta: {
    get: (key: string) => request<{ key: string; value: string | null }>(`/api/meta/${key}`),
    set: (key: string, value: string) =>
      request<{ key: string; value: string }>(`/api/meta/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ value }),
      }),
  },
  backup: () => request<BackupPayload>('/api/backup'),
  restore: (payload: BackupPayload) =>
    request<{ ok: boolean }>('/api/restore', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  seed: () => request<{ ok: boolean }>('/api/seed', { method: 'POST' }),
  clear: () => request<{ ok: boolean }>('/api/clear', { method: 'POST' }),
}
