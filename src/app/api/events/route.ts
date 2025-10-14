import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EventType } from '@/types';
import { ensureUserExists } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const authResult = await ensureUserExists();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dbUser } = authResult;

    const body = await request.json();
    const { type, date, time, notes, images, groupId, ...eventData } = body;

    // If no groupId provided, try to get user's first group or create one
    let targetGroupId = groupId;
    if (!targetGroupId) {
      // Find user's first group
      const userMembership = await prisma.userGroupMember.findFirst({
        where: { userId: dbUser.id },
        include: { group: true },
      });

      if (userMembership) {
        targetGroupId = userMembership.groupId;
      } else {
        return NextResponse.json(
          { error: 'No group found. Please set up a group first.' },
          { status: 400 }
        );
      }
    }

    // Check if user has permission to add events to this group
    const membership = await prisma.userGroupMember.findUnique({
      where: {
        userId_groupId: {
          userId: dbUser.id,
          groupId: targetGroupId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'You do not have access to this group' },
        { status: 403 }
      );
    }

    if (!membership.canAdd) {
      return NextResponse.json(
        { error: 'You do not have permission to add events to this group' },
        { status: 403 }
      );
    }

    // Create the base event
    const babyEvent = await prisma.babyEvent.create({
      data: {
        date: new Date(date),
        time,
        type,
        notes,
        groupId: targetGroupId,
      },
    });

    // Create event-specific data based on type
    switch (type) {
      case EventType.FEEDING:
        await prisma.feedingEvent.create({
          data: {
            eventId: babyEvent.id,
            feedingType: eventData.feedingType,
            amount: eventData.amount || null,
            duration: eventData.duration || null,
            side: eventData.side || null,
          },
        });
        break;
        
      case EventType.DIAPER:
        await prisma.diaperEvent.create({
          data: {
            eventId: babyEvent.id,
            wet: eventData.wet,
            dirty: eventData.dirty,
            color: eventData.diaperDetails?.color || null,
            texture: eventData.diaperDetails?.texture || null,
            consistency: eventData.diaperDetails?.consistency || null,
          },
        });
        break;
        
      case EventType.SLEEP:
        await prisma.sleepEvent.create({
          data: {
            eventId: babyEvent.id,
            duration: eventData.duration || null,
            sleepType: eventData.sleepType,
            startTime: eventData.startTime || null,
            endTime: eventData.endTime || null,
          },
        });
        break;
        
      case EventType.OTHER:
        await prisma.otherEvent.create({
          data: {
            eventId: babyEvent.id,
            eventType: eventData.eventType,
            description: eventData.description,
          },
        });
        break;
        
      default:
        throw new Error(`Unknown event type: ${type}`);
    }

    // Create image records if provided
    if (images && images.length > 0) {
      await prisma.eventImage.createMany({
        data: images.map((image: { url: string; key: string; name: string; size: number; caption?: string; tags?: string[]; uploadedAt: string }) => ({
          eventId: babyEvent.id,
          url: image.url,
          uploadthingKey: image.key,
          filename: image.name,
          fileSize: image.size,
          caption: image.caption || null,
          tags: image.tags ? JSON.stringify(image.tags) : null,
          uploadedAt: new Date(image.uploadedAt),
        })),
      });
    }

    // Fetch the complete event with all relations
    const completeEvent = await prisma.babyEvent.findUnique({
      where: { id: babyEvent.id },
      include: {
        feedingEvent: true,
        diaperEvent: true,
        sleepEvent: true,
        otherEvent: true,
        images: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: completeEvent,
    });

  } catch (error) {
    console.error('Error creating event:', error);
    
    // Check for connection pool timeout specifically
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('timed out fetching new connection from connection pool')) {
      console.error('Database connection pool timeout - consider increasing pool size or connection timeout')
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create event',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await ensureUserExists();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dbUser } = authResult;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const groupId = searchParams.get('groupId');

    // Use offset if provided (for virtual scrolling), otherwise use page-based pagination
    const skip = offset > 0 ? offset : (page - 1) * limit;

    // Get user's groups that they have read access to
    const userMemberships = await prisma.userGroupMember.findMany({
      where: {
        userId: dbUser.id,
        canRead: true,
      },
      select: { groupId: true },
    });

    const accessibleGroupIds = userMemberships.map((m: { groupId: string }) => m.groupId);

    if (accessibleGroupIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          events: [],
          totalCount: 0,
          page,
          limit,
          totalPages: 0,
        },
      });
    }

    // Build where clause
    const where: {
      type?: string;
      date?: {
        gte?: Date;
        lte?: Date;
      };
      groupId: {
        in: string[];
      } | string;
    } = {
      groupId: groupId ? groupId : { in: accessibleGroupIds },
    };
    
    // If specific groupId is requested, check user has access
    if (groupId && !accessibleGroupIds.includes(groupId)) {
      return NextResponse.json(
        { error: 'You do not have access to this group' },
        { status: 403 }
      );
    }
    
    if (type) {
      where.type = type;
    }
    
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    // Get events with pagination
    const [events, totalCount] = await Promise.all([
      prisma.babyEvent.findMany({
        where,
        include: {
          feedingEvent: true,
          diaperEvent: true,
          sleepEvent: true,
          otherEvent: true,
          images: true,
        },
        orderBy: [
          { date: 'desc' },
          { time: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.babyEvent.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        events,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    
    // Check for connection pool timeout specifically
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('timed out fetching new connection from connection pool')) {
      console.error('Database connection pool timeout - consider increasing pool size or connection timeout')
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch events',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    )
  }
}