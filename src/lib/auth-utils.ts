import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function ensureUserExists() {
  const user = await currentUser();
  if (!user) {
    return null;
  }

  // Check if user exists in our database
  let dbUser = await prisma.user.findUnique({
    where: { clerkId: user.id },
  });

  // Create user if doesn't exist
  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        clerkId: user.id,
        email: user.emailAddresses[0]?.emailAddress || '',
        name: user.fullName || user.firstName || 'Unknown User',
        imageUrl: user.imageUrl || null,
      },
    });
  } else {
    // Update user info if it has changed
    dbUser = await prisma.user.update({
      where: { clerkId: user.id },
      data: {
        email: user.emailAddresses[0]?.emailAddress || dbUser.email,
        name: user.fullName || user.firstName || dbUser.name,
        imageUrl: user.imageUrl || dbUser.imageUrl,
      },
    });
  }

  return { clerkUser: user, dbUser };
}

export async function getUserWithGroups() {
  const result = await ensureUserExists();
  if (!result) {
    return null;
  }

  const { dbUser } = result;

  // Get user's group memberships
  const memberships = await prisma.userGroupMember.findMany({
    where: { userId: dbUser.id },
    include: {
      group: {
        include: {
          owner: true,
        },
      },
    },
  });

  return {
    ...result,
    memberships,
  };
}