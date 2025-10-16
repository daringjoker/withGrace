import { useMemo, forwardRef } from "react";
import { TIMELINE_CONFIG } from "./TimelineConstants";
import { roundCoord } from "./TimelineUtils";

export interface TimelinePoint {
  x: number;
  y: number;
  hour: number;
  isNight: boolean;
}

interface TimelinePathProps {
  visibleDays: Date[];
  timelineWidth: number;
  timelineCenterX: number;
  timelineAmplitude: number;
}

export interface TimelinePathData {
  path: string;
  points: TimelinePoint[];
}

export function useTimelinePath({
  visibleDays,
  timelineWidth,
  timelineCenterX,
  timelineAmplitude
}: TimelinePathProps): TimelinePathData {
  return useMemo(() => {
    const points: TimelinePoint[] = [];
    
    if (visibleDays.length === 0) {
      return { path: '', points };
    }
    
    const DAY_HEIGHT = 24 * TIMELINE_CONFIG.HOUR_HEIGHT;
    const DAY_SEPARATOR_HEIGHT = TIMELINE_CONFIG.DAY_SEPARATOR_HEIGHT;
    
    // Minimal control points for different zero crossings
    const controlPointsConfig = {
      1: [ 
        { hour: 0, x: timelineCenterX + timelineAmplitude },
        { hour: 12, x: timelineCenterX - timelineAmplitude },
        { hour: 24, x: timelineCenterX + timelineAmplitude }
      ],
      2: [ 
        { hour: 0, x: timelineCenterX + timelineAmplitude },
        { hour: 6, x: timelineCenterX - timelineAmplitude },
        { hour: 12, x: timelineCenterX + timelineAmplitude },
        { hour: 18, x: timelineCenterX - timelineAmplitude },
        { hour: 24, x: timelineCenterX + timelineAmplitude }
      ],
      3: [ 
        { hour: 0, x: timelineCenterX },
        { hour: 4, x: timelineCenterX + timelineAmplitude },
        { hour: 8, x: timelineCenterX },
        { hour: 12, x: timelineCenterX - timelineAmplitude },
        { hour: 16, x: timelineCenterX },
        { hour: 20, x: timelineCenterX + timelineAmplitude },
        { hour: 24, x: timelineCenterX }
      ],
      4: [ 
        { hour: 0, x: timelineCenterX },
        { hour: 3, x: timelineCenterX + timelineAmplitude },
        { hour: 6, x: timelineCenterX },
        { hour: 9, x: timelineCenterX - timelineAmplitude },
        { hour: 12, x: timelineCenterX },
        { hour: 15, x: timelineCenterX + timelineAmplitude },
        { hour: 18, x: timelineCenterX },
        { hour: 21, x: timelineCenterX - timelineAmplitude },
        { hour: 24, x: timelineCenterX }
      ]
    };

    const selectedControlPoints = controlPointsConfig[TIMELINE_CONFIG.ZERO_CROSSINGS_PER_DAY as keyof typeof controlPointsConfig] || controlPointsConfig[2];
    
    // Generate points for each day
    visibleDays.forEach((day, dayIndex) => {
      const dayStartY = dayIndex * (DAY_HEIGHT + DAY_SEPARATOR_HEIGHT);
      
      // Generate hour points for this day (0-23, then add hour 0 of next day as transition point)
      for (let hour = 0; hour <= (dayIndex === visibleDays.length - 1 ? 23 : 24); hour++) {
        const actualHour = hour === 24 ? 0 : hour; // Hour 24 becomes hour 0 for smooth transition
        const y = dayStartY + (hour * TIMELINE_CONFIG.HOUR_HEIGHT);
        
        // Find surrounding control points and do simple linear interpolation
        let x = timelineCenterX;
        for (let i = 0; i < selectedControlPoints.length - 1; i++) {
          const cp1 = selectedControlPoints[i];
          const cp2 = selectedControlPoints[i + 1];
          
          if (actualHour >= cp1.hour && actualHour <= cp2.hour) {
            const t = (actualHour - cp1.hour) / (cp2.hour - cp1.hour);
            x = cp1.x + (cp2.x - cp1.x) * t;
            break;
          }
        }
        
        // Handle hour 24 (which is hour 0 of next day) - use same x as hour 0
        if (hour === 24) {
          x = selectedControlPoints[0].x; // Same position as hour 0
        }
        
        const isNight = actualHour < 6 || actualHour > 20;
        points.push({ 
          x, 
          y, 
          hour: actualHour, 
          isNight,
        });
      }
    });
    
    // Create ultra-smooth path using S commands for minimal path complexity across all days
    const pathCommands: string[] = [];
    
    // Generate continuous path across all days
    if (visibleDays.length > 0) {
      visibleDays.forEach((day, dayIndex) => {
        const dayStartY = dayIndex * (DAY_HEIGHT + DAY_SEPARATOR_HEIGHT);
        
        // Start path for this day
        const firstPoint = selectedControlPoints[0];
        const startX = roundCoord(firstPoint.x);
        const startY = roundCoord(dayStartY + firstPoint.hour * TIMELINE_CONFIG.HOUR_HEIGHT);
        
        if (dayIndex === 0) {
          pathCommands.push(`M ${startX} ${startY}`);
        }
        
        if (selectedControlPoints.length > 1) {
          // Generate curves for this day
          for (let i = 1; i < selectedControlPoints.length; i++) {
            const point = selectedControlPoints[i];
            const endX = roundCoord(point.x);
            const endY = roundCoord(dayStartY + point.hour * TIMELINE_CONFIG.HOUR_HEIGHT);
            
            if (dayIndex === 0 && i === 1) {
              // First curve needs a C command
              const deltaX = endX - startX;
              const deltaY = endY - startY;
              const cp1x = roundCoord(startX + deltaX * 0.3);
              const cp1y = roundCoord(startY + deltaY * 0.3);
              const cp2x = roundCoord(startX + deltaX * 0.7);
              const cp2y = roundCoord(startY + deltaY * 0.7);
              
              pathCommands.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`);
            } else {
              // Use S command for smooth continuation
              const prevPoint = selectedControlPoints[i - 1];
              const prevX = roundCoord(prevPoint.x);
              const prevY = roundCoord(dayStartY + prevPoint.hour * TIMELINE_CONFIG.HOUR_HEIGHT);
              
              const deltaX = endX - prevX;
              const deltaY = endY - prevY;
              const cp2x = roundCoord(prevX + deltaX * 0.7);
              const cp2y = roundCoord(prevY + deltaY * 0.7);
              
              pathCommands.push(`S ${cp2x} ${cp2y}, ${endX} ${endY}`);
            }
          }
          
          // The transition to next day is handled automatically since we add hour 24 (=hour 0) as the last point
        }
      });
    }

    return {
      path: pathCommands.join(' '),
      points
    };
  }, [visibleDays, timelineWidth, timelineCenterX, timelineAmplitude]);
}

interface TimelinePathComponentProps extends TimelinePathProps {
  className?: string;
}

export const TimelinePath = forwardRef<SVGPathElement, TimelinePathComponentProps>(
  ({ visibleDays, timelineWidth, timelineCenterX, timelineAmplitude, className = "" }, ref) => {
    const { path } = useTimelinePath({ 
      visibleDays, 
      timelineWidth, 
      timelineCenterX, 
      timelineAmplitude 
    });

    return (
      <path
        ref={ref}
        d={path}
        stroke="#d1d5db"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        shapeRendering="geometricPrecision"
        vectorEffect="non-scaling-stroke"
        className={className}
      />
    );
  }
);

TimelinePath.displayName = 'TimelinePath';