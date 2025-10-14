import { useMemo } from 'react';
import { format, subDays } from 'date-fns';
import {
  useGetEventsQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  EventFilters,
  CreateEventData,
} from '@/store/eventsApi';
import { BabyEventWithRelations } from '@/types/baby-events';
import { useAppSelector } from '@/store/hooks';

interface UseEventsOptions {
  filters?: EventFilters;
  enabled?: boolean;
  refetchInterval?: number;
}

export function useEvents(options: UseEventsOptions = {}) {
  const { filters = {}, enabled = true, refetchInterval = 0 } = options; // Default to 0 to prevent polling

  // Get sync status from Redux store
  const syncStatus = useAppSelector((state) => (state as any).cache.syncStatus);
  const offlineActions = useAppSelector((state) => (state as any).cache.offlineActions);

  // Prepare filters with defaults - memoize properly to prevent excessive calls
  const queryFilters = useMemo(() => {
    const defaultDateFrom = format(subDays(new Date(), 30), 'yyyy-MM-dd');
    return {
      type: filters.type,
      dateFrom: filters.dateFrom || defaultDateFrom,
      dateTo: filters.dateTo,
      limit: filters.limit || 100,
      offset: filters.offset || 0,
    };
  }, [
    filters.type,
    filters.dateFrom, 
    filters.dateTo,
    filters.limit,
    filters.offset
  ]);

  // Use RTK Query for data fetching with caching
  const {
    data,
    error,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useGetEventsQuery(queryFilters, {
    skip: !enabled,
    // Remove aggressive polling - only poll when specified and online
    pollingInterval: refetchInterval && syncStatus.isOnline ? refetchInterval : 0,
    // Reduce automatic refetching to prevent excessive API calls
    refetchOnMountOrArgChange: 30, // Only refetch if cache is older than 30 seconds
    refetchOnFocus: false, // Disable refetch on focus to reduce API calls
    refetchOnReconnect: true, // Keep this for offline scenarios
  });

  // Mutation hooks for CRUD operations
  const [createEvent, createMutationResult] = useCreateEventMutation();
  const [updateEvent, updateMutationResult] = useUpdateEventMutation();
  const [deleteEvent, deleteMutationResult] = useDeleteEventMutation();

  // Wrapper functions for mutations with error handling
  const handleCreateEvent = async (eventData: CreateEventData) => {
    try {
      const result = await createEvent(eventData).unwrap();
      return { success: true, data: result };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create event' 
      };
    }
  };

  const handleUpdateEvent = async (id: string, eventData: Partial<CreateEventData>) => {
    try {
      const result = await updateEvent({ id, data: eventData }).unwrap();
      return { success: true, data: result };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update event' 
      };
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteEvent(id).unwrap();
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete event' 
      };
    }
  };

  // Determine if data is stale based on cache timestamp
  const isStale = useMemo(() => {
    if (!data || !syncStatus.lastSync) return false;
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    return syncStatus.lastSync < fiveMinutesAgo;
  }, [data, syncStatus.lastSync]);

  // Check if any mutations are in progress
  const isSyncing = createMutationResult.isLoading || 
                    updateMutationResult.isLoading || 
                    deleteMutationResult.isLoading || 
                    isFetching ||
                    syncStatus.syncInProgress;

  return {
    // Data
    events: data?.events || [],
    totalCount: data?.totalCount || 0,
    hasMore: data?.hasMore || false,
    
    // Loading states
    isLoading: isLoading && !data, // Only show loading if no cached data
    isError,
    error: error ? 'message' in error ? error.message : 'Network error' : null,
    isStale,
    isSyncing,
    
    // Actions
    refetch,
    createEvent: handleCreateEvent,
    updateEvent: handleUpdateEvent,
    deleteEvent: handleDeleteEvent,
    
    // Sync status
    syncStatus: {
      ...syncStatus,
      pendingChanges: offlineActions.length,
    },
  };
}

// Hook for individual events - disabled to prevent additional API calls
export function useEvent(id: string, enabled: boolean = true) {
  // For now, return null to prevent additional API calls
  // Individual events should be accessed from the main events array
  return {
    event: null,
    isLoading: false,
    isError: false,
    error: null,
    refetch: () => {},
  };
}