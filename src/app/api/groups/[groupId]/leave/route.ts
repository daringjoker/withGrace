import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ groupId: string }>;
}

// POST /api/groups/[groupId]/leave - Leave a group
export async function POST(
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
      include: {
        group: true,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    // Check if user is the group owner
    if (membership.group.ownerId === user.id) {
      return NextResponse.json({ 
        error: 'Group owners cannot leave their own group. Please transfer ownership first or delete the group.' 
      }, { status: 400 });
    }

    // Remove the user from the group
    await prisma.userGroupMember.delete({
      where: {
        userId_groupId: {
          userId: user.id,
          groupId: groupId,
        },
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully left the group' 
    });
  } catch (error) {
    console.error('Error leaving group:', error);
    return NextResponse.json(
      { error: 'Failed to leave group' },
      { status: 500 }
    );
  }
}