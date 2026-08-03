import { revalidatePath } from 'next/cache';
import { prisma as db } from '@/lib/db';

interface Lane {
  id: string;
  name: string;
  emoji: string;
  isActive: boolean;
  targetPerWeek: number;
}

interface LaneListProps {
  lanes: Lane[];
}

/**
 * Server Action to toggle lane activity.
 * This is defined within the component file as a server action.
 */
async function updateLaneAction(formData: FormData) {
  'use server';
  const laneId = formData.get('laneId') as string;
  const isActive = formData.get('isActive') === 'true';

  if (!laneId) return;

  await db.lane.update({
    where: { id: laneId },
    data: { isActive: !isActive },
  });

  revalidatePath('/');
}

export default function LaneList({ lanes }: LaneListProps) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Lanes</h2>
      <ol className="space-y-4">
        {lanes.map((lane) => (
          <li
            key={lane.id}
            className="flex items-center justify-between p-4 rounded-lg border bg-card text-card-foreground shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">
                {lane.emoji}
              </span>
              <span className="font-medium text-lg">{lane.name}</span>
              {lane.isActive && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  Active
                </span>
              )}
              {!lane.isActive && (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                  Inactive
                </span>
              )}
            </div>

            <form
              action={updateLaneAction}
              className="flex items-center"
            >
              <input
                type="hidden"
                name="laneId"
                value={lane.id}
              />
              <input
                type="hidden"
                name="isActive"
                value={lane.isActive.toString()}
              />
              <button
                type="submit"
                className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                aria-label={`Toggle activity for ${lane.name}`}
              >
                Toggle
              </button>
            </form>
          </li>
        ))}
      </ol>
    </div>
  );
}
