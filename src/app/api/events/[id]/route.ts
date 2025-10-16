import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureUserExists } from '@/lib/auth-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await ensureUserExists()
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { dbUser } = authResult
    const { id: eventId } = await params

    const event = await prisma.babyEvent.findUnique({
      where: { id: eventId },
      include: {
        images: true,
        feedingEvent: true,
        diaperEvent: true,
        sleepEvent: true,
        otherEvent: true,
        group: true,
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if user has access to this group
    const membership = await prisma.userGroupMember.findUnique({
      where: {
        userId_groupId: {
          userId: dbUser.id,
          groupId: event.groupId,
        },
      },
    })

    if (!membership || !membership.canRead) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error('Error fetching event:', error)
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('timed out fetching new connection from connection pool')) {
      console.error('Database connection pool timeout - consider increasing pool size or connection timeout')
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch event',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await ensureUserExists()
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { dbUser } = authResult
    const { id: eventId } = await params
    const body = await request.json()
    const { type, timestamp, date, time, notes, images, ...eventData } = body

    // Get existing event first to avoid duplicate queries
    const existingEvent = await prisma.babyEvent.findUnique({
      where: { id: eventId },
      include: {
        feedingEvent: true,
        diaperEvent: true,
        sleepEvent: true,
        otherEvent: true,
        group: true,
      },
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if user has permission to edit events in this group
    const membership = await prisma.userGroupMember.findUnique({
      where: {
        userId_groupId: {
          userId: dbUser.id,
          groupId: existingEvent.groupId,
        },
      },
    })

    if (!membership || !membership.canEdit) {
      return NextResponse.json({ error: 'You do not have permission to edit events in this group' }, { status: 403 })
    }

    // Create timestamp from date and time if provided separately (from forms)
    let finalTimestamp: Date
    
    if (timestamp) {
      finalTimestamp = new Date(timestamp)
    } else if (date && time) {
      // Create timestamp in local timezone, not UTC
      finalTimestamp = new Date(`${date}T${time}:00`)
    } else {
      // Preserve existing date and time when editing other fields
      const existingDate = existingEvent.date.toISOString().split('T')[0]
      finalTimestamp = new Date(`${existingDate}T${existingEvent.time}:00`)
    }

    // Validate timestamp
    if (isNaN(finalTimestamp.getTime())) {
      return NextResponse.json({ error: 'Invalid timestamp provided' }, { status: 400 })
    }

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Log the incoming data for debugging
    console.log('UPDATE EVENT - eventId:', eventId)
    console.log('UPDATE EVENT - type:', type)
    console.log('UPDATE EVENT - eventData:', JSON.stringify(eventData, null, 2))
    console.log('UPDATE EVENT - finalTimestamp:', finalTimestamp)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(async (tx: any) => {
      // Update base event - need to update both date and time fields
      const event = await tx.babyEvent.update({
        where: { id: eventId },
        data: {
          date: finalTimestamp,
          time: finalTimestamp.toTimeString().slice(0, 5), // HH:mm format
          notes,
        },
      })

      // Update type-specific event data
      if (type === 'feeding' && eventData) {
        if (existingEvent.feedingEvent) {
          await tx.feedingEvent.update({
            where: { eventId },
            data: {
              feedingType: eventData.feedingType,
              amount: eventData.amount,
              duration: eventData.duration,
              side: eventData.side,
            },
          })
        } else {
          await tx.feedingEvent.create({
            data: {
              eventId,
              feedingType: eventData.feedingType,
              amount: eventData.amount,
              duration: eventData.duration,
              side: eventData.side,
            },
          })
        }
      } else if (type === 'diaper' && eventData) {
        if (existingEvent.diaperEvent) {
          await tx.diaperEvent.update({
            where: { eventId },
            data: {
              wet: eventData.wet || 0,
              dirty: eventData.dirty || 0,
              consistency: eventData.diaperDetails?.consistency,
              color: eventData.diaperDetails?.color,
              texture: eventData.diaperDetails?.texture,
            },
          })
        } else {
          await tx.diaperEvent.create({
            data: {
              eventId,
              wet: eventData.wet || 0,
              dirty: eventData.dirty || 0,
              consistency: eventData.diaperDetails?.consistency,
              color: eventData.diaperDetails?.color,
              texture: eventData.diaperDetails?.texture,
            },
          })
        }
      } else if (type === 'sleep' && eventData) {
        if (existingEvent.sleepEvent) {
          await tx.sleepEvent.update({
            where: { eventId },
            data: {
              startTime: eventData.startTime,
              endTime: eventData.endTime,
              duration: eventData.duration,
              sleepType: eventData.sleepType,
            },
          })
        } else {
          await tx.sleepEvent.create({
            data: {
              eventId,
              startTime: eventData.startTime,
              endTime: eventData.endTime,
              duration: eventData.duration,
              sleepType: eventData.sleepType,
            },
          })
        }
      } else if (type === 'other' && eventData) {
        if (existingEvent.otherEvent) {
          await tx.otherEvent.update({
            where: { eventId },
            data: {
              eventType: eventData.eventType,
              description: eventData.description,
            },
          })
        } else {
          await tx.otherEvent.create({
            data: {
              eventId,
              eventType: eventData.eventType,
              description: eventData.description,
            },
          })
        }
      }

      // Handle image updates if provided
      if (images && Array.isArray(images)) {
        // Delete existing images not in the new list
        const existingImages = await tx.eventImage.findMany({
          where: { eventId },
        })
        
        const newImageUrls = images.map((img: any) => img.url)
        const imagesToDelete = existingImages.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (img: any) => !newImageUrls.includes(img.url)
        )
        
        if (imagesToDelete.length > 0) {
          await tx.eventImage.deleteMany({
            where: {
              id: { in: imagesToDelete.map((img: any) => img.id) },
            },
          })
        }

        // Add new images
        for (const image of images) {
          const existingImage = existingImages.find((img: any) => img.url === image.url)
          if (!existingImage) {
            await tx.eventImage.create({
              data: {
                eventId,
                url: image.url,
                uploadthingKey: image.key,
                filename: image.name,
                fileSize: image.size || 0,
              },
            })
          }
        }
      }

      return event
    })

    const completeEvent = await prisma.babyEvent.findUnique({
      where: { id: eventId },
      include: {
        images: true,
        feedingEvent: true,
        diaperEvent: true,
        sleepEvent: true,
        otherEvent: true,
      },
    })

    return NextResponse.json(completeEvent)
  } catch (error) {
    console.error('Error updating event:', error)
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('timed out fetching new connection from connection pool')) {
      console.error('Database connection pool timeout - consider increasing pool size or connection timeout')
    }
    
    return NextResponse.json({ 
      error: 'Failed to update event',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await ensureUserExists()
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { dbUser } = authResult
    const { id: eventId } = await params

    const existingEvent = await prisma.babyEvent.findUnique({
      where: { id: eventId },
      include: { group: true },
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if user has permission to delete events in this group
    const membership = await prisma.userGroupMember.findUnique({
      where: {
        userId_groupId: {
          userId: dbUser.id,
          groupId: existingEvent.groupId,
        },
      },
    })

    if (!membership || !membership.canDelete) {
      return NextResponse.json({ error: 'You do not have permission to delete events in this group' }, { status: 403 })
    }

    await prisma.babyEvent.delete({
      where: { id: eventId },
    })

    return NextResponse.json({ message: 'Event deleted successfully' })
  } catch (error) {
    console.error('Error deleting event:', error)
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('timed out fetching new connection from connection pool')) {
      console.error('Database connection pool timeout - consider increasing pool size or connection timeout')
    }
    
    return NextResponse.json({ 
      error: 'Failed to delete event',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    }, { status: 500 })
  }
}