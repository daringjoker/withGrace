/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { ensureUserExists } from '@/lib/auth-utils'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    // Ensure user is authenticated
    const authResult = await ensureUserExists();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dbUser } = authResult;
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    const groupId = searchParams.get('groupId')
    
    const endDate = new Date()
    const startDate = subDays(endDate, days - 1)

    // Get user's accessible groups (same logic as events API)
    const userMemberships = await prisma.userGroupMember.findMany({
      where: {
        userId: dbUser.id,
        canRead: true,
      },
      select: { groupId: true },
    });

    const accessibleGroups = userMemberships.map((m: { groupId: string }) => m.groupId);

    if (accessibleGroups.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          dailyStats: [],
          averages: { feedingsPerDay: 0, amountPerDay: 0, diapersPerDay: 0, sleepPerDay: 0 },
          period: {
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd'),
            days,
          },
        },
      });
    }

    // Check access if specific groupId requested
    if (groupId && !accessibleGroups.includes(groupId)) {
      return NextResponse.json(
        { error: 'You do not have access to this group' },
        { status: 403 }
      );
    }

    // Build group filter using consistent logic (same as events API)
    const groupFilter: string | { in: string[] } = groupId && accessibleGroups.includes(groupId) 
      ? groupId 
      : { in: accessibleGroups };

    // Debug logging (can remove later)
    console.log('Stats API - Consistent group filter logic - groupId:', groupId, 'filter:', groupFilter);

    const events = await prisma.babyEvent.findMany({
      where: {
        date: {
          gte: startOfDay(startDate),
          lte: endOfDay(endDate),
        },
        groupId: groupFilter,
      },
      include: {
        feedingEvent: true,
        diaperEvent: true,
        sleepEvent: true,
      },
      orderBy: [
        { date: 'asc' },
        { time: 'asc' },
      ],
    })

    const dailyStats = []
    
    for (let i = 0; i < days; i++) {
      const currentDate = subDays(endDate, days - 1 - i)
      const dateStr = format(currentDate, 'yyyy-MM-dd')
      
      const dayEvents = events.filter((event: any) => 
        format(new Date(event.date), 'yyyy-MM-dd') === dateStr
      )

      const feedingEvents = dayEvents.filter((e: any) => e.type === 'feeding')
      const diaperEvents = dayEvents.filter((e: any) => e.type === 'diaper')
      const sleepEvents = dayEvents.filter((e: any) => e.type === 'sleep')

      const totalAmount = feedingEvents.reduce((sum: number, event: any) => {
        return sum + (event.feedingEvent?.amount || 0)
      }, 0)

      const totalFeedingDuration = feedingEvents.reduce((sum: number, event: any) => {
        return sum + (event.feedingEvent?.duration || 0)
      }, 0)

      const totalWetDiapers = diaperEvents.reduce((sum: number, event: any) => {
        return sum + (event.diaperEvent?.wet || 0)
      }, 0)

      const totalDirtyDiapers = diaperEvents.reduce((sum: number, event: any) => {
        return sum + (event.diaperEvent?.dirty || 0)
      }, 0)

      const totalSleep = sleepEvents.reduce((sum: number, event: any) => {
        return sum + (event.sleepEvent?.duration || 0)
      }, 0)

      dailyStats.push({
        date: dateStr,
        totalFeedings: feedingEvents.length,
        totalAmount: totalAmount > 0 ? totalAmount : undefined,
        totalFeedingDuration: totalFeedingDuration > 0 ? totalFeedingDuration : undefined,
        totalDiapers: totalWetDiapers + totalDirtyDiapers,
        wetDiapers: totalWetDiapers,
        dirtyDiapers: totalDirtyDiapers,
        totalSleep: totalSleep > 0 ? totalSleep : undefined,
        totalEvents: dayEvents.length,
      })
    }

    const totalDays = dailyStats.filter(day => day.totalEvents > 0).length
    const averages = totalDays > 0 ? {
      feedingsPerDay: Math.round(
        dailyStats.reduce((sum, day) => sum + day.totalFeedings, 0) / totalDays * 10
      ) / 10,
      amountPerDay: Math.round(
        dailyStats.reduce((sum, day) => sum + (day.totalAmount || 0), 0) / totalDays * 10
      ) / 10,
      diapersPerDay: Math.round(
        dailyStats.reduce((sum, day) => sum + day.totalDiapers, 0) / totalDays * 10
      ) / 10,
      sleepPerDay: Math.round(
        dailyStats.reduce((sum, day) => sum + (day.totalSleep || 0), 0) / totalDays * 10
      ) / 10,
    } : {
      feedingsPerDay: 0,
      amountPerDay: 0,
      diapersPerDay: 0,
      sleepPerDay: 0,
    }

    return NextResponse.json({
      success: true,
      data: {
        dailyStats,
        averages,
        period: {
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          days,
        },
      },
    })

  } catch (error) {
    console.error('Error fetching stats:', error)
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('timed out fetching new connection from connection pool')) {
      console.error('Database connection pool timeout - consider increasing pool size or connection timeout')
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch statistics',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    )
  }
}