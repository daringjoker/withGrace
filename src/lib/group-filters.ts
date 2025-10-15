import { auth } from '@clerk/nextjs/server'
import { prisma } from './prisma'

interface GroupFilter {
  groupId?: string | { in: string[] };
}

/**
 * Gets the appropriate group filter for database queries.
 * Ensures consistent filtering logic across all API endpoints.
 * 
 * @param requestedGroupId - The groupId from the request query params
 * @param accessibleGroupIds - Array of group IDs the user has access to
 * @returns Prisma-compatible groupId filter object
 */
export function getGroupFilter(
  requestedGroupId: string | null | undefined,
  accessibleGroupIds: string[]
): GroupFilter {
  if (requestedGroupId && accessibleGroupIds.includes(requestedGroupId)) {
    // User requested a specific group they have access to
    return { groupId: requestedGroupId };
  } else {
    // No specific group requested or requested group not accessible
    // Return data from all accessible groups
    return { groupId: { in: accessibleGroupIds } };
  }
}

/**
 * Gets user's accessible groups from the database.
 * This is a helper to standardize group access checking.
 */
export async function getUserAccessibleGroups(): Promise<string[]> {
  const { userId } = await auth();
  if (!userId) return [];

  const groups = await prisma.group.findMany({
    where: {
      members: {
        some: { userId }
      }
    },
    select: { id: true }
  });

  return groups.map((group: { id: string }) => group.id);
}

/**
 * Complete group filtering utility that handles auth and returns the filter.
 * Use this in API routes for consistent group-based data filtering.
 */
export async function getAuthenticatedGroupFilter(
  requestedGroupId?: string | null
): Promise<{ filter: GroupFilter; accessibleGroups: string[] } | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const accessibleGroupIds = await getUserAccessibleGroups();
  const filter = getGroupFilter(requestedGroupId, accessibleGroupIds);

  return {
    filter,
    accessibleGroups: accessibleGroupIds
  };
}