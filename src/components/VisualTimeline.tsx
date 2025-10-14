"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { isToday, addDays, subDays, startOfDay, format, parseISO } from "date-fns";
import Image from 'next/image';
import { Edit, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/Button";
import { 
  TIMELINE_CONFIG, 
  getTimelineWidth, 
  getTimelineCenterX, 
  getTimelineAmplitude,
  getTotalTimelineHeight,
  getDayHeight
} from "./timeline/TimelineConstants";
import { TimelineEvent, getEventTitle, getEventDetails } from "./timeline/TimelineUtils";
import { TimelinePath, useTimelinePath } from "./timeline/TimelinePath";
import { TimelineLabels } from "./timeline/TimelineLabels";
import { EventPoints } from "./timeline/EventPoints";
import { EventModal } from "./timeline/EventModal";



interface VisualTimelineProps {
  events: TimelineEvent[];
  onEdit: (eventId: string) => void;
  onDelete: (eventId: string, eventTitle: string) => void;
  isLoading?: boolean;
}



export function VisualTimeline({ events, onEdit, onDelete, isLoading = false }: VisualTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelinePathRef = useRef<SVGPathElement>(null);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);
  
  // Check if screen is small (mobile/tablet)
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  
  // Infinite scroll state
  const [visibleDays, setVisibleDays] = useState<Date[]>([]);
  const [centerDate, setCenterDate] = useState(new Date());
  const [isDaysLoading, setIsDaysLoading] = useState(false);
  const DAYS_BUFFER = 3; // Number of days to load before/after visible area
  
  useEffect(() => {
    const checkScreenSize = () => {
      if (typeof window !== 'undefined') {
        setIsSmallScreen(window.innerWidth < 768); // md breakpoint
      }
    };
    
    checkScreenSize();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkScreenSize);
      return () => window.removeEventListener('resize', checkScreenSize);
    }
  }, []);

  // Calculate timeline dimensions
  const TIMELINE_WIDTH = getTimelineWidth();
  const TIMELINE_CENTER_X = getTimelineCenterX(TIMELINE_WIDTH);
  const TIMELINE_AMPLITUDE = getTimelineAmplitude(TIMELINE_WIDTH, isSmallScreen);

  // Use timeline path hook
  const { points: timelinePoints } = useTimelinePath({
    visibleDays,
    timelineWidth: TIMELINE_WIDTH,
    timelineCenterX: TIMELINE_CENTER_X,
    timelineAmplitude: TIMELINE_AMPLITUDE
  });

  // Initialize visible days
  useEffect(() => {
    const initializeDays = () => {
      const today = startOfDay(new Date());
      const initialDays: Date[] = [];
      
      // Load 7 days initially (3 before today, today, 3 after)
      for (let i = -TIMELINE_CONFIG.DAYS_BUFFER; i <= TIMELINE_CONFIG.DAYS_BUFFER; i++) {
        initialDays.push(addDays(today, i));
      }
      
      setVisibleDays(initialDays);
      setCenterDate(today);
    };
    
    initializeDays();
  }, []);

  // Scroll to current time after visible days are loaded
  useEffect(() => {
    if (visibleDays.length > 0 && containerRef.current) {
      // Scroll to current time after a short delay to ensure DOM is ready
      setTimeout(() => {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        // Find today's index in visible days
        const todayIndex = visibleDays.findIndex(day => isToday(day));
        
        if (todayIndex >= 0 && containerRef.current) {
          // Calculate exact position including minutes
          const hourProgress = currentHour + (currentMinute / 60);
          const targetY = todayIndex * (getDayHeight() + TIMELINE_CONFIG.DAY_SEPARATOR_HEIGHT) + (hourProgress * TIMELINE_CONFIG.HOUR_HEIGHT);
          
          // Center the current time in the viewport
          const containerHeight = containerRef.current.clientHeight;
          const scrollTop = targetY - (containerHeight / 2);
          
          containerRef.current.scrollTo({
            top: Math.max(0, scrollTop),
            behavior: 'smooth'
          });
        }
      }, 300);
    }
  }, [visibleDays]);



  // Lazy loading function
  const loadMoreDays = useCallback((direction: 'up' | 'down') => {
    if (isDaysLoading) return;
    
    setIsDaysLoading(true);
    setVisibleDays(prev => {
      const newDays = [...prev];
      
      if (direction === 'up') {
        // Add days to the past (beginning of array)
        const firstDay = newDays[0];
        for (let i = 1; i <= TIMELINE_CONFIG.DAYS_BUFFER; i++) {
          newDays.unshift(subDays(firstDay, i));
        }
      } else {
        // Add days to the future (end of array)
        const lastDay = newDays[newDays.length - 1];
        for (let i = 1; i <= TIMELINE_CONFIG.DAYS_BUFFER; i++) {
          newDays.push(addDays(lastDay, i));
        }
      }
      
      // Keep only a reasonable number of days in memory
      if (newDays.length > TIMELINE_CONFIG.MAX_DAYS_IN_MEMORY) {
        if (direction === 'up') {
          return newDays.slice(0, TIMELINE_CONFIG.MAX_DAYS_IN_MEMORY);
        } else {
          return newDays.slice(-TIMELINE_CONFIG.MAX_DAYS_IN_MEMORY);
        }
      }
      
      return newDays;
    });
    
    // Simulate loading delay for smooth UX
    setTimeout(() => setIsDaysLoading(false), TIMELINE_CONFIG.LOADING_DELAY);
  }, [isDaysLoading]);

  const TIMELINE_HEIGHT = getTotalTimelineHeight(visibleDays.length);

  // Scroll to current time function
  const scrollToCurrentTime = useCallback(() => {
    if (containerRef.current && visibleDays.length > 0) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Find today's index in visible days
      const todayIndex = visibleDays.findIndex(day => isToday(day));
      
      if (todayIndex >= 0) {
        // Calculate exact position including minutes
        const hourProgress = currentHour + (currentMinute / 60);
        const DAY_HEIGHT = 24 * TIMELINE_CONFIG.HOUR_HEIGHT;
        const targetY = todayIndex * (DAY_HEIGHT + TIMELINE_CONFIG.DAY_SEPARATOR_HEIGHT) + (hourProgress * TIMELINE_CONFIG.HOUR_HEIGHT);
        
        // Center the current time in the viewport
        const containerHeight = containerRef.current.clientHeight;
        const scrollTop = targetY - (containerHeight / 2);
        
        containerRef.current.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: 'smooth'
        });
      }
    }
  }, [visibleDays]);





  // Handle scroll for infinite scrolling effect with lazy loading
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = container;
    
    if (scrollTop < TIMELINE_CONFIG.SCROLL_THRESHOLD) {
      // Near top - load previous days
      loadMoreDays('up');
    } else if (scrollHeight - scrollTop - clientHeight < TIMELINE_CONFIG.SCROLL_THRESHOLD) {
      // Near bottom - load future days
      loadMoreDays('down');
    }
  }, [loadMoreDays]);

  const scrollToTime = (hour: number, dayOffset: number = 0) => {
    if (containerRef.current && visibleDays.length > 0) {
      // Find the target day index (0 = today, -1 = yesterday, 1 = tomorrow)
      const todayIndex = visibleDays.findIndex(day => isToday(day));
      const targetDayIndex = todayIndex + dayOffset;
      
      if (targetDayIndex >= 0 && targetDayIndex < visibleDays.length) {
        const DAY_HEIGHT = 24 * TIMELINE_CONFIG.HOUR_HEIGHT;
        const targetY = targetDayIndex * (DAY_HEIGHT + TIMELINE_CONFIG.DAY_SEPARATOR_HEIGHT) + hour * TIMELINE_CONFIG.HOUR_HEIGHT;
        containerRef.current.scrollTo({
          top: targetY,
          behavior: 'smooth'
        });
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden w-full relative flex flex-col" style={{ height: '100%' }}>
      {/* Timeline Container */}
      <div 
        ref={containerRef}
        className="relative overflow-y-auto overflow-x-hidden flex-1 w-full"
        onScroll={handleScroll}
        style={{ 
          height: '100%',
          maxWidth: '100vw' // Prevent horizontal overflow
        }}
      >
        {isDaysLoading && (
          <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-sm z-${TIMELINE_CONFIG.Z_INDEX.LOADING_INDICATOR}`}>
            Loading...
          </div>
        )}
        
        {/* Main loading overlay */}
        {isLoading && events.length === 0 && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex flex-col items-center justify-center z-30">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-400 mb-4"></div>
            <p className="text-gray-600 text-lg">✨ Preparing your beautiful story...</p>
            <p className="text-gray-400 text-sm mt-2">💕 Gathering all your precious memories</p>
          </div>
        )}
        <div style={{ height: Math.max(TIMELINE_HEIGHT + 200, 1000) }} className="relative w-full">
          <svg
            width="100%"
            height={Math.max(TIMELINE_HEIGHT + 200, 1000)}
            viewBox={`0 0 ${TIMELINE_WIDTH} ${Math.max(TIMELINE_HEIGHT + 200, 1000)}`}
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="xMidYTop meet"
            style={{ maxWidth: '100%', overflow: 'visible' }}
          >
            {/* Timeline Labels (Day and Hour labels) */}
            <TimelineLabels 
              visibleDays={visibleDays}
              timelineWidth={TIMELINE_WIDTH}
              pathRef={timelinePathRef}
            />

            {/* Timeline Path */}
            <TimelinePath
              ref={timelinePathRef}
              visibleDays={visibleDays}
              timelineWidth={TIMELINE_WIDTH}
              timelineCenterX={TIMELINE_CENTER_X}
              timelineAmplitude={TIMELINE_AMPLITUDE}
            />

            {/* Event Points */}
            <EventPoints
              events={events}
              visibleDays={visibleDays}
              timelinePoints={timelinePoints}
              hoveredEvent={hoveredEvent}
              onEventHover={setHoveredEvent}
              onEventClick={setSelectedEvent}
              pathRef={timelinePathRef}
            />
          </svg>
        </div>
      </div>

      {/* Floating Now Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={scrollToCurrentTime}
        className="absolute bottom-4 right-4 z-20 bg-white shadow-lg hover:shadow-xl border-2"
      >
        Now
      </Button>

      {/* Event Details Modal */}
      <EventModal
        selectedEvent={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}