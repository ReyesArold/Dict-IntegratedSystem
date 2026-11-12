import type { ActivityEntity } from '../types'
import { api } from '../services/api'

export async function recordActivity(
  entityType: ActivityEntity,
  action: string,
  description: string,
  entityId?: string,
): Promise<void> {
  await api.activities.create({
    entityType,
    entityId,
    action,
    description,
    occurredAt: new Date().toISOString(),
  })
}
