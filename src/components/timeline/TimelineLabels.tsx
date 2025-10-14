import { format, isToday } from "date-fns";
import { useState, useMemo, useLayoutEffect, useCallback, useRef } from "react";
import { TIMELINE_CONFIG } from "./TimelineConstants";
import { formatHour } from "./TimelineUtils";

interface HourMarker {
  hour: number;
  x: number;
  y: number;
  dayIndex: number;
}

interface TimelineLabelsProps {
  visibleDays: Date[];
  timelineWidth: number;
  pathRef?: React.RefObject<SVGPathElement | null>;
}

export function TimelineLabels({ visibleDays, timelineWidth, pathRef }: TimelineLabelsProps) {
  const [hoveredHour, setHoveredHour] = useState<string | null>(null);
  const [hourMarkers, setHourMarkers] = useState<HourMarker[]>([]);
  
  const DAY_HEIGHT = 24 * TIMELINE_CONFIG.HOUR_HEIGHT;
  const DAY_SEPARATOR_HEIGHT = TIMELINE_CONFIG.DAY_SEPARATOR_HEIGHT;

  const coordinateMapRef = useRef<Map<number, number>>(new Map());
  const updateTimeoutRef = useRef<number | null>(null);

  // Memoized coordinate calculation with debouncing
  const calculateHourMarkers = useCallback(() => {
    if (!pathRef?.current || visibleDays.length === 0) {
      setHourMarkers([]);
      return;
    }

    // Debounce updates for performance
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = window.setTimeout(() => {
      const pathElement = pathRef.current;
      if (!pathElement) return;

      // Use requestAnimationFrame for heavy calculations
      requestAnimationFrame(() => {
        const pathLength = pathElement.getTotalLength();
        const markers: HourMarker[] = [];

        // Reduced sampling for better performance (sample every ~5 pixels)
        const sampleCount = Math.min(500, Math.max(100, pathLength / 5));
        const coordinateMap = new Map<number, number>();
        
        // Batch DOM operations
        for (let i = 0; i <= sampleCount; i++) {
          const distance = (i / sampleCount) * pathLength;
          const point = pathElement.getPointAtLength(distance);
          coordinateMap.set(Math.round(point.y), point.x);
        }

        coordinateMapRef.current = coordinateMap;

        // Optimized coordinate lookup
        const getPreciseX = (y: number): number => {
          const roundedY = Math.round(y);
          
          if (coordinateMap.has(roundedY)) {
            return coordinateMap.get(roundedY)!;
          }
          
          // Simplified interpolation - use binary search for better performance
          const yKeys = Array.from(coordinateMap.keys());
          let left = 0;
          let right = yKeys.length - 1;
          
          while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const midY = yKeys[mid];
            
            if (midY === roundedY) {
              return coordinateMap.get(midY)!;
            } else if (midY < roundedY) {
              left = mid + 1;
            } else {
              right = mid - 1;
            }
          }
          
          // Linear interpolation between closest points
          if (right >= 0 && left < yKeys.length) {
            const lowerY = yKeys[right];
            const upperY = yKeys[left];
            const lowerX = coordinateMap.get(lowerY)!;
            const upperX = coordinateMap.get(upperY)!;
            const t = (roundedY - lowerY) / (upperY - lowerY);
            return lowerX + (upperX - lowerX) * t;
          }
          
          return timelineWidth / 2; // fallback
        };

        // Generate markers in batches to avoid blocking
        const batchSize = 50;
        let currentIndex = 0;
        const totalMarkers = visibleDays.length * 24;

        const processBatch = () => {
          const endIndex = Math.min(currentIndex + batchSize, totalMarkers);
          
          for (let i = currentIndex; i < endIndex; i++) {
            const dayIndex = Math.floor(i / 24);
            const hour = i % 24;
            const dayStartY = dayIndex * (DAY_HEIGHT + DAY_SEPARATOR_HEIGHT);
            const y = dayStartY + (hour * TIMELINE_CONFIG.HOUR_HEIGHT);
            const x = getPreciseX(y);
            
            markers.push({
              hour,
              x,
              y,
              dayIndex
            });
          }

          currentIndex = endIndex;

          if (currentIndex < totalMarkers) {
            // Process next batch in next frame
            requestAnimationFrame(processBatch);
          } else {
            // All done, update state
            setHourMarkers(markers);
          }
        };

        processBatch();
      });
    }, 100); // 100ms debounce
  }, [visibleDays, timelineWidth, pathRef, DAY_HEIGHT, DAY_SEPARATOR_HEIGHT]);

  // Calculate precise hour marker positions on the curve
  useLayoutEffect(() => {
    calculateHourMarkers();
    
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [calculateHourMarkers]);

  // Memoized helper function to determine label position
  const getLabelPosition = useMemo(() => {
    const cache = new Map<string, { x: number; anchor: 'start' | 'end' }>();
    
    return (marker: HourMarker) => {
      const key = `${marker.x}-${timelineWidth}`;
      
      if (cache.has(key)) {
        return cache.get(key)!;
      }
      
      const leftSpace = marker.x;
      const rightSpace = timelineWidth - marker.x;
      
      const result = leftSpace > rightSpace 
        ? { x: marker.x - 8, anchor: 'end' as const }
        : { x: marker.x + 8, anchor: 'start' as const };
      
      cache.set(key, result);
      return result;
    };
  }, [timelineWidth]);

  // Memoized day labels to avoid recalculation
  const dayLabels = useMemo(() => {
    return visibleDays.map((day, dayIndex) => {
      const dayStartY = dayIndex * (DAY_HEIGHT + DAY_SEPARATOR_HEIGHT);
      
      return {
        day,
        dayIndex,
        dayStartY,
        isToday: isToday(day),
        formatted: format(day, 'MMM d')
      };
    });
  }, [visibleDays, DAY_HEIGHT, DAY_SEPARATOR_HEIGHT]);

  // Memoized hour markers rendering with reduced re-renders
  const renderedHourMarkers = useMemo(() => {
    return hourMarkers.map((marker, index) => {
      const markerId = `${marker.dayIndex}-${marker.hour}`;
      const isMajorHour = marker.hour === 0 || marker.hour === 6 || marker.hour === 12 || marker.hour === 18;
      const lineLength = isMajorHour ? 6 : 4;
      
      return (
        <g key={markerId}>
          {/* Hour marker line */}
          <line
            x1={marker.x - lineLength}
            y1={marker.y}
            x2={marker.x + lineLength}
            y2={marker.y}
            stroke={isMajorHour ? "#444" : "#666"}
            strokeWidth={isMajorHour ? 2 : 1.5}
            style={{ 
              opacity: isMajorHour ? 0.8 : 0.6,
              cursor: 'pointer',
              transition: 'opacity 0.2s ease'
            }}
            onMouseEnter={() => setHoveredHour(markerId)}
            onMouseLeave={() => setHoveredHour(null)}
          />
          
          {/* Hour marker dot */}
          <circle
            cx={marker.x}
            cy={marker.y}
            r={isMajorHour ? 2.5 : 2}
            fill={isMajorHour ? "#444" : "#666"}
            style={{ 
              opacity: isMajorHour ? 0.9 : 0.7,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={() => setHoveredHour(markerId)}
            onMouseLeave={() => setHoveredHour(null)}
          />
        </g>
      );
    });
  }, [hourMarkers]);

  return (
    <>
      {dayLabels.map((dayData) => (
        <g key={`day-${dayData.dayIndex}`}>
          {/* Day label with background for better visibility */}
          <g>
            {/* Label background */}
            <rect
              x={TIMELINE_CONFIG.LABEL_X_POSITION - 4}
              y={dayData.dayStartY - 30}
              width={dayData.isToday ? 120 : 80}
              height="20"
              rx="6"
              fill={dayData.isToday ? "#3B82F6" : "#1F2937"}
              fillOpacity="0.9"
              stroke={dayData.isToday ? "#2563EB" : "#374151"}
              strokeWidth="1"
            />
            
            {/* Day label text */}
            <text
              x={TIMELINE_CONFIG.LABEL_X_POSITION}
              y={dayData.dayStartY - 17}
              textAnchor="start"
              className="text-sm font-bold fill-white"
              style={{ 
                fontSize: '14px',
                fontWeight: '600',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}
            >
              {dayData.formatted} {dayData.isToday ? '(Today)' : ''}
            </text>
          </g>
          
          {/* Day separator line - aligned with 12 AM marker */}
          {dayData.dayIndex > 0 && (
            <line
              x1={TIMELINE_CONFIG.LABEL_X_POSITION}
              y1={dayData.dayStartY}
              x2={timelineWidth}
              y2={dayData.dayStartY}
              stroke="#E5E7EB"
              strokeWidth="1"
              strokeDasharray="5,5"
            />
          )}
        </g>
      ))}

      {/* Hour markers on the timeline curve */}
      {renderedHourMarkers}
      
      {/* Hover label - rendered separately for better performance */}
      {hoveredHour && (() => {
        const marker = hourMarkers.find(m => `${m.dayIndex}-${m.hour}` === hoveredHour);
        if (!marker) return null;
        
        const labelPos = getLabelPosition(marker);
        const isMajorHour = marker.hour === 0 || marker.hour === 6 || marker.hour === 12 || marker.hour === 18;
        
        return (
          <g key={`hover-${hoveredHour}`}>
            {/* Label background with enhanced styling */}
            <rect
              x={labelPos.x + (labelPos.anchor === 'end' ? -42 : 0)}
              y={marker.y - 15}
              width="42"
              height="24"
              rx="6"
              fill={isMajorHour ? "#1E40AF" : "#1F2937"}
              fillOpacity="0.95"
              stroke={isMajorHour ? "#3B82F6" : "#374151"}
              strokeWidth="1.5"
              style={{
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
              }}
            />
            
            {/* Label text */}
            <text
              x={labelPos.x + (labelPos.anchor === 'end' ? -21 : 21)}
              y={marker.y - 2}
              textAnchor="middle"
              className="fill-white pointer-events-none"
              style={{ 
                userSelect: 'none',
                fontSize: '12px',
                fontWeight: isMajorHour ? '600' : '500',
                textShadow: '0 1px 2px rgba(0,0,0,0.4)'
              }}
            >
              {formatHour(marker.hour)}
            </text>

            {/* Indicator triangle */}
            <polygon
              points={labelPos.anchor === 'end' 
                ? `${labelPos.x - 42},${marker.y - 3} ${labelPos.x - 36},${marker.y} ${labelPos.x - 42},${marker.y + 3}`
                : `${labelPos.x + 42},${marker.y - 3} ${labelPos.x + 36},${marker.y} ${labelPos.x + 42},${marker.y + 3}`
              }
              fill={isMajorHour ? "#1E40AF" : "#1F2937"}
              fillOpacity="0.95"
            />
          </g>
        );
      })()}
    </>
  );
}