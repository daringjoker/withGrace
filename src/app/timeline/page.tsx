"use client";

import { useState, useEffect, useCallback, forwardRef, useMemo } from "react";
import { format, parseISO, subDays } from "date-fns";
import { Milk, Baby, Clock, Heart, Calendar, Filter, ChevronDown, Edit, Trash2, Grid3X3, Wifi, WifiOff, Clock as LoadingClock, AlertCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { RadioButtonGroup } from "@/components/ui/RadioButtonGroup";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { VisualTimeline } from "@/components/VisualTimeline";
import { EventType } from "@/types";
import { useEvents } from "@/hooks/useReduxEvents";
import { useIsHydrated } from "@/hooks/useIsHydrated";
import { useGroup } from "@/contexts/GroupContext";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { BabyEvent } from "@/types/baby-events";
import { TimelineEvent, convertToTimelineEvents } from "@/utils/eventConversion";

// Sample events for testing
const getSampleEvents = () => {
  const today = new Date().toISOString().split('T')[0];
  return [
    {
      id: 'sample-1',
      type: 'feeding',
      date: today,
      time: '07:30',
      feedingEvent: {
        feedingType: 'breastfed',
        duration: 25,
        side: 'left'
      }
    },
    {
      id: 'sample-2',
      type: 'diaper',
      date: today,
      time: '09:15',
      diaperEvent: {
        wet: 1,
        dirty: 0
      }
    },
    {
      id: 'sample-3',
      type: 'sleep',
      date: today,
      time: '13:00',
      sleepEvent: {
        sleepType: 'nap',
        duration: 90
      }
    },
    {
      id: 'sample-4',
      type: 'feeding',
      date: today,
      time: '16:45',
      feedingEvent: {
        feedingType: 'bottle_fed',
        amount: 120,
        duration: 15
      }
    },
    {
      id: 'sample-5',
      type: 'other',
      date: today,
      time: '11:30',
      otherEvent: {
        eventType: 'bath',
        description: 'Evening bath time'
      }
    }
  ];
};

export default function TimelinePage() {
  const router = useRouter();
  const isHydrated = useIsHydrated();
  const { activeGroup, isLoading: groupsLoading } = useGroup();
  const [filter, setFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'visual' | 'grid' | 'list'>('visual');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; eventId?: string; eventTitle?: string }>({
    isOpen: false
  });
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);

  // Memoize filters to prevent excessive API calls
  const memoizedFilters = useMemo(() => ({
    type: filter || undefined,
    dateFrom: dateFilter || format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    groupId: activeGroup?.id,
    limit: 100
  }), [filter, dateFilter, activeGroup?.id]);

  // Use Redux-based caching hooks for data management
  const {
    events: babyEvents,
    isLoading,
    isError,
    error,
    isStale,
    isSyncing,
    refetch,
    updateEvent: updateEventMutation,
    deleteEvent: deleteEventMutation,
    syncStatus
  } = useEvents({
    filters: memoizedFilters,
    // Remove aggressive auto-refresh - only fetch when needed
    refetchInterval: 0 // Disabled to prevent constant API calls
  });

  // Convert BabyEvents to TimelineEvents for compatibility - memoized to prevent re-renders
  const events = useMemo(() => {
    return convertToTimelineEvents(babyEvents || []);
  }, [babyEvents]);

  // Legacy states for infinite scrolling (can be removed later)
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Legacy fetch function - replaced by useEvents hook
  // const fetchEvents = useCallback(async (loadMore = false) => {
  //   // This is now handled by useEvents hook
  // }, []);

  const getEventIcon = (type: string) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case EventType.FEEDING:
        return <Milk className={`${iconClass} text-blue-600`} />;
      case EventType.DIAPER:
        return <Baby className={`${iconClass} text-green-600`} />;
      case EventType.SLEEP:
        return <Clock className={`${iconClass} text-purple-600`} />;
      case EventType.OTHER:
        return <Heart className={`${iconClass} text-orange-600`} />;
      default:
        return <div className={`${iconClass} rounded-full bg-gray-400`} />;
    }
  };

  const getEventTitle = (event: TimelineEvent) => {
    switch (event.type) {
      case EventType.FEEDING:
        return 'Feeding';
      case EventType.DIAPER:
        return 'Diaper Change';
      case EventType.SLEEP:
        return 'Sleep';
      case EventType.OTHER:
        return event.otherEvent?.eventType?.replace('_', ' ') || 'Other';
      default:
        return event.type;
    }
  };

  const getEventDetails = (event: TimelineEvent) => {
    switch (event.type) {
      case EventType.FEEDING:
        const feeding = event.feedingEvent;
        if (!feeding) return null;
        
        const details = [];
        details.push(feeding.feedingType.replace('_', ' '));
        if (feeding.amount) details.push(`${feeding.amount}ml`);
        if (feeding.duration) details.push(`${feeding.duration} min`);
        if (feeding.side) details.push(`${feeding.side} side`);
        return details.join(' • ');
        
      case EventType.DIAPER:
        const diaper = event.diaperEvent;
        if (!diaper) return null;
        
        const diaperDetails = [];
        if (diaper.wet > 0) diaperDetails.push(`${diaper.wet} wet`);
        if (diaper.dirty > 0) diaperDetails.push(`${diaper.dirty} dirty`);
        if (diaper.color || diaper.texture) {
          const desc = [diaper.color, diaper.texture].filter(Boolean).join(', ');
          diaperDetails.push(`(${desc})`);
        }
        return diaperDetails.join(' • ');
        
      case EventType.SLEEP:
        const sleep = event.sleepEvent;
        if (!sleep) return null;
        
        let sleepDetails = sleep.sleepType.replace('_', ' ');
        if (sleep.duration) sleepDetails += ` • ${sleep.duration} minutes`;
        return sleepDetails;
        
      case EventType.OTHER:
        return event.otherEvent?.description;
        
      default:
        return null;
    }
  };

  const formatEventTime = (date: string, time: string) => {
    const eventDate = new Date(date);
    const now = new Date();
    const isToday = format(eventDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
    
    if (isToday) {
      return `Today at ${format(new Date(`2000-01-01T${time}`), 'h:mm a')}`;
    } else {
      return `${format(eventDate, 'MMM d')} at ${format(new Date(`2000-01-01T${time}`), 'h:mm a')}`;
    }
  };

  const handleEdit = (eventId: string) => {
    router.push(`/edit/${eventId}`);
  };

  const handleDeleteClick = (eventId: string, eventTitle: string) => {
    setDeleteDialog({
      isOpen: true,
      eventId,
      eventTitle
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.eventId) return;

    const result = await deleteEventMutation(deleteDialog.eventId);
    
    if (result.success) {
      setDeleteDialog({ isOpen: false });
    } else {
      alert(`💔 We couldn't remove that sweet memory right now. ${result.error || 'Please try again!'} 💕`);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false });
  };

  // Grid timeline helper functions
  const getDaysToShow = () => {
    const endDate = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      days.push(subDays(endDate, i));
    }
    return days;
  };

  const getHoursArray = () => {
    const hours = [];
    for (let i = 0; i < 24; i++) {
      hours.push(i);
    }
    return hours;
  };

  const getEventsForDayAndHour = (day: Date, hour: number) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return events.filter(event => {
      if (format(parseISO(event.date), 'yyyy-MM-dd') !== dayStr) return false;
      
      const eventHour = parseInt(event.time.split(':')[0]);
      return eventHour === hour;
    });
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'feeding':
        return 'bg-blue-100 border-blue-300 text-blue-700';
      case 'diaper':
        return 'bg-green-100 border-green-300 text-green-700';
      case 'sleep':
        return 'bg-purple-100 border-purple-300 text-purple-700';
      case 'other':
        return 'bg-orange-100 border-orange-300 text-orange-700';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-700';
    }
  };

  const getEventDuration = (event: TimelineEvent) => {
    if (event.type === 'sleep' && event.sleepEvent?.duration) {
      return event.sleepEvent.duration;
    }
    if (event.type === 'feeding' && event.feedingEvent?.duration) {
      return event.feedingEvent.duration;
    }
    return 30; // Default 30 minutes
  };

  const formatEventForTooltip = (event: TimelineEvent) => {
    const time = format(new Date(`2000-01-01T${event.time}`), 'h:mm a');
    const title = getEventTitle(event);
    const details = getEventDetails(event);
    return `${title} at ${time}${details ? ` - ${details}` : ''}`;
  };

  // Event Item Component (for list view)
  const EventItem = forwardRef<HTMLDivElement, { index: number; style?: React.CSSProperties }>(
    ({ index, style }, ref) => {
      const event = events[index];
      
      if (!event) {
        return null;
      }

      return (
        <div ref={ref} style={style}>
          <div className="bg-white p-4 lg:p-6 rounded-lg border shadow-sm">
            <div className="flex space-x-4">
              {/* Icon */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  {getEventIcon(event.type)}
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {getEventTitle(event)}
                    </h3>
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(event.id)}
                        className="p-1.5 hover:bg-gray-100"
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(event.id, getEventTitle(event))}
                        className="p-1.5 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-600" />
                      </Button>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500 mt-1 lg:mt-0">
                    {formatEventTime(event.date, event.time)}
                  </span>
                </div>
                
                {getEventDetails(event) && (
                  <p className="text-gray-600 mb-2 text-sm lg:text-base">
                    {getEventDetails(event)}
                  </p>
                )}
                
                {event.notes && (
                  <p className="text-gray-500 text-sm mb-3 italic">
                    &ldquo;{event.notes}&rdquo;
                  </p>
                )}
                
                {/* Images */}
                {event.images && event.images.length > 0 && (
                  <div className="flex space-x-2 mt-3">
                    {event.images.slice(0, 3).map((image, idx) => (
                      <div key={idx} className="relative w-16 h-16 lg:w-20 lg:h-20 rounded-lg overflow-hidden">
                        <Image
                          src={image.url}
                          alt={image.filename || 'Event photo'}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 64px, 80px"
                          onError={(e) => {
                            console.error('Image failed to load:', image.url);
                          }}
                          unoptimized={image.url.includes('utfs.io')}
                        />
                      </div>
                    ))}
                    {event.images.length > 3 && (
                      <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 text-xs">
                        +{event.images.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
  );

  EventItem.displayName = 'EventItem';

  // Infinite scrolling helpers (legacy - now handled by useEvents)
  const loadMoreItems = useCallback(() => {
    // For now, just refetch - in future we can implement pagination
    if (!isLoading) {
      refetch();
    }
  }, [isLoading, refetch]);

  // Intersection observer for automatic loading
  const observerRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoadingMore || !hasNextPage) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreItems();
        }
      },
      { threshold: 0.1 }
    );
    
    if (node) observer.observe(node);
    return () => observer.disconnect();
  }, [isLoadingMore, hasNextPage, loadMoreItems]);

  // Show loading state while groups are loading
  if (groupsLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading your groups...</p>
      </div>
    );
  }

  // Show message if no active group
  if (!activeGroup) {
    return (
      <div className="text-center py-12 space-y-6">
        <div className="text-6xl">👶</div>
        <h1 className="text-2xl font-bold text-gray-900">
          No Active Group
        </h1>
        <p className="text-gray-600 max-w-md mx-auto">
          You need to select an active group to view your timeline. 
          Create or join a group first!
        </p>
        <Link href="/groups">
          <Button className="inline-flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Manage Groups
          </Button>
        </Link>
      </div>
    );
  }

  // Show message if no read permissions
  if (!activeGroup.permissions.canRead) {
    return (
      <div className="text-center py-12 space-y-6">
        <div className="text-6xl">🔒</div>
        <h1 className="text-2xl font-bold text-gray-900">
          No Read Permission
        </h1>
        <p className="text-gray-600 max-w-md mx-auto">
          You don&apos;t have permission to view events in &quot;{activeGroup.name}&quot;. 
          Contact the group admin to update your permissions.
        </p>
        <Link href="/groups">
          <Button className="inline-flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Switch Groups
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col overflow-hidden" 
      style={{ 
        height: 'calc(100vh - 6rem)', // Base height accounting for nav and padding
        maxHeight: 'calc(100vh - 6rem)'
      }}
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-4 lg:px-0 flex-shrink-0 py-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              📖 Your Baby&apos;s Story
            </h1>
            
            {/* Connection Status Indicator - Only show after hydration */}
            {isHydrated && (
              <div className="flex items-center gap-1">
                {!syncStatus.isOnline ? (
                  <div className="flex items-center gap-1 text-orange-600" title="Working offline - your memories are safe with us">
                    <WifiOff className="w-4 h-4" />
                    <span className="text-xs">📱 Offline Mode</span>
                  </div>
                ) : isSyncing || syncStatus.syncInProgress ? (
                  <div className="flex items-center gap-1 text-blue-600" title="Saving your precious moments safely">
                    <LoadingClock className="w-4 h-4 animate-spin" />
                    <span className="text-xs">✨ Syncing Love</span>
                  </div>
                ) : isStale ? (
                  <div className="flex items-center gap-1 text-yellow-600" title="Your memories are here, just refreshing">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs">🔄 Updating</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-green-600" title="All your memories are safe and current">
                    <Wifi className="w-4 h-4" />
                    <span className="text-xs">💚 All Set</span>
                  </div>
                )}
                
                {/* Pending changes indicator */}
                {syncStatus.pendingChanges > 0 && (
                  <div className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full" title={`${syncStatus.pendingChanges} precious moments waiting to be saved`}>
                    💕 {syncStatus.pendingChanges} saving
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <p className="text-gray-600 text-sm lg:text-base">
              Every precious moment captured with love 💕✨
            </p>
            
            {/* Error indicator */}
            {isError && error && (
              <div className="flex items-center gap-1 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>💔 Oops: {error}</span>
                <button 
                  onClick={() => refetch()} 
                  className="underline hover:no-underline ml-1"
                >
                  💕 Try Again
                </button>
              </div>
            )}
            
            {/* Last sync info - Only show after hydration */}
            {isHydrated && syncStatus.lastSync > 0 && (
              <p className="text-xs text-gray-500">
                ✨ Last saved: {format(new Date(syncStatus.lastSync), 'h:mm a')}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('visual')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'visual'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Visual
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Grid3X3 size={16} className="inline mr-1" />
              Grid
            </button>
          </div>
          
          {/* Filter Toggle Button */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={`${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : ''}`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className={`px-4 lg:px-0 flex-shrink-0 ${showFilters ? 'block' : 'hidden'}`}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-white p-4 rounded-lg border mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              💝 Show Me
            </label>
            <RadioButtonGroup
              name="eventTypeFilter"
              value={filter}
              onChange={setFilter}
              cols={2}
              options={[
                {
                  value: "",
                  label: "💕 All Moments",
                  description: "Every precious memory",
                  icon: <Heart className="w-4 h-4" />
                },
                {
                  value: EventType.FEEDING,
                  label: "🍼 Feeding Time",
                  description: "Nourishing moments",
                  icon: <Milk className="w-4 h-4" />
                },
                {
                  value: EventType.DIAPER,
                  label: "👶 Fresh & Clean",
                  description: "Diaper adventures", 
                  icon: <Baby className="w-4 h-4" />
                },
                {
                  value: EventType.SLEEP,
                  label: "😴 Sweet Dreams",
                  description: "Peaceful slumber",
                  icon: <Clock className="w-4 h-4" />
                },
                {
                  value: EventType.OTHER,
                  label: "✨ Special Moments",
                  description: "Magical memories",
                  icon: <Calendar className="w-4 h-4" />
                }
              ]}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              📅 Since When?
            </label>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setFilter('');
                setDateFilter('');
                setShowFilters(false);
              }}
              className="w-full lg:w-auto"
            >
              💫 Show All Memories
            </Button>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 min-h-0 overflow-hidden px-4 lg:px-0">
        {viewMode === 'visual' ? (
          <VisualTimeline
            events={events}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            isLoading={isLoading}
          />
        ) : isLoading && events.length === 0 ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white p-4 rounded-lg border animate-pulse">
                <div className="flex space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">Your story is waiting to begin! 🌟</p>
            <p className="text-sm text-gray-400">
              {filter || dateFilter ? 'Try adjusting your filters to see more precious moments 💕' : 'Ready to capture your first beautiful memory together? ✨'}
            </p>
            <button 
              onClick={() => refetch()} 
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              ✨ Refresh Memories
            </button>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-4 h-full overflow-y-auto">
            {events.map((event, index) => (
              <EventItem key={event.id} index={index} style={{}} />
            ))}
            
            {/* Loading indicator and auto-load trigger */}
            {hasNextPage && (
              <div ref={observerRef} className="text-center py-4">
                {isLoadingMore ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 bg-indigo-600 rounded-full animate-pulse"></div>
                    <span className="text-gray-600">✨ Finding more precious memories...</span>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={loadMoreItems}
                    className="w-full lg:w-auto"
                  >
                    💕 Show More Memories
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden h-full flex flex-col">
            {/* Grid Timeline Header */}
            <div className="overflow-x-auto flex-shrink-0">
              <div className="flex min-w-max">
                <div className="w-24 p-2 border-r bg-gray-50 font-medium text-sm text-gray-700 flex-shrink-0">
                  Date
                </div>
                {getHoursArray().map((hour) => (
                  <div
                    key={hour}
                    className="w-16 p-1 text-xs text-center border-r bg-gray-50 text-gray-600 flex-shrink-0"
                  >
                    {hour === 0 ? '12am' : hour <= 12 ? `${hour}${hour === 12 ? 'pm' : 'am'}` : `${hour - 12}pm`}
                  </div>
                ))}
              </div>
            </div>

            {/* Grid Timeline Body */}
            <div className="overflow-x-auto flex-1 overflow-y-auto">
              {getDaysToShow().map((day) => (
                <div key={day.toISOString()} className="flex min-w-max border-b last:border-b-0">
                  <div className="w-24 p-2 border-r bg-gray-50 font-medium text-sm text-gray-700 flex-shrink-0">
                    <div className="text-xs text-gray-500">
                      {format(day, 'EEE')}
                    </div>
                    <div>
                      {format(day, 'MMM d')}
                    </div>
                  </div>
                  {getHoursArray().map((hour) => {
                    const eventsInCell = getEventsForDayAndHour(day, hour);
                    return (
                      <div
                        key={hour}
                        className="w-16 min-h-[60px] border-r p-1 relative flex-shrink-0"
                      >
                        {eventsInCell.map((event, index) => {
                          const duration = getEventDuration(event);
                          const width = Math.min(duration / 60 * 100, 100); // Max 100% width
                          const colorClasses = getEventColor(event.type);
                          
                          return (
                            <div
                              key={event.id}
                              className={`absolute border rounded text-xs cursor-pointer hover:shadow-md transition-shadow ${colorClasses}`}
                              style={{
                                top: `${index * 18 + 2}px`,
                                left: '2px',
                                right: '2px',
                                height: '16px',
                                width: `${width}%`,
                                maxWidth: 'calc(100% - 4px)'
                              }}
                              title={formatEventForTooltip(event)}
                              onClick={() => setSelectedEvent(event)}
                            >
                              <div className="px-1 truncate">
                                {getEventTitle(event)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                {getEventTitle(selectedEvent)}
              </h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-600">
                <strong>Date:</strong> {formatEventTime(selectedEvent.date, selectedEvent.time)}
              </p>

              {getEventDetails(selectedEvent) && (
                <p className="text-gray-600">
                  <strong>Details:</strong> {getEventDetails(selectedEvent)}
                </p>
              )}

              {selectedEvent.notes && (
                <p className="text-gray-600">
                  <strong>Notes:</strong> {selectedEvent.notes}
                </p>
              )}

              {selectedEvent.images && selectedEvent.images.length > 0 && (
                <div>
                  <p className="text-gray-600 font-medium mb-2">Images:</p>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedEvent.images.map((image, index) => (
                      <Image
                        key={index}
                        src={image.url}
                        alt={image.filename || 'Event photo'}
                        width={200}
                        height={150}
                        className="w-full h-32 object-cover rounded-lg"
                        onError={(e) => {
                          console.error('Image failed to load:', image.url);
                        }}
                        unoptimized={image.url.includes('utfs.io')}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="💔 Remove this sweet memory?"
        message={`This ${deleteDialog.eventTitle?.toLowerCase()} moment will be removed from your baby's timeline. We know every moment is precious - are you sure? 💕`}
        confirmText="Yes, remove it"
        cancelText="Keep this memory"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}