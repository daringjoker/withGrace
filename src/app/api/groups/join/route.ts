import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { inviteCode } = body;

    if (!inviteCode?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Invite code is required' },
        { status: 400 }
      );
    }

    // For demo purposes, we'll use a simple invite code system
    // In production, you'd want to store invite codes securely
    // For now, let's assume invite codes are group IDs
    
    // Find the group (this is simplified - in real app, you'd have proper invite code system)
    const group = await prisma.userGroup.findFirst({
      where: {
        OR: [
          { id: inviteCode.trim() },
          // You could add more conditions here for actual invite codes
        ]
      }
    });

    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Invalid invite code' },
        { status: 400 }
      );
    }

    // Ensure user exists in our database
    let user = await prisma.user.findUnique({
      where: { clerkId: userId }
    });

    if (!user) {
      // Create user if doesn't exist
      const userResponse = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        },
      });
      
      if (userResponse.ok) {
        const clerkUser = await userResponse.json();
        user = await prisma.user.create({
          data: {
            clerkId: userId,
            email: clerkUser.email_addresses[0]?.email_address || '',
            name: `${clerkUser.first_name || ''} ${clerkUser.last_name || ''}`.trim() || null,
            imageUrl: clerkUser.image_url || null,
          }
        });
      } else {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch user data' },
          { status: 500 }
        );
      }
    }

    // Check if user is already a member
    const existingMember = await prisma.userGroupMember.findUnique({
      where: {
        userId_groupId: {
          userId: user.id,
          groupId: group.id,
        }
      }
    });

    if (existingMember) {
      return NextResponse.json(
        { success: false, error: 'You are already a member of this group' },
        { status: 400 }
      );
    }

    // Add user to group with viewer permissions by default
    const membership = await prisma.userGroupMember.create({
      data: {
        userId: user.id,
        groupId: group.id,
        role: 'viewer',
        canRead: true,
        canAdd: false,
        canEdit: false,
        canDelete: false,
        canShare: false,
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        membership: {
          groupId: group.id,
          groupName: group.name,
          role: membership.role,
        }
      }
    });

  } catch (error) {
    console.error('Error joining group:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to join group' },
      { status: 500 }
    );
  }
}