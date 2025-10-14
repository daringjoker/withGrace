import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ groupId: string }>;
}

// GET /api/groups/[groupId]/members - Get all members of a group
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { groupId } = await params;

    // Check if user is a member of this group
    const membership = await prisma.userGroupMember.findUnique({
      where: {
        userId_groupId: {
          userId: user.id,
          groupId: groupId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    // Get all group members with user details
    const members = await prisma.userGroupMember.findMany({
      where: {
        groupId: groupId,
      },
      include: {
        user: {
          select: {
            id: true,
            clerkId: true,
            email: true,
            name: true,
            imageUrl: true,
          },
        },
        group: {
          select: {
            ownerId: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    // Transform the response to include ownership info
    const membersWithOwnership = members.map(member => ({
      id: member.id,
      userId: member.userId,
      role: member.role,
      permissions: {
        canRead: member.canRead,
        canAdd: member.canAdd,
        canEdit: member.canEdit,
        canDelete: member.canDelete,
        canShare: member.canShare,
      },
      joinedAt: member.joinedAt,
      isOwner: member.group.ownerId === member.userId,
      user: member.user,
    }));

    return NextResponse.json(membersWithOwnership);
  } catch (error) {
    console.error('Error fetching group members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch group members' },
      { status: 500 }
    );
  }
}

// PUT /api/groups/[groupId]/members - Update member permissions/role
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { groupId } = await params;
    const { memberId, role, permissions } = await request.json();

    // Check if user is the group owner or has admin permissions
    const requestingMember = await prisma.userGroupMember.findUnique({
      where: {
        userId_groupId: {
          userId: user.id,
          groupId: groupId,
        },
      },
      include: {
        group: true,
      },
    });

    if (!requestingMember) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    const isOwner = requestingMember.group.ownerId === user.id;
    const isAdmin = requestingMember.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Update member permissions
    const updatedMember = await prisma.userGroupMember.update({
      where: {
        id: memberId,
        groupId: groupId, // Ensure member belongs to this group
      },
      data: {
        role,
        canRead: permissions.canRead,
        canAdd: permissions.canAdd,
        canEdit: permissions.canEdit,
        canDelete: permissions.canDelete,
        canShare: permissions.canShare,
      },
      include: {
        user: {
          select: {
            id: true,
            clerkId: true,
            email: true,
            name: true,
            imageUrl: true,
          },
        },
      },
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error('Error updating member:', error);
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    );
  }
}

// DELETE /api/groups/[groupId]/members - Remove member from group
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { groupId } = await params;
    const { memberId } = await request.json();

    // Check if user is the group owner or has admin permissions
    const requestingMember = await prisma.userGroupMember.findUnique({
      where: {
        userId_groupId: {
          userId: user.id,
          groupId: groupId,
        },
      },
      include: {
        group: true,
      },
    });

    if (!requestingMember) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    const isOwner = requestingMember.group.ownerId === user.id;
    const isAdmin = requestingMember.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get the member to be removed
    const memberToRemove = await prisma.userGroupMember.findUnique({
      where: {
        id: memberId,
        groupId: groupId,
      },
    });

    if (!memberToRemove) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Prevent removing the group owner
    if (requestingMember.group.ownerId === memberToRemove.userId) {
      return NextResponse.json({ error: 'Cannot remove group owner' }, { status: 400 });
    }

    // Remove the member
    await prisma.userGroupMember.delete({
      where: {
        id: memberId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}