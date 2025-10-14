// Base types and enums
export enum EventType {
  FEEDING = 'feeding',
  DIAPER = 'diaper',
  SLEEP = 'sleep',
  OTHER = 'other'
}

export enum FeedingType {
  BREASTFED = 'breastfed',
  EXPRESSED_BREAST_MILK = 'expressed_breast_milk',
  FORMULA = 'formula',
  MIXED = 'mixed'
}

export enum SleepType {
  NAP = 'nap',
  NIGHT_SLEEP = 'night_sleep',
  LONG_NAP = 'long_nap'
}

export enum OtherEventType {
  MASSAGE = 'massage',
  BATH = 'bath',
  DOCTOR_VISIT = 'doctor_visit',
  SYMPTOM = 'symptom',
  MILESTONE = 'milestone'
}

// Image data structure
export interface ImageData {
  id: string;
  url: string; // UploadThing URL
  key: string; // UploadThing file key for deletion
  name: string; // Original filename
  size: number; // File size in bytes
  uploadedAt: string; // ISO timestamp
  caption?: string;
  tags?: string[]; // For categorization
}

// Base event interface
export interface BabyEvent {
  id: string;
  date: string; // ISO date (YYYY-MM-DD)
  time: string; // HH:mm format
  type: EventType;
  notes?: string;
  images?: ImageData[]; // URLs stored in database
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

// Feeding event
export interface FeedingEvent extends BabyEvent {
  type: EventType.FEEDING;
  feedingType: FeedingType;
  amount?: number; // ml for bottles
  duration?: number; // minutes for breastfeeding
  side?: 'left' | 'right' | 'both'; // for breastfeeding
}

// Diaper event
export interface DiaperEvent extends BabyEvent {
  type: EventType.DIAPER;
  wet: number; // number of wet diapers
  dirty: number; // number of dirty diapers
  diaperDetails?: {
    color?: string;
    texture?: string;
    consistency?: string;
  };
}

// Sleep event
export interface SleepEvent extends BabyEvent {
  type: EventType.SLEEP;
  duration?: number; // minutes
  sleepType: SleepType;
  startTime?: string; // HH:mm format
  endTime?: string; // HH:mm format
}

// Other events (massage, bath, etc.)
export interface OtherEvent extends BabyEvent {
  type: EventType.OTHER;
  eventType: OtherEventType;
  description: string;
}

// Union type for all events
export type AnyBabyEvent = FeedingEvent | DiaperEvent | SleepEvent | OtherEvent;

// API response type that includes Prisma relations
export interface BabyEventWithRelations extends BabyEvent {
  feedingEvent?: {
    id: string;
    eventId: string;
    feedingType: string;
    amount?: number;
    duration?: number;
    side?: string;
  };
  diaperEvent?: {
    id: string;
    eventId: string;
    wet: number;
    dirty: number;
    color?: string;
    texture?: string;
    consistency?: string;
  };
  sleepEvent?: {
    id: string;
    eventId: string;
    duration?: number;
    sleepType: string;
    startTime?: string;
    endTime?: string;
  };
  otherEvent?: {
    id: string;
    eventId: string;
    eventType: string;
    description: string;
  };
}

// Form data types (for creating new events)
export interface FeedingEventForm {
  date: string;
  time: string;
  feedingType: FeedingType;
  amount?: number;
  duration?: number;
  side?: 'left' | 'right' | 'both';
  notes?: string;
  images?: ImageData[];
}

export interface DiaperEventForm {
  date: string;
  time: string;
  wet: number;
  dirty: number;
  diaperDetails?: {
    color?: string;
    texture?: string;
    consistency?: string;
  };
  notes?: string;
  images?: ImageData[];
}

export interface SleepEventForm {
  date: string;
  time: string;
  duration?: number;
  sleepType: SleepType;
  startTime?: string;
  endTime?: string;
  notes?: string;
  images?: ImageData[];
}

export interface OtherEventForm {
  date: string;
  time: string;
  eventType: OtherEventType;
  description: string;
  notes?: string;
  images?: ImageData[];
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface EventsResponse {
  events: AnyBabyEvent[];
  totalCount: number;
  page: number;
  limit: number;
}

// Utility types for filtering and sorting
export interface EventFilters {
  type?: EventType;
  dateFrom?: string;
  dateTo?: string;
  feedingType?: FeedingType;
}

export interface EventSortOptions {
  field: 'date' | 'time' | 'createdAt';
  direction: 'asc' | 'desc';
}

// Statistics types for dashboard
export interface DailyStats {
  date: string;
  totalFeedings: number;
  totalAmount?: number; // ml
  totalDiapers: number;
  wetDiapers: number;
  dirtyDiapers: number;
  totalSleep?: number; // minutes
}

export interface WeeklyStats {
  week: string; // ISO week (YYYY-W##)
  dailyStats: DailyStats[];
  averages: {
    feedingsPerDay: number;
    amountPerDay?: number;
    diapersPerDay: number;
    sleepPerDay?: number;
  };
}