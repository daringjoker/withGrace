import { BabyEvent, BabyEventWithRelations, EventType } from '@/types/baby-events';

// Compatibility interface to match what the timeline expects
export interface TimelineEvent {
  id: string;
  type: string;
  time: string;
  date: string;
  notes?: string;
  feedingEvent?: {
    feedingType: string;
    amount?: number;
    duration?: number;
    side?: string;
    startTime?: string;
    endTime?: string;
  };
  diaperEvent?: {
    wet: number;
    dirty: number;
    color?: string;
    texture?: string;
  };
  sleepEvent?: {
    sleepType: string;
    duration?: number;
    startTime?: string;
    endTime?: string;
  };
  otherEvent?: {
    eventType: string;
    description: string;
  };
  images?: {
    url: string;
    filename: string;
  }[];
  createdAt?: string;
  updatedAt?: string;
}

// Convert BabyEvent to TimelineEvent for compatibility
export function convertToTimelineEvent(babyEvent: BabyEventWithRelations): TimelineEvent {
  const base: TimelineEvent = {
    id: babyEvent.id,
    type: babyEvent.type,
    time: babyEvent.time,
    date: babyEvent.date,
    notes: babyEvent.notes,
    createdAt: babyEvent.createdAt,
    updatedAt: babyEvent.updatedAt,
  };

  // Convert images format
  if (babyEvent.images) {
    base.images = babyEvent.images.map((img: any) => ({
      url: img.url,
      filename: img.filename || img.name || 'image', // Use filename from Prisma, fallback to name
    }));
  }

  // Handle different event types by checking the type and casting
  switch (babyEvent.type) {
    case EventType.FEEDING:
      // Use nested structure (from Prisma relations)
      if (babyEvent.feedingEvent) {
        base.feedingEvent = {
          feedingType: babyEvent.feedingEvent.feedingType,
          amount: babyEvent.feedingEvent.amount,
          duration: babyEvent.feedingEvent.duration,
          side: babyEvent.feedingEvent.side,
        };
      }
      break;

    case EventType.DIAPER:
      // Use nested structure (from Prisma relations)
      if (babyEvent.diaperEvent) {
        base.diaperEvent = {
          wet: babyEvent.diaperEvent.wet,
          dirty: babyEvent.diaperEvent.dirty,
          color: babyEvent.diaperEvent.color,
          texture: babyEvent.diaperEvent.texture,
        };
      }
      break;

    case EventType.SLEEP:
      // Use nested structure (from Prisma relations)
      if (babyEvent.sleepEvent) {
        base.sleepEvent = {
          sleepType: babyEvent.sleepEvent.sleepType,
          duration: babyEvent.sleepEvent.duration,
          startTime: babyEvent.sleepEvent.startTime,
          endTime: babyEvent.sleepEvent.endTime,
        };
      }
      break;

    case EventType.OTHER:
      // Use nested structure (from Prisma relations)
      if (babyEvent.otherEvent) {
        base.otherEvent = {
          eventType: babyEvent.otherEvent.eventType,
          description: babyEvent.otherEvent.description,
        };
      }
      break;
  }

  return base;
}

// Convert array of BabyEvents to TimelineEvents with memoization
export function convertToTimelineEvents(babyEvents: BabyEventWithRelations[]): TimelineEvent[] {
  // Return empty array if no events to prevent unnecessary processing
  if (!babyEvents || babyEvents.length === 0) {
    return [];
  }
  
  return babyEvents.map(convertToTimelineEvent);
}