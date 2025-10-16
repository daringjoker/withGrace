import { useMemo, useLayoutEffect, useRef, useState } from "react";
import { parseISO, addMinutes, isSameDay } from "date-fns";
import { TIMELINE_CONFIG } from "./TimelineConstants";
import { 
  TimelineEvent, 
  normalizeTime, 
  getEventIcon, 
  getEventColor, 
  getEventTitle, 
  getEventDetails 
} from "./TimelineUtils";
import { TimelinePoint } from "./TimelinePath";
import { EventType } from "@/types";

export interface EventPoint {
  event: TimelineEvent;
  x: number;
  y: number;
  endY?: number; // For duration events
  title: string;
  details: string;
  isStart?: boolean; // For sleep events
  isEnd?: boolean; // For sleep events
}

interface EventPointsProps {
  events: TimelineEvent[];
  visibleDays: Date[];
  timelinePoints: TimelinePoint[];
  hoveredEvent: string | null;
  onEventHover: (eventId: string | null) => void;
  onEventClick: (event: TimelineEvent) => void;
  pathRef?: React.RefObject<SVGPathElement | null>;
}

/**
 * Optimized hook to get precise X coordinates from the actual SVG path
 */
function usePrecisePathCoordinates(
  pathElement: SVGPathElement | null,
  yCoordinates: number[]
): Map<number, number> {
  const [coordinateMap, setCoordinateMap] = useState<Map<number, number>>(new Map());
  const updateTimeoutRef = useRef<number | null>(null);
  const cacheRef = useRef<Map<string, Map<number, number>>>(new Map());

  useLayoutEffect(() => {
    if (!pathElement || yCoordinates.length === 0) {
      setCoordinateMap(new Map());
      return;
    }

    // Debounce for performance
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = window.setTimeout(() => {
      // Create cache key based on path and coordinates
      const pathLength = pathElement.getTotalLength();
      const cacheKey = `${pathLength}-${yCoordinates.length}`;
      
      // Check cache first
      if (cacheRef.current.has(cacheKey)) {
        setCoordinateMap(cacheRef.current.get(cacheKey)!);
        return;
      }

      requestAnimationFrame(() => {
        const newMap = new Map<number, number>();
        
        // Reduced sampling for better performance (every ~5 pixels)
        const sampleCount = Math.min(300, Math.max(50, pathLength / 5));
        
        for (let i = 0; i <= sampleCount; i++) {
          const distance = (i / sampleCount) * pathLength;
          const point = pathElement.getPointAtLength(distance);
          newMap.set(Math.round(point.y), point.x);
        }
        
        // Cache the result
        cacheRef.current.set(cacheKey, newMap);
        
        // Limit cache size
        if (cacheRef.current.size > 5) {
          const firstKey = cacheRef.current.keys().next().value;
          if (firstKey) {
            cacheRef.current.delete(firstKey);
          }
        }
        
        setCoordinateMap(newMap);
      });
    }, 50); // 50ms debounce
    
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [pathElement, yCoordinates]);

  return coordinateMap;
}

export function useEventPoints({
  events,
  visibleDays,
  timelinePoints
}: Pick<EventPointsProps, 'events' | 'visibleDays' | 'timelinePoints'>): EventPoint[] {
  return useMemo(() => {
    const points: EventPoint[] = [];
    
    if (visibleDays.length === 0 || timelinePoints.length === 0) {
      return points;
    }
    
    const DAY_HEIGHT = 24 * TIMELINE_CONFIG.HOUR_HEIGHT;
    const DAY_SEPARATOR_HEIGHT = TIMELINE_CONFIG.DAY_SEPARATOR_HEIGHT;
    
    // Process events for each visible day
    visibleDays.forEach((day, dayIndex) => {
      const dayEvents = events.filter(event => 
        isSameDay(parseISO(event.date), day)
      );
      
      const dayStartY = dayIndex * (DAY_HEIGHT + DAY_SEPARATOR_HEIGHT);

      dayEvents.forEach(event => {

        
        // Validate and parse event time
        if (!event.time || !event.date) {
          console.warn('Event missing time or date:', event);
          return;
        }
        
        const normalizedTime = normalizeTime(event.time);
        const eventTime = new Date(`2000-01-01T${normalizedTime}`);
        if (isNaN(eventTime.getTime())) {
          console.warn('Invalid event time after normalization:', normalizedTime);
          return;
        }
        
        const hour = eventTime.getHours();
        const minute = eventTime.getMinutes();
        
        // Find the timeline position for this time within this day
        const hourProgress = Math.max(0, Math.min(23.99, hour + minute / 60));
        const hourIndex = Math.floor(hourProgress);
        const nextHourIndex = Math.min(hourIndex + 1, 23);
        
        // Calculate indices for this specific day
        const dayHourIndex = dayIndex * 25 + hourIndex; // 25 hours per day (0-24)
        const dayNextHourIndex = dayIndex * 25 + nextHourIndex;
        
        const timelinePoint = timelinePoints[dayHourIndex];
        const nextTimelinePoint = timelinePoints[dayNextHourIndex];
        
        if (timelinePoint && nextTimelinePoint) {
          // Interpolate position based on minutes
          const minuteProgress = (minute / 60);
          let x = timelinePoint.x + (nextTimelinePoint.x - timelinePoint.x) * minuteProgress;
          let y = timelinePoint.y + (nextTimelinePoint.y - timelinePoint.y) * minuteProgress;

          const title = getEventTitle(event);
          const details = getEventDetails(event);

          // Check if event has duration (sleep or feeding events longer than 60 minutes)
          let hasDuration = false;
          let durationMinutes = 0;
          
          if (event.type === EventType.SLEEP) {
            // Handle both nested sleepEvent structure and flat structure
            const sleepData = event.sleepEvent || (event as any);
            
            if (sleepData?.duration) {
              // Use explicit duration if available
              durationMinutes = sleepData.duration;
            } else if (sleepData?.startTime && sleepData?.endTime) {
              // Calculate duration from start and end times
              const startTime = new Date(`2000-01-01T${normalizeTime(sleepData.startTime)}`);
              const endTime = new Date(`2000-01-01T${normalizeTime(sleepData.endTime)}`);
              
              // Handle case where end time is next day (e.g., sleep from 22:00 to 06:00)
              if (endTime < startTime) {
                endTime.setDate(endTime.getDate() + 1);
              }
              
              durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
            }
            hasDuration = durationMinutes > 60; // Show duration markers for events longer than 1 hour
          } else if (event.type === EventType.FEEDING) {
            // Handle both nested feedingEvent structure and flat structure
            const feedingData = event.feedingEvent || (event as any);
            
            if (feedingData?.duration) {
              // Use explicit duration if available
              durationMinutes = feedingData.duration;
            } else if (feedingData?.startTime && feedingData?.endTime) {
              // Calculate duration from start and end times
              const startTime = new Date(`2000-01-01T${feedingData.startTime}`);
              const endTime = new Date(`2000-01-01T${feedingData.endTime}`);
              
              // Handle case where end time is next day (unlikely for feeding but possible)
              if (endTime < startTime) {
                endTime.setDate(endTime.getDate() + 1);
              }
              
              durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
            }
            hasDuration = durationMinutes > 60; // Show duration markers for events longer than 1 hour
          }

          if (hasDuration) {
            // Create start and end points for duration events
            let endTime: Date;
            let actualStartTime = eventTime;
            
            // Use actual start/end times if available, otherwise calculate from duration
            if (event.type === EventType.SLEEP) {
              const sleepData = event.sleepEvent || (event as any);
              if (sleepData?.startTime && sleepData?.endTime) {
                // Use provided start and end times
                actualStartTime = new Date(`2000-01-01T${normalizeTime(sleepData.startTime)}`);
                endTime = new Date(`2000-01-01T${normalizeTime(sleepData.endTime)}`);
                
                // Handle overnight sleep (end time next day)
                if (endTime < actualStartTime) {
                  endTime.setDate(endTime.getDate() + 1);
                }
              } else {
                // Calculate end time from duration
                endTime = addMinutes(eventTime, durationMinutes);
              }
            } else if (event.type === EventType.FEEDING) {
              const feedingData = event.feedingEvent || (event as any);
              if (feedingData?.startTime && feedingData?.endTime) {
                // Use provided start and end times  
                actualStartTime = new Date(`2000-01-01T${normalizeTime(feedingData.startTime)}`);
                endTime = new Date(`2000-01-01T${normalizeTime(feedingData.endTime)}`);
                
                // Handle edge case where feeding crosses midnight
                if (endTime < actualStartTime) {
                  endTime.setDate(endTime.getDate() + 1);
                }
              } else {
                // Calculate end time from duration
                endTime = addMinutes(eventTime, durationMinutes);
              }
            } else {
              // Calculate end time from duration
              endTime = addMinutes(eventTime, durationMinutes);
            }
            
            // Recalculate start position if we have explicit start time
            if (actualStartTime !== eventTime) {
              const startHour = actualStartTime.getHours();
              const startMinute = actualStartTime.getMinutes();
              const startHourProgress = Math.max(0, Math.min(23.99, startHour + startMinute / 60));
              const startHourIndex = Math.floor(startHourProgress);
              const nextStartHourIndex = Math.min(startHourIndex + 1, 23);
              
              const dayStartHourIndex = dayIndex * 25 + startHourIndex;
              const dayNextStartHourIndex = dayIndex * 25 + nextStartHourIndex;
              
              const startTimelinePoint = timelinePoints[dayStartHourIndex];
              const nextStartTimelinePoint = timelinePoints[dayNextStartHourIndex];
              
              if (startTimelinePoint && nextStartTimelinePoint) {
                const startMinuteProgress = (startMinute / 60);
                x = startTimelinePoint.x + (nextStartTimelinePoint.x - startTimelinePoint.x) * startMinuteProgress;
                y = startTimelinePoint.y + (nextStartTimelinePoint.y - startTimelinePoint.y) * startMinuteProgress;
              }
            }
            
            const endHour = endTime.getHours();
            const endMinute = endTime.getMinutes();
            const endHourProgress = Math.max(0, Math.min(23.99, endHour + endMinute / 60));
            const endHourIndex = Math.floor(endHourProgress);
            const nextEndHourIndex = Math.min(endHourIndex + 1, 23);
            
            // Calculate indices for end time within this day
            const dayEndHourIndex = dayIndex * 25 + endHourIndex;
            const dayNextEndHourIndex = dayIndex * 25 + nextEndHourIndex;
            
            const endTimelinePoint = timelinePoints[dayEndHourIndex];
            const nextEndTimelinePoint = timelinePoints[dayNextEndHourIndex];
            
            if (endTimelinePoint && nextEndTimelinePoint) {
              const endMinuteProgress = (endMinute / 60);
              const endX = endTimelinePoint.x + (nextEndTimelinePoint.x - endTimelinePoint.x) * endMinuteProgress;
              const endY = endTimelinePoint.y + (nextEndTimelinePoint.y - endTimelinePoint.y) * endMinuteProgress;

              // Add start point with duration info
              const startTitle = (() => {
                switch (event.type) {
                  case EventType.SLEEP: return '😴 Sweet Dreams Started';
                  case EventType.FEEDING: return '🍼 Feeding Time Began';
                  case EventType.DIAPER: return '👶 Diaper Change Started';
                  case EventType.OTHER: return '💕 Activity Started';
                  default: return `${title} Started`;
                }
              })();
              
              const durationHours = Math.floor(durationMinutes / 60);
              const durationMins = durationMinutes % 60;
              const durationText = durationHours > 0 
                ? `${durationHours}h ${durationMins}m of precious time` 
                : `${durationMins} minutes of care`;
              
              points.push({
                event,
                x,
                y,
                endY,
                title: startTitle,
                details: `${details} • ${durationText}`,
                isStart: true
              });

              // Add end point
              const endTitle = (() => {
                switch (event.type) {
                  case EventType.SLEEP: return '🌅 All Rested & Refreshed';
                  case EventType.FEEDING: return '😊 Fed & Content';
                  case EventType.DIAPER: return '🧷 Fresh & Happy';
                  case EventType.OTHER: return '🎉 Activity Complete';
                  default: return `${title} Finished`;
                }
              })();
              
              points.push({
                event: { ...event, id: `${event.id}` },
                x: endX,
                y: endY,
                title: endTitle,
                details: `${details} • ${durationText}`,
                isEnd: true
              });
            }
          } else {
            // Regular event or short duration event
            points.push({
              event,
              x,
              y,
              title,
              details: durationMinutes > 0 ? `${details} • ${durationMinutes}min` : details
            });
          }
        }
      });
    });

    return points;
  }, [events, visibleDays, timelinePoints]);
}

export function EventPoints({
  events,
  visibleDays,
  timelinePoints,
  hoveredEvent,
  onEventHover,
  onEventClick,
  pathRef
}: EventPointsProps) {
  const eventPoints = useEventPoints({ events, visibleDays, timelinePoints });
  
  // Extract Y coordinates from event points for precise positioning
  const yCoordinates = useMemo(() => 
    eventPoints.map(point => point.y), 
    [eventPoints]
  );
  
  const preciseCoordinates = usePrecisePathCoordinates(pathRef?.current || null, yCoordinates);
  
  // Cache for duration paths to avoid recalculating on every render
  const durationPathCache = useMemo(() => new Map<string, string>(), [eventPoints, preciseCoordinates]);
  
  // Helper function to get precise X coordinate for Y position
  const getPreciseX = (y: number): number => {
    const roundedY = Math.round(y);
    
    // First try exact match
    if (preciseCoordinates.has(roundedY)) {
      return preciseCoordinates.get(roundedY)!;
    }
    
    // Find closest Y coordinates above and below
    const yValues = Array.from(preciseCoordinates.keys()).sort((a, b) => a - b);
    let lowerY = -1;
    let upperY = -1;
    
    for (const yVal of yValues) {
      if (yVal <= roundedY) {
        lowerY = yVal;
      }
      if (yVal >= roundedY && upperY === -1) {
        upperY = yVal;
        break;
      }
    }
    
    // Interpolate between closest points if we have both
    if (lowerY !== -1 && upperY !== -1 && lowerY !== upperY) {
      const lowerX = preciseCoordinates.get(lowerY)!;
      const upperX = preciseCoordinates.get(upperY)!;
      const t = (roundedY - lowerY) / (upperY - lowerY);
      return lowerX + (upperX - lowerX) * t;
    }
    
    // Fallback to closest point or original approximation
    if (lowerY !== -1) return preciseCoordinates.get(lowerY)!;
    if (upperY !== -1) return preciseCoordinates.get(upperY)!;
    
    // Ultimate fallback - use original approximation (should rarely happen)
    return eventPoints.find(p => Math.abs(p.y - y) < 1)?.x || y; 
  };



  return (
    <>
      {eventPoints.map((point, index) => {
        const IconComponent = getEventIcon(point.event.type);
        const color = getEventColor(point.event.type);
        const isHovered = hoveredEvent === point.event.id;

        // Use precise X coordinate if available, fallback to approximation
        const preciseX = preciseCoordinates.size > 0 ? getPreciseX(point.y) : point.x;
        const preciseEndX = point.endY && preciseCoordinates.size > 0 ? getPreciseX(point.endY) : point.x;

        // Get marker style and icons based on point type and event type
        const getMarkerStyle = () => {
          if (point.isStart) {
            let startIcon = '▶';
            if (point.event.type === EventType.SLEEP) startIcon = '😴';
            if (point.event.type === EventType.FEEDING) startIcon = '🍼';
            if (point.event.type === EventType.DIAPER) startIcon = '👶';
            if (point.event.type === EventType.OTHER) startIcon = '📝';
            
            return {
              fill: color,
              stroke: '#ffffff',
              strokeWidth: 3,
              r: TIMELINE_CONFIG.EVENT_RADIUS + 2,
              iconSymbol: startIcon,
              iconSize: 18,
              useEmoji: true
            };
          }
          if (point.isEnd) {
            let endIcon = '⏹';
            if (point.event.type === EventType.SLEEP) endIcon = '😊';
            if (point.event.type === EventType.FEEDING) endIcon = '✅';
            if (point.event.type === EventType.DIAPER) endIcon = '🧷';
            if (point.event.type === EventType.OTHER) endIcon = '🏁';
            
            return {
              fill: color,
              stroke: '#ffffff',
              strokeWidth: 2,
              r: TIMELINE_CONFIG.EVENT_RADIUS + 1,
              iconSymbol: endIcon,
              iconSize: 16,
              useEmoji: true
            };
          }
          return {
            fill: color,
            stroke: 'none',
            strokeWidth: 0,
            r: TIMELINE_CONFIG.EVENT_RADIUS,
            iconSymbol: null,
            iconSize: 30,
            useEmoji: false
          };
        };

        const markerStyle = getMarkerStyle();

        return (
          <g key={`${point.event.id}-${index}`}>
            {/* Duration path for duration events - follows timeline curve */}
            {point.endY && point.isStart && (() => {
              const endY = point.endY!; // Type assertion since we've already checked it exists
              
              // Generate curved path that follows the timeline between start and end points
              const generateDurationPath = () => {
                // Check cache first
                const cacheKey = `${point.event.id}-${point.y}-${endY}`;
                if (durationPathCache.has(cacheKey)) {
                  return durationPathCache.get(cacheKey)!;
                }
                
                if (preciseCoordinates.size === 0) {
                  // Fallback to straight line if no precise coordinates
                  const fallbackPath = `M ${preciseX} ${point.y} L ${preciseEndX} ${endY}`;
                  durationPathCache.set(cacheKey, fallbackPath);
                  return fallbackPath;
                }

                // Get Y coordinates between start and end with appropriate spacing
                const startY = Math.min(point.y, endY);
                const maxY = Math.max(point.y, endY);
                const yRange = maxY - startY;
                
                // Adaptive sampling based on distance - more points for longer durations
                const stepSize = Math.max(5, Math.min(20, yRange / 10));
                const pathPoints: Array<{x: number, y: number}> = [];
                
                // Always include start point
                pathPoints.push({x: preciseX, y: point.y});
                
                // Sample intermediate points
                for (let y = startY + stepSize; y < maxY; y += stepSize) {
                  const x = getPreciseX(y);
                  pathPoints.push({x, y});
                }
                
                // Always include end point
                if (pathPoints[pathPoints.length - 1].y !== endY) {
                  pathPoints.push({x: preciseEndX, y: endY});
                }
                
                // Generate smooth path using cubic bezier curves
                if (pathPoints.length < 2) {
                  const simplePath = `M ${preciseX} ${point.y} L ${preciseEndX} ${endY}`;
                  durationPathCache.set(cacheKey, simplePath);
                  return simplePath;
                }
                
                let pathData = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
                
                if (pathPoints.length === 2) {
                  // Just two points - use line
                  pathData += ` L ${pathPoints[1].x} ${pathPoints[1].y}`;
                } else {
                  // Multiple points - use smooth curves
                  for (let i = 1; i < pathPoints.length; i++) {
                    const current = pathPoints[i];
                    const prev = pathPoints[i - 1];
                    
                    // Simple quadratic curve for smoothness
                    const controlX = (prev.x + current.x) / 2;
                    const controlY = (prev.y + current.y) / 2;
                    
                    if (i === 1) {
                      pathData += ` Q ${controlX} ${controlY} ${current.x} ${current.y}`;
                    } else {
                      pathData += ` T ${current.x} ${current.y}`;
                    }
                  }
                }
                
                // Cache the result
                durationPathCache.set(cacheKey, pathData);
                return pathData;
              };

              return (
                <>
                  <defs>
                    <linearGradient id={`duration-gradient-${point.event.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={color} stopOpacity="0.8" />
                      <stop offset="50%" stopColor={color} stopOpacity="0.6" />
                      <stop offset="100%" stopColor={color} stopOpacity="0.4" />
                    </linearGradient>
                  </defs>
                  <path
                    d={generateDurationPath()}
                    stroke={`url(#duration-gradient-${point.event.id})`}
                    strokeWidth="6"
                    strokeDasharray="12,4"
                    strokeLinecap="round"
                    fill="none"
                    style={{ shapeRendering: 'geometricPrecision' }}
                  />
                </>
              );
            })()}

            {/* Event point circle with enhanced styling */}
            <circle
              cx={preciseX}
              cy={point.y}
              r={markerStyle.r + (isHovered ? 4 : 0)}
              fill={markerStyle.fill}
              stroke={markerStyle.stroke}
              strokeWidth={markerStyle.strokeWidth}
              className="cursor-pointer transition-all duration-300 ease-out"
              style={{ 
                filter: point.isStart || point.isEnd 
                  ? `drop-shadow(0 0 10px ${color}) drop-shadow(0 0 20px ${color}60)` 
                  : `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 16px ${color}40)`,
                shapeRendering: 'geometricPrecision'
              }}
              onMouseEnter={() => onEventHover(point.event.id)}
              onMouseLeave={() => onEventHover(null)}
              onClick={() => onEventClick(point.event)}
            />

            {/* Event icon or duration marker */}
            {markerStyle.iconSymbol ? (
              // Start/End marker with event-specific icons
              <text
                x={preciseX}
                y={point.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={markerStyle.iconSize}
                fill="white"
                className="pointer-events-none font-bold"
                style={{ 
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4)) drop-shadow(0 0 4px rgba(0,0,0,0.3))',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                }}
              >
                {markerStyle.iconSymbol}
              </text>
            ) : (
              // Regular event icon
              <foreignObject
                x={preciseX - 16}
                y={point.y - 16}
                width="32"
                height="32"
                className="pointer-events-none"
              >
                <IconComponent 
                  className="w-8 h-8 text-white" 
                  style={{ 
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))',
                    strokeWidth: '1.5px' 
                  }} 
                />
              </foreignObject>
            )}

            {/* Cute labels for all markers */}
            <text
              x={preciseX + (typeof window !== 'undefined' && window.innerWidth >= 768 ? 30 : 22)}
              y={point.y - (typeof window !== 'undefined' && window.innerWidth >= 768 ? 16 : 12)}
              fontSize={typeof window !== 'undefined' && window.innerWidth >= 768 ? "16" : "9"}
              fill={color}
              className="pointer-events-none font-semibold"
              style={{ 
                filter: 'drop-shadow(0 1px 1px rgba(255,255,255,0.9))',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}
            >
              {(() => {
                if (point.isStart) {
                  switch (point.event.type) {
                    case EventType.SLEEP: return '✨ Sleepy Time!';
                    case EventType.FEEDING: return '🍼 Feeding Time!';
                    case EventType.DIAPER: return '👶 Diaper Time!';
                    case EventType.OTHER: return '💕 Activity Time!';
                    default: return '✨ Start!';
                  }
                } else if (point.isEnd) {
                  switch (point.event.type) {
                    case EventType.SLEEP: return '🌅 All Rested!';
                    case EventType.FEEDING: return '😊 Fed & Happy!';
                    case EventType.DIAPER: return '🧷 Fresh & Clean!';
                    case EventType.OTHER: return '🎉 All Done!';
                    default: return '✅ Complete!';
                  }
                } else {
                  // Regular event labels
                  switch (point.event.type) {
                    case EventType.FEEDING: return '🍼 Yummy Time!';
                    case EventType.DIAPER: return '👶 Fresh Diaper!';
                    case EventType.SLEEP: return '😴 Sweet Dreams!';
                    case EventType.OTHER: return '💝 Special Moment!';
                    default: return '💕 Baby Care!';
                  }
                }
              })()}
            </text>
          </g>
        );
      })}
    </>
  );
}