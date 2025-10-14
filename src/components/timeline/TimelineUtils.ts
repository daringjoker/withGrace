import { format } from "date-fns";
import { Milk, Baby, Clock, Heart } from "lucide-react";
import { EventType } from "@/types";

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
}

/**
 * Normalize time format to HH:mm
 */
export const normalizeTime = (timeStr: string): string => {
  if (!timeStr) return '00:00';
  
  // Handle various time formats
  if (timeStr.match(/^\d{1,2}:\d{2}$/)) {
    return timeStr; // Already in HH:mm format
  }
  
  if (timeStr.match(/^\d{1,2}:\d{2}:\d{2}$/)) {
    return timeStr.substring(0, 5); // Remove seconds if present
  }
  
  // Try to parse and reformat
  try {
    const date = new Date(`2000-01-01T${timeStr}`);
    if (!isNaN(date.getTime())) {
      return format(date, 'HH:mm');
    }
  } catch {
    // Fallback to default
  }
  
  return '00:00';
};

/**
 * Get icon component for event type
 */
export const getEventIcon = (type: string) => {
  switch (type) {
    case EventType.FEEDING:
      return Milk;
    case EventType.DIAPER:
      return Baby;
    case EventType.SLEEP:
      return Clock;
    case EventType.OTHER:
      return Heart;
    default:
      return Heart;
  }
};

/**
 * Get color for event type
 */
export const getEventColor = (type: string): string => {
  switch (type) {
    case EventType.FEEDING:
      return '#3B82F6'; // Blue
    case EventType.DIAPER:
      return '#10B981'; // Green
    case EventType.SLEEP:
      return '#8B5CF6'; // Purple
    case EventType.OTHER:
      return '#F59E0B'; // Orange
    default:
      return '#6B7280'; // Gray
  }
};

/**
 * Get cute, mom-friendly display title for event
 */
export const getEventTitle = (event: TimelineEvent): string => {
  switch (event.type) {
    case EventType.FEEDING:
      return '🍼 Feeding Time';
    case EventType.DIAPER:
      return '👶 Diaper Care';
    case EventType.SLEEP:
      return '😴 Sleep Time';
    case EventType.OTHER:
      const otherType = event.otherEvent?.eventType?.replace('_', ' ') || 'Special Moment';
      return `💝 ${otherType}`;
    default:
      return `💕 ${event.type}`;
  }
};

/**
 * Get cute, detailed description for event
 */
export const getEventDetails = (event: TimelineEvent): string => {
  switch (event.type) {
    case EventType.FEEDING:
      const feeding = event.feedingEvent || (event as any);
      if (!feeding) return 'Nourishing baby with love 💕';
      
      const details = [];
      
      // Make feeding types more friendly
      if (feeding.feedingType) {
        const friendlyType = feeding.feedingType.replace('_', ' ').toLowerCase();
        const typeEmojis = {
          'breastfed': '🤱 Breastfeeding',
          'expressed breast milk': '🍼 Pumped milk',
          'formula': '🍼 Formula',
          'mixed': '🤱🍼 Mixed feeding'
        };
        details.push(typeEmojis[friendlyType as keyof typeof typeEmojis] || `🍼 ${friendlyType}`);
      }
      
      if (feeding.amount) details.push(`${feeding.amount}ml of goodness`);
      
      // Handle duration from explicit duration or calculated from start/end times
      if (feeding.duration) {
        const mins = feeding.duration;
        details.push(mins > 30 ? `${mins} mins of bonding` : `${mins} sweet minutes`);
      } else if (feeding.startTime && feeding.endTime) {
        const startTime = new Date(`2000-01-01T${feeding.startTime}`);
        const endTime = new Date(`2000-01-01T${feeding.endTime}`);
        
        // Handle case where end time is next day
        if (endTime < startTime) {
          endTime.setDate(endTime.getDate() + 1);
        }
        
        const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
        details.push(`${durationMinutes} mins of bonding`);
        details.push(`${feeding.startTime}-${feeding.endTime}`);
      }
      
      if (feeding.side) {
        const sideEmojis = {
          'left': '👈 Left side',
          'right': '👉 Right side',
          'both': '🤗 Both sides'
        };
        details.push(sideEmojis[feeding.side as keyof typeof sideEmojis] || `${feeding.side} side`);
      }
      
      return details.length > 0 ? details.join(' • ') : 'Feeding time with love 💕';
      
    case EventType.DIAPER:
      const diaper = event.diaperEvent || (event as any);
      if (!diaper) return 'Fresh and clean 🧷';
      
      const diaperDetails = [];
      
      // Make diaper types more friendly
      if (diaper.type) {
        const friendlyType = diaper.type.replace('_', ' ').toLowerCase();
        const typeEmojis = {
          'wet': '💧 Just wet',
          'dirty': '💩 Messy one',
          'both': '💧💩 Full diaper'
        };
        diaperDetails.push(typeEmojis[friendlyType as keyof typeof typeEmojis] || `🧷 ${friendlyType}`);
      }
      
      // Add cute wetness descriptions
      if (diaper.wetness) {
        const wetnessLevels = {
          'light': '💧 Light dampness',
          'medium': '💧💧 Pretty wet', 
          'heavy': '💧💧💧 Super soaked'
        };
        diaperDetails.push(wetnessLevels[diaper.wetness as keyof typeof wetnessLevels] || `💧 ${diaper.wetness} wet`);
      }
      
      // Add cute messiness descriptions
      if (diaper.messiness) {
        const messinessLevels = {
          'light': '💩 Little bit messy',
          'medium': '💩💩 Quite messy',
          'heavy': '💩💩💩 Big blowout!'
        };
        diaperDetails.push(messinessLevels[diaper.messiness as keyof typeof messinessLevels] || `💩 ${diaper.messiness} messy`);
      }
      
      return diaperDetails.length > 0 ? diaperDetails.join(' • ') : 'Fresh diaper change 🧷✨';
      
    case EventType.SLEEP:
      const sleep = event.sleepEvent || (event as any);
      if (!sleep) return 'Sweet dreams 😴✨';
      
      const sleepDetails = [];
      
      // Make sleep types more friendly
      if (sleep.sleepType) {
        const friendlyType = sleep.sleepType.replace('_', ' ').toLowerCase();
        const typeEmojis = {
          'nap': '😴 Quick nap',
          'night sleep': '🌙 Night sleep',
          'morning nap': '🌅 Morning nap',
          'afternoon nap': '☀️ Afternoon nap'
        };
        sleepDetails.push(typeEmojis[friendlyType as keyof typeof typeEmojis] || `😴 ${friendlyType}`);
      }
      
      // Add cute quality descriptions
      if (sleep.quality) {
        const qualityEmojis = {
          'peaceful': '😇 So peaceful',
          'restless': '😪 A bit restless',
          'good': '😊 Good sleep',
          'poor': '😔 Restless sleep'
        };
        sleepDetails.push(qualityEmojis[sleep.quality as keyof typeof qualityEmojis] || `😴 ${sleep.quality} quality`);
      }
      
      // Handle duration with cute descriptions
      if (sleep.duration) {
        const mins = sleep.duration;
        if (mins < 30) {
          sleepDetails.push(`${mins} mins of rest`);
        } else if (mins < 60) {
          sleepDetails.push(`${mins} mins of peaceful sleep`);
        } else {
          const hours = Math.floor(mins / 60);
          const remainingMins = mins % 60;
          if (remainingMins > 0) {
            sleepDetails.push(`${hours}h ${remainingMins}m of dreamland`);
          } else {
            sleepDetails.push(`${hours} hours in dreamland`);
          }
        }
      } else if (sleep.startTime && sleep.endTime) {
        const startTime = new Date(`2000-01-01T${sleep.startTime}`);
        const endTime = new Date(`2000-01-01T${sleep.endTime}`);
        
        // Handle case where end time is next day
        if (endTime < startTime) {
          endTime.setDate(endTime.getDate() + 1);
        }
        
        const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
        if (durationMinutes < 30) {
          sleepDetails.push(`${durationMinutes} mins of rest`);
        } else if (durationMinutes < 60) {
          sleepDetails.push(`${durationMinutes} mins of peaceful sleep`);
        } else {
          const hours = Math.floor(durationMinutes / 60);
          const remainingMins = durationMinutes % 60;
          if (remainingMins > 0) {
            sleepDetails.push(`${hours}h ${remainingMins}m of dreamland`);
          } else {
            sleepDetails.push(`${hours} hours in dreamland`);
          }
        }
        sleepDetails.push(`${sleep.startTime}-${sleep.endTime}`);
      }
      
      // Add cute location descriptions
      if (sleep.location) {
        const locationEmojis = {
          'crib': '🛏️ In the crib',
          'bassinet': '🛏️ In the bassinet', 
          'bed': '🛌 In bed',
          'stroller': '🚼 In the stroller',
          'car seat': '🚗 In car seat',
          'arms': '🤗 In mommy/daddy arms'
        };
        sleepDetails.push(locationEmojis[sleep.location.toLowerCase() as keyof typeof locationEmojis] || `📍 ${sleep.location}`);
      }
      
      return sleepDetails.length > 0 ? sleepDetails.join(' • ') : 'Peaceful sleep time 😴💤';
      
    case EventType.OTHER:
      const other = event.otherEvent || (event as any);
      if (!other) return 'Special moment 💝';
      
      const otherDetails = [];
      
      // Add cute event type
      if (other.eventType) {
        const friendlyType = other.eventType.replace('_', ' ').toLowerCase();
        const typeEmojis = {
          'bath time': '🛁 Bath time',
          'tummy time': '🤸 Tummy time',
          'play time': '🎈 Play time',
          'walk': '🚶‍♀️ Going for a walk',
          'doctor visit': '👩‍⚕️ Doctor visit',
          'milestone': '🎉 Big milestone!'
        };
        otherDetails.push(typeEmojis[friendlyType as keyof typeof typeEmojis] || `💝 ${friendlyType}`);
      }
      
      // Add description if available
      if (other.description) {
        otherDetails.push(`✨ ${other.description}`);
      }
      
      // Handle duration if available
      if (other.duration) {
        const mins = other.duration;
        if (mins < 30) {
          otherDetails.push(`${mins} sweet minutes`);
        } else {
          const hours = Math.floor(mins / 60);
          const remainingMins = mins % 60;
          if (hours > 0) {
            if (remainingMins > 0) {
              otherDetails.push(`${hours}h ${remainingMins}m of fun`);
            } else {
              otherDetails.push(`${hours} hours of joy`);
            }
          } else {
            otherDetails.push(`${mins} minutes of happiness`);
          }
        }
      } else if (other.startTime && other.endTime) {
        const startTime = new Date(`2000-01-01T${other.startTime}`);
        const endTime = new Date(`2000-01-01T${other.endTime}`);
        
        // Handle case where end time is next day
        if (endTime < startTime) {
          endTime.setDate(endTime.getDate() + 1);
        }
        
        const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
        if (durationMinutes < 30) {
          otherDetails.push(`${durationMinutes} sweet minutes`);
        } else {
          const hours = Math.floor(durationMinutes / 60);
          const remainingMins = durationMinutes % 60;
          if (hours > 0) {
            if (remainingMins > 0) {
              otherDetails.push(`${hours}h ${remainingMins}m of fun`);
            } else {
              otherDetails.push(`${hours} hours of joy`);
            }
          } else {
            otherDetails.push(`${durationMinutes} minutes of happiness`);
          }
        }
        otherDetails.push(`${other.startTime}-${other.endTime}`);
      }
      
      return otherDetails.length > 0 ? otherDetails.join(' • ') : 'Special moment with baby 💝✨';
      
    default:
      return 'Sweet baby moment 💕';
  }
};

/**
 * Format hour to 12-hour display format
 */
export const formatHour = (hour: number): string => {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
};

/**
 * Round coordinate to avoid floating point precision issues
 */
export const roundCoord = (num: number): number => {
  return Math.round(num * 100) / 100;
};