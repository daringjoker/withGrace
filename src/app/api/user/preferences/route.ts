import { NextRequest, NextResponse } from 'next/server';
import { ensureUserExists } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

// Debug: Log prisma client availability
console.log('Prisma client loaded:', !!prisma, typeof prisma);

// GET /api/user/preferences - Get user preferences including active group
export async function GET(request: NextRequest) {
  try {
    const authResult = await ensureUserExists();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { dbUser } = authResult;

    // Debug: Check if prisma client is available
    if (!prisma) {
      console.error('Prisma client is undefined');
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    console.log('Fetching preferences for user:', dbUser.id);

    // Get user preferences with active group data
    let preferences = await prisma.userPreferences.findUnique({
      where: { userId: dbUser.id },
      include: {
        activeGroup: {
          include: {
            owner: {
              select: { id: true, name: true }
            },
            members: {
              where: { userId: dbUser.id },
              select: {
                role: true,
                canRead: true,
                canAdd: true,
                canEdit: true,
                canDelete: true,
                canShare: true,
                joinedAt: true
              }
            },
            _count: {
              select: {
                members: true,
                events: true
              }
            }
          }
        }
      }
    });

    // If no preferences exist, create them
    if (!preferences) {
      preferences = await prisma.userPreferences.create({
        data: {
          userId: dbUser.id,
          activeGroupId: null
        },
        include: {
          activeGroup: {
            include: {
              owner: {
                select: { id: true, name: true }
              },
              members: {
                where: { userId: dbUser.id },
                select: {
                  role: true,
                  canRead: true,
                  canEdit: true,
                  canDelete: true,
                  canShare: true,
                  joinedAt: true
                }
              },
              _count: {
                select: {
                  members: true,
                  events: true
                }
              }
            }
          }
        }
      });
    }

    // If no active group is set, find the most recently created group the user is a member of
    if (!preferences.activeGroupId) {
      const mostRecentGroup = await prisma.userGroup.findFirst({
        where: {
          members: {
            some: { userId: dbUser.id }
          }
        },
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: { id: true, name: true }
          },
          members: {
            where: { userId: dbUser.id },
            select: {
              role: true,
              canRead: true,
              canAdd: true,
              canEdit: true,
              canDelete: true,
              canShare: true,
              joinedAt: true
            }
          },
          _count: {
            select: {
              members: true,
              events: true
            }
          }
        }
      });

      if (mostRecentGroup) {
        // Update preferences with the most recent group
        preferences = await prisma.userPreferences.update({
          where: { userId: dbUser.id },
          data: { activeGroupId: mostRecentGroup.id },
          include: {
            activeGroup: {
              include: {
                owner: {
                  select: { id: true, name: true }
                },
                members: {
                  where: { userId: dbUser.id },
                  select: {
                    role: true,
                    canRead: true,
                    canAdd: true,
                    canEdit: true,
                    canDelete: true,
                    canShare: true,
                    joinedAt: true
                  }
                },
                _count: {
                  select: {
                    members: true,
                    events: true
                  }
                }
              }
            }
          }
        });
      }
    }

    // Transform the data to match the expected format
    const activeGroup = preferences.activeGroup ? {
      id: preferences.activeGroup.id,
      name: preferences.activeGroup.name,
      description: preferences.activeGroup.description || '',
      role: preferences.activeGroup.members[0]?.role || 'viewer',
      permissions: {
        canRead: preferences.activeGroup.members[0]?.canRead || false,
        canAdd: preferences.activeGroup.members[0]?.canAdd || false,
        canEdit: preferences.activeGroup.members[0]?.canEdit || false,
        canDelete: preferences.activeGroup.members[0]?.canDelete || false,
        canShare: preferences.activeGroup.members[0]?.canShare || false,
      },
      owner: preferences.activeGroup.owner,
      stats: {
        memberCount: preferences.activeGroup._count.members,
        eventCount: preferences.activeGroup._count.events
      },
      joinedAt: preferences.activeGroup.members[0]?.joinedAt || preferences.activeGroup.createdAt
    } : null;

    return NextResponse.json({
      success: true,
      data: {
        activeGroup,
        preferences: {
          id: preferences.id,
          activeGroupId: preferences.activeGroupId,
          createdAt: preferences.createdAt,
          updatedAt: preferences.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user preferences' },
      { status: 500 }
    );
  }
}

// PUT /api/user/preferences - Update user preferences (e.g., active group)
export async function PUT(request: NextRequest) {
  try {
    const authResult = await ensureUserExists();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dbUser } = authResult;
    const body = await request.json();
    const { activeGroupId } = body;

    // Validate that the user is a member of the group they want to set as active
    if (activeGroupId) {
      const membership = await prisma.userGroupMember.findUnique({
        where: {
          userId_groupId: {
            userId: dbUser.id,
            groupId: activeGroupId
          }
        }
      });

      if (!membership) {
        return NextResponse.json(
          { error: 'You are not a member of this group' },
          { status: 403 }
        );
      }
    }

    // Update or create user preferences
    const preferences = await prisma.userPreferences.upsert({
      where: { userId: dbUser.id },
      update: {
        activeGroupId: activeGroupId || null,
        updatedAt: new Date()
      },
      create: {
        userId: dbUser.id,
        activeGroupId: activeGroupId || null
      },
      include: {
        activeGroup: {
          include: {
            owner: {
              select: { id: true, name: true }
            },
            members: {
              where: { userId: dbUser.id },
              select: {
                role: true,
                canRead: true,
                canAdd: true,
                canEdit: true,
                canDelete: true,
                canShare: true,
                joinedAt: true
              }
            },
            _count: {
              select: {
                members: true,
                events: true
              }
            }
          }
        }
      }
    });

    // Transform the response data
    const activeGroup = preferences.activeGroup ? {
      id: preferences.activeGroup.id,
      name: preferences.activeGroup.name,
      description: preferences.activeGroup.description || '',
      role: preferences.activeGroup.members[0]?.role || 'viewer',
      permissions: {
        canRead: preferences.activeGroup.members[0]?.canRead || false,
        canAdd: preferences.activeGroup.members[0]?.canAdd || false,
        canEdit: preferences.activeGroup.members[0]?.canEdit || false,
        canDelete: preferences.activeGroup.members[0]?.canDelete || false,
        canShare: preferences.activeGroup.members[0]?.canShare || false,
      },
      owner: preferences.activeGroup.owner,
      stats: {
        memberCount: preferences.activeGroup._count.members,
        eventCount: preferences.activeGroup._count.events
      },
      joinedAt: preferences.activeGroup.members[0]?.joinedAt || preferences.activeGroup.createdAt
    } : null;

    return NextResponse.json({
      success: true,
      data: {
        activeGroup,
        preferences: {
          id: preferences.id,
          activeGroupId: preferences.activeGroupId,
          createdAt: preferences.createdAt,
          updatedAt: preferences.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update user preferences' },
      { status: 500 }
    );
  }
}