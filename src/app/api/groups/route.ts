import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { ensureUserExists } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const authResult = await ensureUserExists();
    
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { dbUser } = authResult;
    const body = await request.json();
    const { name, description } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Group name is required' },
        { status: 400 }
      );
    }

    // Generate invite code
    const inviteCode = randomBytes(8).toString('hex').toUpperCase();

    // Create the group
    const group = await prisma.userGroup.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        ownerId: dbUser.id,
      }
    });

    // Add creator as admin member
    await prisma.userGroupMember.create({
      data: {
        userId: dbUser.id,
        groupId: group.id,
        role: 'admin',
        canRead: true,
        canAdd: true,
        canEdit: true,
        canDelete: true,
        canShare: true,
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        group: {
          id: group.id,
          name: group.name,
          description: group.description,
          inviteCode: inviteCode, // In real app, store this securely
        }
      }
    });

  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create group' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await ensureUserExists();
    
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { dbUser } = authResult;

    // Get user's groups
    const memberships = await prisma.userGroupMember.findMany({
      where: { userId: dbUser.id },
      include: {
        group: {
          include: {
            owner: true,
            _count: {
              select: { members: true, events: true }
            }
          }
        }
      }
    });

    const groups = memberships.map((membership: any) => ({
      id: membership.group.id,
      name: membership.group.name,
      description: membership.group.description,
      role: membership.role,
      permissions: {
        canRead: membership.canRead,
        canAdd: membership.canAdd,
        canEdit: membership.canEdit,
        canDelete: membership.canDelete,
        canShare: membership.canShare,
      },
      owner: {
        id: membership.group.owner.id,
        name: membership.group.owner.name,
      },
      stats: {
        memberCount: membership.group._count.members,
        eventCount: membership.group._count.events,
      },
      joinedAt: membership.joinedAt,
    }));

    return NextResponse.json({
      success: true,
      data: { groups }
    });

  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch groups' },
      { status: 500 }
    );
  }
}