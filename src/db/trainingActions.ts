import type { Training } from '../types'
import { api } from '../services/api'

export async function deleteTrainingWithRoster(
  training: Training,
): Promise<number> {
  const participants = await api.participants.list(training.id)
  const removedParticipants = participants.length

  await Promise.all(
    participants.map((participant) => api.participants.delete(participant.id)),
  )
  await api.trainings.delete(training.id)

  await api.activities.create({
    entityType: 'training',
    entityId: String(training.id),
    action: 'deleted',
    description:
      removedParticipants > 0
        ? `${training.title} and its roster of ${removedParticipants} trainees were deleted.`
        : `${training.title} was deleted.`,
    occurredAt: new Date().toISOString(),
  })

  return removedParticipants
}
